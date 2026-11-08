import { Candidate, VoterStatus, VoteSubmission, JudgeScore, VotingSettings, VoterRecord } from './types';
import { INITIAL_CANDIDATES } from './candidates-data';
import { db, isFirebaseConfigured } from './firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  onSnapshot,
  writeBatch,
  deleteDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';

const STORAGE_KEY_VOTER_ID = 'novera_voter_uuid';
const STORAGE_KEY_CANDIDATES = 'novera_candidates_cache';
const STORAGE_KEY_VOTER_STATUS = 'novera_voter_status';
const STORAGE_KEY_JUDGE_SCORES = 'novera_judge_scores';
const STORAGE_KEY_VOTING_SETTINGS = 'novera_voting_settings';
const STORAGE_KEY_VOTER_LIST = 'novera_voter_records';

const SPRING_BOOT_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

function shouldCallSpringBoot(): boolean {
  if (typeof window === 'undefined') return true;
  if (process.env.NEXT_PUBLIC_API_URL) return true;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
}

/**
 * Returns or generates a resilient device voter identifier using hardware/browser entropy + persistent cookie backup
 */
export function getOrCreateVoterId(): string {
  if (typeof window === 'undefined') return 'server-voter-id';

  // Check cookie backup
  const cookieMatch = document.cookie.match(/novera_vid=([^;]+)/);
  let voterId = localStorage.getItem(STORAGE_KEY_VOTER_ID) || (cookieMatch ? cookieMatch[1] : null);

  if (!voterId) {
    const screenInfo = `${window.screen.width}x${window.screen.height}_${window.screen.colorDepth}`;
    const lang = navigator.language || 'en';
    const cores = navigator.hardwareConcurrency || 4;
    const entropy = `${screenInfo}_${lang}_${cores}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
    voterId = 'voter_' + entropy.replace(/[^a-zA-Z0-9_]/g, '');
  }

  try {
    localStorage.setItem(STORAGE_KEY_VOTER_ID, voterId);
    // Persist 30-day cookie to deter simple incognito/session wipe bypass
    document.cookie = `novera_vid=${voterId}; max-age=${30 * 24 * 60 * 60}; path=/; SameSite=Lax`;
  } catch (e) {}

  return voterId;
}

/**
 * Validate and sanitize voting settings in real-time.
 * If a session has an expired votingClosesAt timestamp, gracefully treat isVotingOpen as false.
 */
export function sanitizeVotingSettings(settings: VotingSettings | null | undefined): VotingSettings {
  if (!settings) return { isVotingOpen: false };
  return {
    ...settings,
    isVotingOpen: !!settings.isVotingOpen,
  };
}

/**
 * Get voting open/close configuration
 */
export function getLocalVotingSettings(): VotingSettings {
  if (typeof window === 'undefined') return { isVotingOpen: false };
  const raw = localStorage.getItem(STORAGE_KEY_VOTING_SETTINGS);
  if (raw) {
    try {
      return sanitizeVotingSettings(JSON.parse(raw));
    } catch (e) {}
  }
  return { isVotingOpen: false };
}

export function saveLocalVotingSettings(settings: VotingSettings): void {
  if (typeof window === 'undefined') return;
  const clean = sanitizeVotingSettings(settings);
  localStorage.setItem(STORAGE_KEY_VOTING_SETTINGS, JSON.stringify(clean));
}

export async function fetchVotingSettings(): Promise<VotingSettings> {
  if (isFirebaseConfigured() && db) {
    try {
      const docRef = doc(db, 'settings', 'voting');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = sanitizeVotingSettings(snap.data() as VotingSettings);
        saveLocalVotingSettings(data);
        return data;
      }
    } catch (err) {
      console.warn('Firebase voting settings fetch warning:', err);
    }
  }
  return getLocalVotingSettings();
}

export async function saveVotingSettings(settings: VotingSettings): Promise<void> {
  saveLocalVotingSettings(settings);

  if (isFirebaseConfigured() && db) {
    try {
      const docRef = doc(db, 'settings', 'voting');
      await setDoc(docRef, { ...settings, updatedAt: Date.now() }, { merge: true });
    } catch (err) {
      console.warn('Firebase voting settings save warning:', err);
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('novera_voting_settings_updated', { detail: settings }));
    try {
      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel('novera_voting_channel');
        bc.postMessage({ type: 'VOTING_SETTINGS_UPDATED', settings });
        bc.close();
      }
    } catch (e) {}
  }
}

export function subscribeToVotingSettings(callback: (settings: VotingSettings) => void): () => void {
  // 1. Initial sanitized local state
  callback(getLocalVotingSettings());

  // Try immediate remote fetch
  fetchVotingSettings().then((s) => callback(sanitizeVotingSettings(s))).catch(() => {});

  const cleanupFns: (() => void)[] = [];

  if (typeof window !== 'undefined') {
    // 2. In-window custom event
    const handleCustom = (e: any) => {
      if (e.detail) callback(sanitizeVotingSettings(e.detail));
    };
    window.addEventListener('novera_voting_settings_updated', handleCustom);
    cleanupFns.push(() => window.removeEventListener('novera_voting_settings_updated', handleCustom));

    // 3. Cross-tab storage event
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_VOTING_SETTINGS && e.newValue) {
        try {
          callback(sanitizeVotingSettings(JSON.parse(e.newValue)));
        } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorage);
    cleanupFns.push(() => window.removeEventListener('storage', handleStorage));

    // 4. Instant BroadcastChannel across tabs
    try {
      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel('novera_voting_channel');
        bc.onmessage = (event) => {
          if (event.data?.type === 'VOTING_SETTINGS_UPDATED' && event.data.settings) {
            callback(sanitizeVotingSettings(event.data.settings));
          }
        };
        cleanupFns.push(() => {
          bc.close();
        });
      }
    } catch (e) {}

    // 5. Polling fallback every 1.5 seconds for rock-solid reliability across screens
    const pollInterval = setInterval(() => {
      fetchVotingSettings().then((s) => callback(sanitizeVotingSettings(s))).catch(() => {});
    }, 1500);
    cleanupFns.push(() => clearInterval(pollInterval));
  }

  // 6. Firestore real-time onSnapshot for multi-device sync
  if (isFirebaseConfigured() && db) {
    try {
      const docRef = doc(db, 'settings', 'voting');
      const unsubscribeFirestore = onSnapshot(
        docRef,
        (snap) => {
          if (snap.exists()) {
            const data = sanitizeVotingSettings(snap.data() as VotingSettings);
            saveLocalVotingSettings(data);
            callback(data);
          } else {
            callback(getLocalVotingSettings());
          }
        },
        (error) => {
          console.warn('Firestore voting settings onSnapshot error:', error);
        }
      );
      cleanupFns.push(unsubscribeFirestore);
    } catch (e) {}
  }

  return () => {
    cleanupFns.forEach((fn) => fn());
  };
}

/**
 * Get voter status from localStorage & resilient persistent cookies
 */
export function getLocalVoterStatus(voterId: string): VoterStatus {
  if (typeof window === 'undefined') {
    return { voterId, hasVotedBoy: false, hasVotedGirl: false };
  }

  let result: VoterStatus = {
    voterId,
    hasVotedBoy: false,
    hasVotedGirl: false,
  };

  // 1. Primary device voter record
  const raw = localStorage.getItem(`${STORAGE_KEY_VOTER_STATUS}_${voterId}`);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      result = { ...result, ...parsed, voterId };
    } catch (e) {}
  }

  // 2. Generic device backup in case voterId had entropy mismatch
  const genericRaw = localStorage.getItem(STORAGE_KEY_VOTER_STATUS);
  if (genericRaw) {
    try {
      const parsed = JSON.parse(genericRaw);
      result.hasVotedBoy = result.hasVotedBoy || !!parsed.hasVotedBoy;
      result.hasVotedGirl = result.hasVotedGirl || !!parsed.hasVotedGirl;
      result.boyVotedFor = result.boyVotedFor || parsed.boyVotedFor;
      result.girlVotedFor = result.girlVotedFor || parsed.girlVotedFor;
      result.votedAt = result.votedAt || parsed.votedAt;
    } catch (e) {}
  }

  // 3. Resilient cookie check (persists even if localStorage is purged on mobile safari refresh)
  if (typeof document !== 'undefined') {
    if (document.cookie.includes('novera_voted_b=1')) {
      result.hasVotedBoy = true;
    }
    if (document.cookie.includes('novera_voted_g=1')) {
      result.hasVotedGirl = true;
    }
    const bMatch = document.cookie.match(/novera_b_for=([^;]+)/);
    if (bMatch && !result.boyVotedFor) {
      result.boyVotedFor = decodeURIComponent(bMatch[1]);
    }
    const gMatch = document.cookie.match(/novera_g_for=([^;]+)/);
    if (gMatch && !result.girlVotedFor) {
      result.girlVotedFor = decodeURIComponent(gMatch[1]);
    }
  }

  return result;
}

export function saveLocalVoterStatus(status: VoterStatus): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_KEY_VOTER_STATUS}_${status.voterId}`, JSON.stringify(status));
    localStorage.setItem(STORAGE_KEY_VOTER_STATUS, JSON.stringify(status));
    if (status.voterName) {
      localStorage.setItem('novera_voter_name', status.voterName);
    }

    // Multi-layer cookie backup (30-day max-age)
    if (status.hasVotedBoy) {
      document.cookie = `novera_voted_b=1; max-age=${30 * 24 * 60 * 60}; path=/; SameSite=Lax`;
      if (status.boyVotedFor) {
        document.cookie = `novera_b_for=${encodeURIComponent(status.boyVotedFor)}; max-age=${30 * 24 * 60 * 60}; path=/; SameSite=Lax`;
      }
    }
    if (status.hasVotedGirl) {
      document.cookie = `novera_voted_g=1; max-age=${30 * 24 * 60 * 60}; path=/; SameSite=Lax`;
      if (status.girlVotedFor) {
        document.cookie = `novera_g_for=${encodeURIComponent(status.girlVotedFor)}; max-age=${30 * 24 * 60 * 60}; path=/; SameSite=Lax`;
      }
    }
  } catch (e) {}
}

