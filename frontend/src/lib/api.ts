import { Candidate, VoterStatus, VoteSubmission, JudgeScore } from './types';
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
} from 'firebase/firestore';

const STORAGE_KEY_VOTER_ID = 'novera_voter_uuid';
const STORAGE_KEY_CANDIDATES = 'novera_candidates_cache';
const STORAGE_KEY_VOTER_STATUS = 'novera_voter_status';
const STORAGE_KEY_JUDGE_SCORES = 'novera_judge_scores';

const SPRING_BOOT_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

/**
 * Returns or generates a unique persistent voter ID for this device/browser
 */
export function getOrCreateVoterId(): string {
  if (typeof window === 'undefined') return 'server-voter-id';
  let voterId = localStorage.getItem(STORAGE_KEY_VOTER_ID);
  if (!voterId) {
    voterId = 'voter_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
    localStorage.setItem(STORAGE_KEY_VOTER_ID, voterId);
  }
  return voterId;
}

/**
 * Get voter status from localStorage
 */
export function getLocalVoterStatus(voterId: string): VoterStatus {
  if (typeof window === 'undefined') {
    return { voterId, hasVotedBoy: false, hasVotedGirl: false };
  }
  const raw = localStorage.getItem(`${STORAGE_KEY_VOTER_STATUS}_${voterId}`);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {}
  }
  return {
    voterId,
    hasVotedBoy: false,
    hasVotedGirl: false,
  };
}

export function saveLocalVoterStatus(status: VoterStatus): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`${STORAGE_KEY_VOTER_STATUS}_${status.voterId}`, JSON.stringify(status));
}

export function getLocalCandidates(): Candidate[] {
  if (typeof window === 'undefined') return INITIAL_CANDIDATES;
  const raw = localStorage.getItem(STORAGE_KEY_CANDIDATES);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {}
  }
  localStorage.setItem(STORAGE_KEY_CANDIDATES, JSON.stringify(INITIAL_CANDIDATES));
  return INITIAL_CANDIDATES;
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
    if (snapshot.empty) {
      const batch = writeBatch(db);
      for (const candidate of INITIAL_CANDIDATES) {
        const candidateDoc = doc(db, 'candidates', candidate.id);
        batch.set(candidateDoc, candidate);
      }
      await batch.commit();
      console.log('Successfully seeded initial contenders into Firestore!');
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
          saveLocalCandidates(list);
          callback(list);
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
        saveLocalCandidates(list);
        return list;
      } else {
        await seedFirebaseCandidates();
      }
    } catch (err) {
      console.warn('Firebase candidates fetch warning:', err);
    }
  }

  // 2. Try Spring Boot
  try {
    const res = await fetch(`${SPRING_BOOT_API_URL}/candidates`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        saveLocalCandidates(data);
        return data;
      }
    }
  } catch (err) {}

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

  // Firestore remote status check if available
  if (isFirebaseConfigured() && db) {
    try {
      const voterDocRef = doc(db, 'voters', voterId);
      const voterSnap = await getDoc(voterDocRef);
      if (voterSnap.exists()) {
        const remoteStatus = voterSnap.data() as VoterStatus;
        currentStatus = { ...currentStatus, ...remoteStatus };
      }
    } catch (e) {}
  }

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

  // 1. Record in Firebase Firestore
  if (isFirebaseConfigured() && db) {
    try {
      if (submission.boyCandidateId) {
        const boyRef = doc(db, 'candidates', submission.boyCandidateId);
        await updateDoc(boyRef, { votes: increment(1) });
      }
      if (submission.girlCandidateId) {
        const girlRef = doc(db, 'candidates', submission.girlCandidateId);
        await updateDoc(girlRef, { votes: increment(1) });
      }

      // Record voter lock
      const voterRef = doc(db, 'voters', voterId);
      await setDoc(
        voterRef,
        {
          voterId,
          hasVotedBoy: currentStatus.hasVotedBoy || !!submission.boyCandidateId,
          hasVotedGirl: currentStatus.hasVotedGirl || !!submission.girlCandidateId,
          boyVotedFor: submission.boyCandidateId || currentStatus.boyVotedFor,
          girlVotedFor: submission.girlCandidateId || currentStatus.girlVotedFor,
          updatedAt: Date.now(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Firebase vote recording note:', err);
    }
  }

  // 2. Record in Spring Boot backend
  try {
    await fetch(`${SPRING_BOOT_API_URL}/votes/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submission),
    });
  } catch (e) {}

  // 3. Update local state
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

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('novera_vote_updated'));
  }

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
        localStatus = { voterId, hasVotedBoy: false, hasVotedGirl: false };
        saveLocalVoterStatus(localStatus);
        return localStatus;
      }

      // 2. Check remote voter document
      const voterDocRef = doc(db, 'voters', voterId);
      const voterSnap = await getDoc(voterDocRef);
      if (!voterSnap.exists()) {
        // If wiped in Firestore, reset local status to allow voting fresh
        localStatus = { voterId, hasVotedBoy: false, hasVotedGirl: false };
        saveLocalVoterStatus(localStatus);
        return localStatus;
      } else {
        const remote = voterSnap.data() as VoterStatus;
        localStatus = { ...localStatus, ...remote };
        saveLocalVoterStatus(localStatus);
        return localStatus;
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

    const unsubVoter = onSnapshot(
      voterRef,
      (snap) => {
        if (!snap.exists()) {
          const clean = { voterId, hasVotedBoy: false, hasVotedGirl: false };
          saveLocalVoterStatus(clean);
          callback(clean);
        } else {
          const remote = snap.data() as VoterStatus;
          saveLocalVoterStatus(remote);
          callback(remote);
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
  try {
    await fetch(`${SPRING_BOOT_API_URL}/admin/reset`, { method: 'POST' });
  } catch (e) {}

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
    localStorage.setItem('novera_last_reset_seen', resetTimestamp.toString());

    window.dispatchEvent(new Event('novera_vote_updated'));
  }
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