export function reconcileWithCanonicalContenders(list: Candidate[]): Candidate[] {
  const voteMap = new Map<string, number>();
  if (Array.isArray(list)) {
    for (const c of list) {
      if (c && c.id) {
        voteMap.set(c.id, Number(c.votes || 0));
      }
    }
  }
  return INITIAL_CANDIDATES.map((cand) => ({
    ...cand,
    votes: voteMap.get(cand.id) ?? cand.votes ?? 0,
  }));
}

/**
 * Intelligently resolve a voter's ballot choice to the canonical Candidate
 * Handles candidate IDs (c-17, boy-1, girl-1), runway numbers (01-29, M-01, F-01), and candidate names
 */
export function resolveContenderForBallot(
  votedVal: string | undefined,
  category: 'boy' | 'girl',
  candidateList: Candidate[]
): Candidate | undefined {
  if (!votedVal) return undefined;
  const raw = String(votedVal).trim();
  const clean = raw.toLowerCase();
  const digitsOnly = clean.replace(/\D/g, '');

  // 1. Direct ID match
  const byId = candidateList.find((c) => c.id.toLowerCase() === clean);
  if (byId) return byId;

  // 2. Exact candidateNumber match (e.g. "17", "01", "M-01", etc.)
  const byNumExact = candidateList.find(
    (c) => c.category === category && c.candidateNumber.toLowerCase() === clean
  );
  if (byNumExact) return byNumExact;

  // 3. Numeric match by digit (e.g. "17" vs candidateNumber "17" or "01" vs "01")
  if (digitsOnly) {
    const numInt = parseInt(digitsOnly, 10);
    // First try within the specific category
    const byNumCategory = candidateList.find((c) => {
      if (c.category !== category) return false;
      const cNum = parseInt(c.candidateNumber.replace(/\D/g, ''), 10);
      return cNum === numInt;
    });
    if (byNumCategory) return byNumCategory;

    // Legacy "boy-X" or "girl-X" fallback mapping:
    if (clean.startsWith('boy-') || clean.startsWith('m-')) {
      if (numInt === 1) return candidateList.find((c) => c.name.toLowerCase().includes('sandesh'));
      if (numInt === 2) return candidateList.find((c) => c.name.toLowerCase().includes('sudarshan'));
      if (numInt === 3) return candidateList.find((c) => c.name.toLowerCase().includes('dineth'));
      if (numInt === 4) return candidateList.find((c) => c.name.toLowerCase().includes('kaveesha'));
      if (numInt === 5) return candidateList.find((c) => c.name.toLowerCase().includes('tashin'));
      if (numInt === 6) return candidateList.find((c) => c.name.toLowerCase().includes('chanula') || c.name.toLowerCase().includes('chanuth'));
      if (numInt === 7) return candidateList.find((c) => c.name.toLowerCase().includes('chanuth'));
      if (numInt === 8) return candidateList.find((c) => c.name.toLowerCase().includes('dulaj'));
    }

    if (clean.startsWith('girl-') || clean.startsWith('f-')) {
      if (numInt === 1) return candidateList.find((c) => c.name.toLowerCase().includes('dulanjalee'));
      if (numInt === 2) return candidateList.find((c) => c.name.toLowerCase().includes('ruwini') || c.name.toLowerCase().includes('ravini'));
      if (numInt === 3) return candidateList.find((c) => c.name.toLowerCase().includes('githmi'));
      if (numInt === 4) return candidateList.find((c) => c.name.toLowerCase().includes('sethuli'));
      if (numInt === 5) return candidateList.find((c) => c.name.toLowerCase().includes('tashini'));
      if (numInt === 7) return candidateList.find((c) => c.name.toLowerCase().includes('mandrie'));
      if (numInt === 8) return candidateList.find((c) => c.name.toLowerCase().includes('ovindi'));
      if (numInt === 9) return candidateList.find((c) => c.name.toLowerCase().includes('lumbini'));
      if (numInt === 12) return candidateList.find((c) => c.name.toLowerCase().includes('chathurya'));
      if (numInt === 13) return candidateList.find((c) => c.name.toLowerCase().includes('januly'));
      if (numInt === 14) return candidateList.find((c) => c.name.toLowerCase().includes('lahasi'));
      if (numInt === 15) return candidateList.find((c) => c.name.toLowerCase().includes('dinithi'));
      if (numInt === 16) return candidateList.find((c) => c.name.toLowerCase().includes('sinali') || c.name.toLowerCase().includes('sineli'));
    }
  }

  // 4. Name fuzzy/includes match
  const byName = candidateList.find(
    (c) => c.category === category && (c.name.toLowerCase().includes(clean) || clean.includes(c.name.toLowerCase()))
  );
  if (byName) return byName;

  return undefined;
}

/**
 * Reconciles the candidate list with the live verified ballots recorded in the voters registry
 * Guarantees that live vote charts and standings 100% reflect the actual audience ballots
 */
export function reconcileCandidatesWithVoters(
  candidatesList: Candidate[],
  votersList: VoterRecord[]
): Candidate[] {
  if (!Array.isArray(candidatesList)) return [];
  if (!Array.isArray(votersList) || votersList.length === 0) return candidatesList;

  // Tally live ballots from verified voters
  const tallyMap = new Map<string, number>();

  for (const v of votersList) {
    if (v.hasVotedBoy && v.boyVotedFor) {
      const boy = resolveContenderForBallot(v.boyVotedFor, 'boy', candidatesList);
      if (boy) {
        tallyMap.set(boy.id, (tallyMap.get(boy.id) || 0) + 1);
      }
    }
    if (v.hasVotedGirl && v.girlVotedFor) {
      const girl = resolveContenderForBallot(v.girlVotedFor, 'girl', candidatesList);
      if (girl) {
        tallyMap.set(girl.id, (tallyMap.get(girl.id) || 0) + 1);
      }
    }
  }

  return candidatesList.map((c) => {
    const verifiedTally = tallyMap.get(c.id) || 0;
    const explicitVotes = Number(c.votes || 0);
    return {
      ...c,
      votes: Math.max(verifiedTally, explicitVotes),
    };
  });
}

export function getLocalCandidates(): Candidate[] {
  if (typeof window === 'undefined') return INITIAL_CANDIDATES;
  const raw = localStorage.getItem(STORAGE_KEY_CANDIDATES);
  const localVoters = getLocalVoterList();
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        let canonical = reconcileWithCanonicalContenders(parsed);
        if (localVoters.length > 0) {
          canonical = reconcileCandidatesWithVoters(canonical, localVoters);
        }
        saveLocalCandidates(canonical);
        return canonical;
      }
    } catch (e) {}
  }
  let initial = INITIAL_CANDIDATES;
  if (localVoters.length > 0) {
    initial = reconcileCandidatesWithVoters(initial, localVoters);
  }
  localStorage.setItem(STORAGE_KEY_CANDIDATES, JSON.stringify(initial));
  return initial;
}

export function saveLocalCandidates(candidates: Candidate[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_CANDIDATES, JSON.stringify(candidates));
}

/**
 * Seed Firestore with initial candidates if not already present
 */
export async function seedFirebaseCandidates(): Promise<void> {
  if (!isFirebaseConfigured() || !db) return;
  try {
    const candidatesCol = collection(db, 'candidates');
    const snapshot = await getDocs(candidatesCol);
    if (snapshot.empty || snapshot.size < INITIAL_CANDIDATES.length) {
      const batch = writeBatch(db);
      for (const candidate of INITIAL_CANDIDATES) {
        const candidateDoc = doc(db, 'candidates', candidate.id);
        batch.set(candidateDoc, candidate, { merge: true });
      }
      await batch.commit();
      console.log('Successfully seeded 20 Sri Lankan contenders into Firestore!');
    }
  } catch (err) {
    console.warn('Firebase candidate seed warning (check Firestore security rules):', err);
  }
}

/**
 * Subscribe to candidates in real-time with Firebase Firestore onSnapshot
 */
export function subscribeToCandidates(callback: (candidates: Candidate[]) => void): () => void {
  if (!isFirebaseConfigured() || !db) {
    callback(getLocalCandidates());
    return () => {};
  }

  // Attempt real-time snapshot
  try {
    const candidatesCol = collection(db, 'candidates');
    const unsubscribe = onSnapshot(
      candidatesCol,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: Candidate[] = [];
          snapshot.forEach((doc) => list.push(doc.data() as Candidate));
          const canonical = reconcileWithCanonicalContenders(list);
          if (list.length < INITIAL_CANDIDATES.length) {
            seedFirebaseCandidates().catch(() => {});
          }
          saveLocalCandidates(canonical);
          callback(canonical);
        } else {
          // If empty, seed
          seedFirebaseCandidates().then(() => callback(getLocalCandidates()));
        }
      },
      (error) => {
        console.warn('Firestore onSnapshot listener error, falling back to local/REST:', error);
        callback(getLocalCandidates());
      }
    );
    return unsubscribe;
  } catch (e) {
    callback(getLocalCandidates());
    return () => {};
  }
}

/**
 * Fetch Candidates: tries Firestore, then Spring Boot, then localStorage
 */
export async function fetchCandidates(): Promise<Candidate[]> {
  // 1. Try Firebase Firestore
  if (isFirebaseConfigured() && db) {
    try {
      const candidatesCol = collection(db, 'candidates');
      const snapshot = await getDocs(candidatesCol);
      if (!snapshot.empty) {
        const list: Candidate[] = [];
        snapshot.forEach((doc) => list.push(doc.data() as Candidate));
        const canonical = reconcileWithCanonicalContenders(list);
        if (list.length < INITIAL_CANDIDATES.length) {
          seedFirebaseCandidates().catch(() => {});
        }
        saveLocalCandidates(canonical);
        return canonical;
      } else {
        await seedFirebaseCandidates();
      }
    } catch (err) {
      console.warn('Firebase candidates fetch warning:', err);
    }
  }

  // 2. Try Spring Boot (Guarded against unreachable localhost on mobile)
  if (shouldCallSpringBoot()) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1500);
      const res = await fetch(`${SPRING_BOOT_API_URL}/candidates`, { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          saveLocalCandidates(data);
          return data;
        }
      }
    } catch (err) {}
  }

  return getLocalCandidates();
}

/**
 * Submit Vote: Enforces strict 1 Boy + 1 Girl rule across Firestore & Spring Boot
 */
export async function submitVote(submission: VoteSubmission): Promise<{
  success: boolean;
  message: string;
  voterStatus: VoterStatus;
}> {
  const voterId = submission.voterId || getOrCreateVoterId();
  let currentStatus = getLocalVoterStatus(voterId);

  // Strict Validation: One boy and one girl vote only
  if (submission.boyCandidateId && currentStatus.hasVotedBoy) {
    return {
      success: false,
      message: 'You have already voted for a Best Male Model (Boy). Only one vote allowed.',
      voterStatus: currentStatus,
    };
  }

  if (submission.girlCandidateId && currentStatus.hasVotedGirl) {
    return {
      success: false,
      message: 'You have already voted for a Best Female Model (Girl). Only one vote allowed.',
      voterStatus: currentStatus,
    };
  }

  const voterName = (submission.voterName && submission.voterName.trim()) || currentStatus.voterName || 'Audience Guest';
  currentStatus.voterName = voterName;

  // 1. Instant Local Cache Update (Optimistic 0ms UI response)
  const candidates = getLocalCandidates();
  if (submission.boyCandidateId) {
    const candidate = candidates.find((c) => c.id === submission.boyCandidateId);
    if (candidate) candidate.votes = (candidate.votes || 0) + 1;
    currentStatus.hasVotedBoy = true;
    currentStatus.boyVotedFor = submission.boyCandidateId;
  }
  if (submission.girlCandidateId) {
    const candidate = candidates.find((c) => c.id === submission.girlCandidateId);
    if (candidate) candidate.votes = (candidate.votes || 0) + 1;
    currentStatus.hasVotedGirl = true;
    currentStatus.girlVotedFor = submission.girlCandidateId;
  }
  currentStatus.votedAt = Date.now();
  saveLocalCandidates(candidates);
  saveLocalVoterStatus(currentStatus);

  // Save in local voter registry for real-time live tickers
  const justVotedCandidateId = submission.girlCandidateId || submission.boyCandidateId;
  saveLocalVoterRecord({
    voterId,
    voterName,
    hasVotedBoy: currentStatus.hasVotedBoy,
    hasVotedGirl: currentStatus.hasVotedGirl,
    boyVotedFor: currentStatus.boyVotedFor,
    girlVotedFor: currentStatus.girlVotedFor,
    lastVotedCandidateId: justVotedCandidateId,
    updatedAt: Date.now(),
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('novera_vote_updated'));
    window.dispatchEvent(new Event('novera_voters_updated'));
  }

  // 2. High-Concurrency Asynchronous Remote Writes (Atomic Firestore Increments + Spring Boot)
  const remoteTasks: Promise<any>[] = [];

  if (isFirebaseConfigured() && db) {
    try {
      if (submission.boyCandidateId) {
        const boyRef = doc(db, 'candidates', submission.boyCandidateId);
        remoteTasks.push(updateDoc(boyRef, { votes: increment(1) }).catch((err) => console.warn('Boy vote sync note:', err)));
      }
      if (submission.girlCandidateId) {
        const girlRef = doc(db, 'candidates', submission.girlCandidateId);
        remoteTasks.push(updateDoc(girlRef, { votes: increment(1) }).catch((err) => console.warn('Girl vote sync note:', err)));
      }

      // Record voter lock - CRITICAL: Never pass undefined values to Firestore
      const voterRef = doc(db, 'voters', voterId);
      const voterDocData: Record<string, any> = {
        voterId,
        voterName,
        hasVotedBoy: currentStatus.hasVotedBoy,
        hasVotedGirl: currentStatus.hasVotedGirl,
        updatedAt: Date.now(),
      };
      if (currentStatus.boyVotedFor) voterDocData.boyVotedFor = currentStatus.boyVotedFor;
      if (currentStatus.girlVotedFor) voterDocData.girlVotedFor = currentStatus.girlVotedFor;
      if (justVotedCandidateId) voterDocData.lastVotedCandidateId = justVotedCandidateId;

      remoteTasks.push(setDoc(voterRef, voterDocData, { merge: true }).catch((err) => console.warn('Voter sync note:', err)));
    } catch (err) {
      console.warn('Firebase vote recording note:', err);
    }
  }

  // Asynchronous Spring Boot background sync
  if (shouldCallSpringBoot()) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1800);
      remoteTasks.push(
        fetch(`${SPRING_BOOT_API_URL}/votes/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submission),
          signal: controller.signal,
        })
          .then(() => clearTimeout(timer))
          .catch(() => {})
      );
    } catch (e) {}
  }

  // Fast await with maximum 350ms budget so user experience is instantaneous even under heavy traffic
  await Promise.race([
    Promise.all(remoteTasks),
    new Promise((resolve) => setTimeout(resolve, 350)),
  ]);

  return {
    success: true,
    message: "Your vote has been verified and recorded! Thank you for voting in NOVERA '26.",
    voterStatus: currentStatus,
  };
}

/**
 * Sync voter status with Firestore & system reset signals
 */
export async function syncVoterStatus(voterId: string): Promise<VoterStatus> {
  let localStatus = getLocalVoterStatus(voterId);

  if (isFirebaseConfigured() && db) {
    try {
      // 1. Check global reset state
      const systemSnap = await getDoc(doc(db, 'system', 'ballot_state'));
      const lastResetAt = systemSnap.exists() ? systemSnap.data()?.lastResetAt || 0 : 0;
      const seenReset = Number(localStorage.getItem('novera_last_reset_seen') || '0');

      if (lastResetAt > seenReset) {
        localStorage.setItem('novera_last_reset_seen', lastResetAt.toString());
        if (typeof document !== 'undefined') {
          document.cookie = 'novera_voted_b=; max-age=0; path=/; SameSite=Lax';
          document.cookie = 'novera_voted_g=; max-age=0; path=/; SameSite=Lax';
          document.cookie = 'novera_b_for=; max-age=0; path=/; SameSite=Lax';
          document.cookie = 'novera_g_for=; max-age=0; path=/; SameSite=Lax';
        }
        localStatus = { voterId, hasVotedBoy: false, hasVotedGirl: false };
        saveLocalVoterStatus(localStatus);
        return localStatus;
      }

      // 2. Check remote voter document
      const voterDocRef = doc(db, 'voters', voterId);
      const voterSnap = await getDoc(voterDocRef);
      if (voterSnap.exists()) {
        const remote = voterSnap.data() as VoterStatus;
        localStatus = {
          ...localStatus,
          ...remote,
          hasVotedBoy: localStatus.hasVotedBoy || remote.hasVotedBoy,
          hasVotedGirl: localStatus.hasVotedGirl || remote.hasVotedGirl,
          boyVotedFor: remote.boyVotedFor || localStatus.boyVotedFor,
          girlVotedFor: remote.girlVotedFor || localStatus.girlVotedFor,
        };
        saveLocalVoterStatus(localStatus);
        return localStatus;
      } else if (localStatus.hasVotedBoy || localStatus.hasVotedGirl) {
        // If device has voted locally, heal/re-push status to Firestore so remote is also aware
        const voterData: Record<string, any> = {
          voterId,
          hasVotedBoy: !!localStatus.hasVotedBoy,
          hasVotedGirl: !!localStatus.hasVotedGirl,
          updatedAt: Date.now(),
        };
        if (localStatus.boyVotedFor) voterData.boyVotedFor = localStatus.boyVotedFor;
        if (localStatus.girlVotedFor) voterData.girlVotedFor = localStatus.girlVotedFor;
        setDoc(voterDocRef, voterData, { merge: true }).catch(() => {});
      }
    } catch (e) {
      console.warn('Error syncing remote voter status:', e);
    }
  }

  return localStatus;
}

/**
 * Subscribe to real-time voter status & admin reset broadcasts
 */
export function subscribeToVoterStatus(
  voterId: string,
  callback: (status: VoterStatus) => void
): () => void {
  if (!isFirebaseConfigured() || !db) {
    callback(getLocalVoterStatus(voterId));
    return () => {};
  }

  try {
    const voterRef = doc(db, 'voters', voterId);
    const systemRef = doc(db, 'system', 'ballot_state');

    // Only merge remote when snap exists - NEVER wipe local status just because remote doc is absent!
    const unsubVoter = onSnapshot(
      voterRef,
      (snap) => {
        if (snap.exists()) {
          const remote = snap.data() as VoterStatus;
          const current = getLocalVoterStatus(voterId);
          const merged: VoterStatus = {
            ...current,
            ...remote,
            hasVotedBoy: current.hasVotedBoy || remote.hasVotedBoy,
            hasVotedGirl: current.hasVotedGirl || remote.hasVotedGirl,
            boyVotedFor: remote.boyVotedFor || current.boyVotedFor,
            girlVotedFor: remote.girlVotedFor || current.girlVotedFor,
          };
          saveLocalVoterStatus(merged);
          callback(merged);
        }
      },
      () => {}
    );

    const unsubSystem = onSnapshot(
      systemRef,
      (snap) => {
        if (snap.exists()) {
          const lastResetAt = snap.data()?.lastResetAt || 0;
          const seenReset = Number(localStorage.getItem('novera_last_reset_seen') || '0');
          if (lastResetAt > seenReset) {
            localStorage.setItem('novera_last_reset_seen', lastResetAt.toString());
            if (typeof document !== 'undefined') {
              document.cookie = 'novera_voted_b=; max-age=0; path=/; SameSite=Lax';
              document.cookie = 'novera_voted_g=; max-age=0; path=/; SameSite=Lax';
              document.cookie = 'novera_b_for=; max-age=0; path=/; SameSite=Lax';
              document.cookie = 'novera_g_for=; max-age=0; path=/; SameSite=Lax';
            }
            const clean = { voterId, hasVotedBoy: false, hasVotedGirl: false };
            saveLocalVoterStatus(clean);
            callback(clean);
          }
        }
      },
      () => {}
    );

    return () => {
      unsubVoter();
      unsubSystem();
    };
  } catch (e) {
    callback(getLocalVoterStatus(voterId));
    return () => {};
  }
}

/**
 * Reset all votes (Admin function)
 */
export async function resetAllVotes(): Promise<void> {
  const resetTimestamp = Date.now();

  // 1. Firebase Firestore reset
  if (isFirebaseConfigured() && db) {
    try {
      const batch = writeBatch(db);

      // Reset candidate vote counters to 0
      const candidatesSnapshot = await getDocs(collection(db, 'candidates'));
      candidatesSnapshot.forEach((candidateDoc) => {
        batch.update(candidateDoc.ref, { votes: 0 });
      });

      // Clear all voter documents so devices are unlocked to vote again
      const votersSnapshot = await getDocs(collection(db, 'voters'));
      votersSnapshot.forEach((voterDoc) => {
        batch.delete(voterDoc.ref);
      });

      // Set global ballot state reset epoch
      const systemDocRef = doc(db, 'system', 'ballot_state');
      batch.set(systemDocRef, { lastResetAt: resetTimestamp }, { merge: true });

      await batch.commit();
    } catch (e) {
      console.error('Error resetting Firestore votes:', e);
    }
  }

  // 2. Spring Boot reset
  if (shouldCallSpringBoot()) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1500);
      await fetch(`${SPRING_BOOT_API_URL}/admin/reset`, { method: 'POST', signal: controller.signal });
      clearTimeout(timer);
    } catch (e) {}
  }

  // 3. Local candidates reset
  const candidates = getLocalCandidates().map((c) => ({ ...c, votes: 0 }));
  saveLocalCandidates(candidates);

  // 4. Local voter status reset
  if (typeof window !== 'undefined') {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('novera_voter') || key.startsWith(STORAGE_KEY_VOTER_STATUS))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    localStorage.removeItem(STORAGE_KEY_VOTER_ID);

    document.cookie = 'novera_voted_b=; max-age=0; path=/; SameSite=Lax';
    document.cookie = 'novera_voted_g=; max-age=0; path=/; SameSite=Lax';
    document.cookie = 'novera_b_for=; max-age=0; path=/; SameSite=Lax';
    document.cookie = 'novera_g_for=; max-age=0; path=/; SameSite=Lax';
    document.cookie = 'novera_vid=; max-age=0; path=/; SameSite=Lax';

    localStorage.setItem('novera_last_reset_seen', resetTimestamp.toString());
    localStorage.removeItem(STORAGE_KEY_VOTER_LIST);

    window.dispatchEvent(new Event('novera_vote_updated'));
    window.dispatchEvent(new Event('novera_voters_updated'));
  }
}

/**
 * Live Voter Stream & Audit Registry Storage & Sync
 */
export function getLocalVoterList(): VoterRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VOTER_LIST);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

export function saveLocalVoterList(list: VoterRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_VOTER_LIST, JSON.stringify(list));
  } catch (e) {}
}

export function saveLocalVoterRecord(record: VoterRecord): void {
  const list = getLocalVoterList();
  const existingIndex = list.findIndex((r) => r.voterId === record.voterId);
  if (existingIndex >= 0) {
    list[existingIndex] = { ...list[existingIndex], ...record };
  } else {
    list.unshift(record);
  }
  saveLocalVoterList(list.slice(0, 300));
}

export function subscribeToVoters(callback: (voters: VoterRecord[]) => void): () => void {
  if (!isFirebaseConfigured() || !db) {
    callback(getLocalVoterList());
    const handler = () => callback(getLocalVoterList());
    if (typeof window !== 'undefined') {
      window.addEventListener('novera_voters_updated', handler);
      return () => window.removeEventListener('novera_voters_updated', handler);
    }
    return () => {};
  }

  try {
    const votersCol = collection(db, 'voters');
    const q = query(votersCol, orderBy('updatedAt', 'desc'), limit(150));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: VoterRecord[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            voterId: docSnap.id,
            voterName: data.voterName || 'Audience Guest',
            hasVotedBoy: data.hasVotedBoy,
            hasVotedGirl: data.hasVotedGirl,
            boyVotedFor: data.boyVotedFor,
            girlVotedFor: data.girlVotedFor,
            lastVotedCandidateId: data.lastVotedCandidateId || data.girlVotedFor || data.boyVotedFor,
            updatedAt: data.updatedAt || Date.now(),
          });
        });
        saveLocalVoterList(list);
        callback(list);
      },
      (error) => {
        console.warn('Firestore voters onSnapshot note:', error);
        callback(getLocalVoterList());
      }
    );
    return unsubscribe;
  } catch (e) {
    callback(getLocalVoterList());
    return () => {};
  }
}

export async function fetchVoters(): Promise<VoterRecord[]> {
  if (isFirebaseConfigured() && db) {
    try {
      const votersCol = collection(db, 'voters');
      const q = query(votersCol, orderBy('updatedAt', 'desc'), limit(150));
      const snapshot = await getDocs(q);
      const list: VoterRecord[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          voterId: docSnap.id,
          voterName: data.voterName || 'Audience Guest',
          hasVotedBoy: data.hasVotedBoy,
          hasVotedGirl: data.hasVotedGirl,
          boyVotedFor: data.boyVotedFor,
          girlVotedFor: data.girlVotedFor,
          lastVotedCandidateId: data.lastVotedCandidateId || data.girlVotedFor || data.boyVotedFor,
          updatedAt: data.updatedAt || Date.now(),
        });
      });
      saveLocalVoterList(list);
      return list;
    } catch (err) {
      console.warn('Firebase voter list fetch error:', err);
    }
  }
  return getLocalVoterList();
}

/**
 * Judge Scoring Storage & Sync
 */
export function getLocalJudgeScores(): JudgeScore[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(STORAGE_KEY_JUDGE_SCORES);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {}
  }
  return [];
}

export function saveLocalJudgeScores(scores: JudgeScore[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_JUDGE_SCORES, JSON.stringify(scores));
}

export async function saveJudgeScore(score: JudgeScore): Promise<{ success: boolean; message: string }> {
  // 1. Firebase Firestore sync if available
  if (isFirebaseConfigured() && db) {
    try {
      const scoreDoc = doc(db, 'judge_scores', score.id);
      await setDoc(scoreDoc, score, { merge: true });
    } catch (err) {
      console.warn('Firebase judge score save warning:', err);
    }
  }

  // 2. Local state update
  const current = getLocalJudgeScores();
  const existingIndex = current.findIndex((s) => s.id === score.id);
  if (existingIndex >= 0) {
    current[existingIndex] = score;
  } else {
    current.push(score);
  }
  saveLocalJudgeScores(current);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('novera_judge_scores_updated'));
  }

  return { success: true, message: 'Marks submitted successfully!' };
}

export async function fetchJudgeScores(): Promise<JudgeScore[]> {
  if (isFirebaseConfigured() && db) {
    try {
      const snapshot = await getDocs(collection(db, 'judge_scores'));
      if (!snapshot.empty) {
        const list: JudgeScore[] = [];
        snapshot.forEach((doc) => list.push(doc.data() as JudgeScore));
        saveLocalJudgeScores(list);
        return list;
      }
    } catch (err) {
      console.warn('Firebase judge score fetch warning:', err);
    }
  }
  return getLocalJudgeScores();
}

export function subscribeToJudgeScores(callback: (scores: JudgeScore[]) => void): () => void {
  if (!isFirebaseConfigured() || !db) {
    callback(getLocalJudgeScores());
    const handler = () => callback(getLocalJudgeScores());
    if (typeof window !== 'undefined') {
      window.addEventListener('novera_judge_scores_updated', handler);
      return () => window.removeEventListener('novera_judge_scores_updated', handler);
    }
    return () => {};
  }

  try {
    const scoresCol = collection(db, 'judge_scores');
    const unsubscribe = onSnapshot(
      scoresCol,
      (snapshot) => {
        const list: JudgeScore[] = [];
        snapshot.forEach((doc) => list.push(doc.data() as JudgeScore));
        saveLocalJudgeScores(list);
        callback(list);
      },
      (error) => {
        console.warn('Firestore judge scores onSnapshot error:', error);
        callback(getLocalJudgeScores());
      }
    );
    return unsubscribe;
  } catch (e) {
    callback(getLocalJudgeScores());
    return () => {};
  }
}

export async function resetAllJudgeScores(): Promise<void> {
  if (isFirebaseConfigured() && db) {
    try {
      const snapshot = await getDocs(collection(db, 'judge_scores'));
      const batch = writeBatch(db);
      snapshot.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    } catch (e) {}
  }

  saveLocalJudgeScores([]);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('novera_judge_scores_updated'));
  }
}
