'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Candidate, JudgeScore, VotingSettings } from '@/lib/types';
import {
  fetchCandidates,
  getLocalCandidates,
  resetAllVotes,
  saveLocalCandidates,
  subscribeToCandidates,
  subscribeToJudgeScores,
  resetAllJudgeScores,
  subscribeToVotingSettings,
  saveVotingSettings,
} from '@/lib/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
  LabelList,
} from 'recharts';
import {
  Users,
  RotateCcw,
  ShieldCheck,
  Crown,
  Lock,
  LogOut,
  Award,
  Star,
  Shuffle,
  Vote,
  Camera,
  Zap,
  Heart,
  Printer,
  FileText,
  Download,
  Copy,
  Check,
  Trophy,
  Sparkles,
  Eye,
  EyeOff,
  QrCode,
  MessageSquare,
  CheckCircle2,
  Clock,
  Play,
  Square,
  Radio,
  Timer,
  AlertTriangle,
  X,
  RefreshCw,
} from 'lucide-react';
import RunwayStageBackground from '@/app/components/RunwayStageBackground';
import VotingCountdownOverlay from '@/app/components/VotingCountdownOverlay';

export type AdminRole = 'master' | 'stage';

const MASTER_PASSCODES = ['novera2026', 'admin2026', 'master2026'];
const STAGE_PASSCODES = ['stage2026', 'stage', 'noverastage'];

const OFFICIAL_JUDGE_ROSTER = [
  { id: 'judge_mayuri', name: 'Mayuri', title: "Official Runway Judge · NOVERA '26" },
  { id: 'judge_kalpani', name: 'Kalpani', title: "Official Runway Judge · NOVERA '26" },
  { id: 'judge_piyumi', name: 'Piyumi', title: "Official Runway Judge · NOVERA '26" },
  { id: 'judge_kalwani', name: 'Kalwani', title: "Official Runway Judge · NOVERA '26" },
  { id: 'judge_devdunu', name: 'Devdunu', title: "Official Runway Judge · NOVERA '26" },
  { id: 'judge_erusha', name: 'Erusha', title: "Official Runway Judge · NOVERA '26" },
  { id: 'judge_sachith', name: 'Sachith', title: "Official Runway Judge · NOVERA '26" },
  { id: 'judge_dulmi', name: 'Dulmi', title: "Official Runway Judge · NOVERA '26" },
];

export type AwardKey =
  | 'topModel'
  | 'personality'
  | 'stagePresence'
  | 'photogenic'
  | 'design'
  | 'peoplesChoice';

interface AwardDefinition {
  key: AwardKey;
  title: string;
  subtitle: string;
  icon: typeof Trophy;
  maxScore: number;
  source: 'jury' | 'audience';
  criteriaText: string;
}

const AWARD_DEFINITIONS: AwardDefinition[] = [
  {
    key: 'topModel',
    title: 'Top Model',
    subtitle: 'Overall Winner (Max 100)',
    icon: Crown,
    maxScore: 100,
    source: 'jury',
    criteriaText: 'Walking (20) + Confid (20) + Stage (20) + Posture (15) + Poses (15) + Face (10)',
  },
  {
    key: 'personality',
    title: 'Best Personality',
    subtitle: 'Character & Attitude (Max 50)',
    icon: Star,
    maxScore: 50,
    source: 'jury',
    criteriaText: 'Confidence (20) + Stage Presence (20) + Face & Expression (10)',
  },
  {
    key: 'stagePresence',
    title: 'Best Stage Presence',
    subtitle: 'Audience Impact (Max 30)',
    icon: Zap,
    maxScore: 30,
    source: 'jury',
    criteriaText: 'Confidence (10 max) + Stage Impact (20 max)',
  },
  {
    key: 'photogenic',
    title: 'Most Photogenic Model',
    subtitle: 'Camera-Ready Look (Max 40)',
    icon: Camera,
    maxScore: 40,
    source: 'jury',
    criteriaText: 'Posture & Poise (15) + Poses (15) + Facial Expression (10)',
  },
  {
    key: 'design',
    title: 'Best Design (Students)',
    subtitle: 'Student Outfit Award (Max 100)',
    icon: Sparkles,
    maxScore: 100,
    source: 'jury',
    criteriaText: 'Creativity (30) + Craftsmanship (25) + Theme (20) + Fit & Styling (15) + Impact (10)',
  },
  {
    key: 'peoplesChoice',
    title: "People's Choice",
    subtitle: 'Audience Web Voting',
    icon: Heart,
    maxScore: 0,
    source: 'audience',
    criteriaText: 'Live Public Ballot votes submitted by the audience on /vote',
  },
];

export default function AdminLeaderboardPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [adminRole, setAdminRole] = useState<AdminRole>('stage');
  const [passcode, setPasscode] = useState<string>('');
  const [passcodeError, setPasscodeError] = useState<string>('');

  const [adminMode, setAdminMode] = useState<'stage' | 'vault'>('stage');
  const [vaultTab, setVaultTab] = useState<'audience' | 'judges' | 'summary'>('judges');
  const [selectedJuryAward, setSelectedJuryAward] = useState<AwardKey>('topModel');
  const [selectedAuditJudge, setSelectedAuditJudge] = useState<typeof OFFICIAL_JUDGE_ROSTER[0] | null>(null);
  const [auditCategoryFilter, setAuditCategoryFilter] = useState<'all' | 'boy' | 'girl'>('all');
  const [auditStatusFilter, setAuditStatusFilter] = useState<'all' | 'scored' | 'pending'>('all');

  const [candidates, setCandidates] = useState<Candidate[]>(() => getLocalCandidates());
  const [judgeScores, setJudgeScores] = useState<JudgeScore[]>([]);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    subtitle: string;
    description: string;
    confirmLabel: string;
    warningNote?: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((cur) => (cur?.text === text ? null : cur));
    }, 3500);
  };
  const [chartCategory, setChartCategory] = useState<'both' | 'boy' | 'girl'>('both');
  const [chartSortMode, setChartSortMode] = useState<'number' | 'votes'>('number');
  const [leaderboardCategory, setLeaderboardCategory] = useState<'both' | 'boy' | 'girl'>('both');
  const [showPdfStudio, setShowPdfStudio] = useState<boolean>(false);
  const [pdfDocumentTab, setPdfDocumentTab] = useState<'mc_cues' | 'championship' | 'audience' | 'all'>('mc_cues');
  const [pdfIncludeScripts, setPdfIncludeScripts] = useState<boolean>(true);
  const [pdfIncludeSignatures, setPdfIncludeSignatures] = useState<boolean>(true);
  const [pdfIncludeRunnerUps, setPdfIncludeRunnerUps] = useState<boolean>(true);
  const [isCopiedScript, setIsCopiedScript] = useState<boolean>(false);
  const [votingSettings, setVotingSettings] = useState<VotingSettings>({ isVotingOpen: false });
  const [isUpdatingVotingStatus, setIsUpdatingVotingStatus] = useState<boolean>(false);
  const [isPrivacyMasked, setIsPrivacyMasked] = useState<boolean>(false);
  const [votingDurationMinutes, setVotingDurationMinutes] = useState<number>(10);
  const [remainingTimeText, setRemainingTimeText] = useState<string>('');
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const openedSessionIdRef = useRef<string | null>(null);

  const loadData = () => {
    fetchCandidates().then((list) => {
      setCandidates(list);
    });
  };

  useEffect(() => {
    const savedAuth = sessionStorage.getItem('novera_admin_auth');
    const savedRole = sessionStorage.getItem('novera_admin_role') as AdminRole | null;
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
      if (savedRole === 'master') {
        setAdminRole('master');
        setAdminMode('vault');
      } else {
        setAdminRole('stage');
        setAdminMode('stage');
      }
    }

    router.prefetch('/qr');
    loadData();

    const unsubscribeCandidates = subscribeToCandidates((updatedList) => {
      setCandidates(updatedList);
    });

    const unsubscribeJudgeScores = subscribeToJudgeScores((scores) => {
      setJudgeScores(scores);
    });

    const unsubscribeVotingSettings = subscribeToVotingSettings((settings) => {
      setVotingSettings(settings);
    });

    const interval = setInterval(loadData, 3000);
    const handleVoteSync = () => loadData();
    const handleStorageSync = (e: StorageEvent) => {
      if (e.key === 'novera_candidates') {
        loadData();
      }
    };
    window.addEventListener('novera_vote_updated', handleVoteSync);
    window.addEventListener('storage', handleStorageSync);

    return () => {
      unsubscribeCandidates();
      unsubscribeJudgeScores();
      unsubscribeVotingSettings();
      clearInterval(interval);
      window.removeEventListener('novera_vote_updated', handleVoteSync);
      window.removeEventListener('storage', handleStorageSync);
    };
  }, []);

  // Live 10-Minute Countdown & Auto-Close Timer for Admin
  useEffect(() => {
    if (!votingSettings.isVotingOpen || !votingSettings.votingClosesAt) {
      setRemainingTimeText('');
      setRemainingSeconds(0);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const diffMs = (votingSettings.votingClosesAt || 0) - now;
      const totalSec = Math.max(0, Math.ceil(diffMs / 1000));
      setRemainingSeconds(totalSec);

      if (totalSec <= 0) {
        setRemainingTimeText('');
        if (votingSettings.isVotingOpen) {
          saveVotingSettings({
            isVotingOpen: false,
            votingClosesAt: null,
            countdownUntil: null,
            sessionId: null,
            announcement: 'Audience voting has concluded for NOVERA ’26.',
          });
          showToast('Audience voting session has concluded.', 'info');
        }
        return;
      }

      const mins = Math.floor(totalSec / 60);
      const secs = totalSec % 60;
      setRemainingTimeText(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 500);
    return () => clearInterval(interval);
  }, [votingSettings.isVotingOpen, votingSettings.votingClosesAt, votingSettings.sessionId, adminRole]);

  const toggleVotingStatus = async () => {
    if (isUpdatingVotingStatus) return;
    if (!votingSettings.isVotingOpen) {
      // Opening voting: 10 minutes session (or configured duration)
      const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      openedSessionIdRef.current = sessionId;
      const durationMs = votingDurationMinutes * 60 * 1000;
      const votingClosesAt = Date.now() + durationMs;
      const countdownTarget = Date.now() + 5200; // 5s opening countdown
      setIsUpdatingVotingStatus(true);
      try {
        await saveVotingSettings({
          isVotingOpen: true,
          votingClosesAt,
          votingDurationSeconds: votingDurationMinutes * 60,
          countdownUntil: countdownTarget,
          sessionId,
          announcement: `Audience voting is LIVE for ${votingDurationMinutes} minutes!`,
        });
      } finally {
        setIsUpdatingVotingStatus(false);
      }
    } else {
      // Closing voting: immediate lock
      openedSessionIdRef.current = null;
      setIsUpdatingVotingStatus(true);
      try {
        await saveVotingSettings({
          isVotingOpen: false,
          votingClosesAt: null,
          countdownUntil: null,
          sessionId: null,
          announcement: 'Audience voting is currently PAUSED / CONCLUDED by the Central Committee.',
        });
        showToast('Audience voting paused by Central Committee.', 'info');
      } finally {
        setIsUpdatingVotingStatus(false);
      }
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPass = passcode.trim().toLowerCase();

    if (MASTER_PASSCODES.includes(cleanPass)) {
      setIsAuthenticated(true);
      setAdminRole('master');
      setAdminMode('vault'); // Directly opens the score vault
      sessionStorage.setItem('novera_admin_auth', 'true');
      sessionStorage.setItem('novera_admin_role', 'master');
      setPasscodeError('');
    } else if (STAGE_PASSCODES.includes(cleanPass)) {
      setIsAuthenticated(true);
      setAdminRole('stage');
      setAdminMode('stage'); // Stage role is locked to Stage Launchpad
      sessionStorage.setItem('novera_admin_auth', 'true');
      sessionStorage.setItem('novera_admin_role', 'stage');
      setPasscodeError('');
    } else {
      setPasscodeError('Invalid Passcode. Please enter your authorized access code.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPasscode('');
    sessionStorage.removeItem('novera_admin_auth');
    sessionStorage.removeItem('novera_admin_role');
  };

  // Audience Calculations
  const boys = useMemo(
    () => candidates.filter((c) => c.category === 'boy').sort((a, b) => (b.votes || 0) - (a.votes || 0)),
    [candidates]
  );

  const girls = useMemo(
    () => candidates.filter((c) => c.category === 'girl').sort((a, b) => (b.votes || 0) - (a.votes || 0)),
    [candidates]
  );

  const totalBoyVotes = boys.reduce((sum, c) => sum + (c.votes || 0), 0);
  const totalGirlVotes = girls.reduce((sum, c) => sum + (c.votes || 0), 0);
  const totalOverallVotes = totalBoyVotes + totalGirlVotes;

  const topBoyAudience = boys[0];
  const topGirlAudience = girls[0];

  // Detailed Candidate Scores Calculation for All 5 Jury Awards
  const candidateStats = useMemo(() => {
    return candidates.map((candidate) => {
      const scores = judgeScores.filter((s) => s.candidateId === candidate.id);
      const judgeCount = scores.length;

      // 1. Top Model (Max 100)
      const topModelAvg =
        judgeCount > 0
          ? Math.round(
            (scores.reduce(
              (sum, s) =>
                sum +
                Number(
                  s.totalModel ??
                  (Number(s.walking || 0) +
                    Number(s.confidence || 0) +
                    Number(s.stage || 0) +
                    Number(s.posture || 0) +
                    Number(s.poses || 0) +
                    Number(s.face || 0))
                ),
              0
            ) /
              judgeCount) *
            10
          ) / 10
          : 0;

      // 2. Best Personality (Max 50: Confid 20 + Stage 20 + Face 10)
      const personalityAvg =
        judgeCount > 0
          ? Math.round(
            (scores.reduce(
              (sum, s) =>
                sum +
                Number(
                  s.personalityScore ??
                  Number(s.confidence || 0) + Number(s.stage || 0) + Number(s.face || 0)
                ),
              0
            ) /
              judgeCount) *
            10
          ) / 10
          : 0;

      // 3. Best Stage Presence (Max 30: Confid 10 + Stage 20)
      const stagePresenceAvg =
        judgeCount > 0
          ? Math.round(
            (scores.reduce(
              (sum, s) =>
                sum +
                Number(
                  s.stagePresenceScore ??
                  Math.min(10, Math.round(Number(s.confidence || 0) / 2)) +
                  Number(s.stage || 0)
                ),
              0
            ) /
              judgeCount) *
            10
          ) / 10
          : 0;

      // 4. Most Photogenic Model (Max 40: Posture 15 + Poses 15 + Face 10)
      const photogenicAvg =
        judgeCount > 0
          ? Math.round(
            (scores.reduce(
              (sum, s) =>
                sum +
                Number(
                  s.photogenicScore ??
                  Number(s.posture || 0) + Number(s.poses || 0) + Number(s.face || 0)
                ),
              0
            ) /
              judgeCount) *
            10
          ) / 10
          : 0;

      // 5. Best Design Students (Max 100: Creativity 30 + Craftsmanship 25 + Theme 20 + Fit 15 + Impact 10)
      const designAvg =
        judgeCount > 0
          ? Math.round(
            (scores.reduce(
              (sum, s) =>
                sum +
                Number(
                  s.totalDesign ??
                  (Number(s.designCreativity || 0) +
                    Number(s.designCraftsmanship || 0) +
                    Number(s.designTheme || 0) +
                    Number(s.designFit || 0) +
                    Number(s.designImpact || 0))
                ),
              0
            ) /
              judgeCount) *
            10
          ) / 10
          : 0;

      return {
        candidate,
        judgeCount,
        scores,
        topModelAvg,
        personalityAvg,
        stagePresenceAvg,
        photogenicAvg,
        designAvg,
        votes: candidate.votes || 0,
      };
    });
  }, [candidates, judgeScores]);

  // Ranking helper by award
  const getRankedStats = (category: 'boy' | 'girl', award: AwardKey) => {
    const list = candidateStats.filter((c) => c.candidate.category === category);
    return list.sort((a, b) => {
      switch (award) {
        case 'topModel':
          return b.topModelAvg - a.topModelAvg || b.judgeCount - a.judgeCount;
        case 'personality':
          return b.personalityAvg - a.personalityAvg || b.judgeCount - a.judgeCount;
        case 'stagePresence':
          return b.stagePresenceAvg - a.stagePresenceAvg || b.judgeCount - a.judgeCount;
        case 'photogenic':
          return b.photogenicAvg - a.photogenicAvg || b.judgeCount - a.judgeCount;
        case 'design':
          return b.designAvg - a.designAvg || b.judgeCount - a.judgeCount;
        case 'peoplesChoice':
        default:
          return b.votes - a.votes;
      }
    });
  };

  // Helper to extract score display for award
  const getScoreValueForAward = (stat: typeof candidateStats[0], award: AwardKey) => {
    switch (award) {
      case 'topModel':
        return { score: stat.topModelAvg, max: 100 };
      case 'personality':
        return { score: stat.personalityAvg, max: 50 };
      case 'stagePresence':
        return { score: stat.stagePresenceAvg, max: 30 };
      case 'photogenic':
        return { score: stat.photogenicAvg, max: 40 };
      case 'design':
        return { score: stat.designAvg, max: 100 };
      case 'peoplesChoice':
      default:
        return { score: stat.votes, max: 0 };
    }
  };

  const handleResetVotes = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Reset All Audience Votes?',
      subtitle: 'PERMANENT RESET ACTION',
      description: 'Are you sure you want to reset all AUDIENCE votes to 0? This will clear all public ballot counts across all Male & Female contenders and unlock devices for a fresh voting session.',
      confirmLabel: 'Yes, Reset Votes to 0',
      warningNote: 'Voter devices, local caches, and ballot tokens will be refreshed. This action cannot be undone.',
      onConfirm: async () => {
        setIsResetting(true);
        try {
          await resetAllVotes();
          setCandidates((prev) => prev.map((c) => ({ ...c, votes: 0 })));
          loadData();
          showToast('All audience votes successfully reset to 0.', 'success');
        } catch (err) {
          console.error('Reset error:', err);
          showToast('Failed to reset votes. Please try again.', 'info');
        } finally {
          setIsResetting(false);
          setConfirmModal(null);
        }
      },
    });
  };

  const handleResetJudges = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Reset All Judge Scores?',
      subtitle: 'CLEAR ALL ROUND EVALUATIONS',
      description: `Are you sure you want to reset all JUDGES scores to 0? This will permanently wipe all scoring marks and submitted scorecards across all ${OFFICIAL_JUDGE_ROSTER.length} official judges.`,
      confirmLabel: 'Yes, Reset Judge Scores',
      warningNote: `All ${OFFICIAL_JUDGE_ROSTER.length} judge accounts will have their submitted marksheets unlocked and reset to 0.`,
      onConfirm: async () => {
        setIsResetting(true);
        try {
          await resetAllJudgeScores();
          setJudgeScores([]);
          showToast('All judge scorecards successfully cleared.', 'success');
        } catch (err) {
          console.error('Reset judges error:', err);
          showToast('Failed to reset judge scores. Please try again.', 'info');
        } finally {
          setIsResetting(false);
          setConfirmModal(null);
        }
      },
    });
  };

  const handleSimulateVotes = () => {
    const updated = candidates.map((c) => ({
      ...c,
      votes: (c.votes || 0) + Math.floor(Math.random() * 5) + 1,
    }));
    saveLocalCandidates(updated);
    setCandidates(updated);
  };

  const handleCopyMcScript = () => {
    let text = `====================================================\n`;
    text += `NOVERA '26 OFFICIAL MC STAGE ANNOUNCEMENT CUE SHEET\n`;
    text += `AIESEC in CINEC • Certified Grand Finale Telemetry\n`;
    text += `Generated: ${new Date().toLocaleString()} (Sri Lanka Standard Time)\n`;
    text += `====================================================\n\n`;

    AWARD_DEFINITIONS.forEach((award, idx) => {
      const rankedBoys = getRankedStats('boy', award.key);
      const rankedGirls = getRankedStats('girl', award.key);
      const winnerBoy = rankedBoys[0];
      const winnerGirl = rankedGirls[0];
      const boyScore = winnerBoy ? getScoreValueForAward(winnerBoy, award.key).score : 0;
      const girlScore = winnerGirl ? getScoreValueForAward(winnerGirl, award.key).score : 0;

      text += `🏆 TITLE #${idx + 1}: ${award.title.toUpperCase()}\n`;
      text += `   Criteria: ${award.criteriaText}\n`;
      text += `   👔 Best Male Model (Boy): #${winnerBoy?.candidate.candidateNumber || 'N/A'} - ${winnerBoy?.candidate.name || 'To Be Announced'} (Score / Votes: ${boyScore})\n`;
      text += `   👗 Best Female Model (Girl): #${winnerGirl?.candidate.candidateNumber || 'N/A'} - ${winnerGirl?.candidate.name || 'To Be Announced'} (Score / Votes: ${girlScore})\n`;
      if (pdfIncludeScripts) {
        text += `   🎙️ MC STAGE CUE:\n`;
        text += `      "Ladies and Gentlemen, for ${award.title}, the recipient of the Male Award is Candidate #${winnerBoy?.candidate.candidateNumber || 'N/A'}, ${winnerBoy?.candidate.name || 'TBA'}! And the winner for Female Model is Candidate #${winnerGirl?.candidate.candidateNumber || 'N/A'}, ${winnerGirl?.candidate.name || 'TBA'}!"\n`;
      }
      text += `----------------------------------------------------\n\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      setIsCopiedScript(true);
      showToast('MC Announcement Cue Sheet copied to clipboard!', 'success');
      setTimeout(() => setIsCopiedScript(false), 3000);
    }).catch(() => {
      showToast('Unable to copy to clipboard automatically.', 'info');
    });
  };

  const handleExportCSV = () => {
    const rows = [
      ['Category', 'Candidate Number', 'Candidate Name', 'Audience Votes', 'Top Model Score (Max 100)', 'Personality (Max 50)', 'Stage Presence (Max 30)', 'Photogenic (Max 40)'],
      ...candidates.map((c) => {
        const stat = candidateStats.find((s) => s.candidate.id === c.id);
        return [
          c.category === 'boy' ? 'Male Model' : 'Female Model',
          c.candidateNumber || c.id,
          `"${c.name}"`,
          c.votes || 0,
          stat?.topModelAvg || 0,
          stat?.personalityAvg || 0,
          stat?.stagePresenceAvg || 0,
          stat?.photogenicAvg || 0,
        ];
      }),
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `NOVERA_26_Official_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Official CSV Ledger downloaded successfully.', 'success');
  };

  // Recharts Data Prep
  const chartData = useMemo(() => {
    let sourceCandidates: Candidate[] = [];
    if (chartCategory === 'both') {
      sourceCandidates = [...candidates];
    } else if (chartCategory === 'boy') {
      sourceCandidates = candidates.filter((c) => c.category === 'boy');
    } else {
      sourceCandidates = candidates.filter((c) => c.category === 'girl');
    }

    const sorted = [...sourceCandidates].sort((a, b) => {
      if (chartSortMode === 'votes') {
        const diff = (b.votes || 0) - (a.votes || 0);
        if (diff !== 0) return diff;
      }
      const numA = parseInt(a.candidateNumber?.replace(/\D/g, '') || '0', 10);
      const numB = parseInt(b.candidateNumber?.replace(/\D/g, '') || '0', 10);
      return numA - numB;
    });

    const getContenderShortName = (fullName: string) => {
      const parts = fullName.trim().split(/\s+/);
      for (const part of parts) {
        if (!part.includes('.') && part.length > 2) {
          return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
        }
      }
      return parts[0] || fullName;
    };

    return sorted.map((c) => ({
      id: c.id,
      number: c.candidateNumber || c.id,
      displayName: `${c.candidateNumber || ''} ${getContenderShortName(c.name)}`.trim(),
      fullName: c.name,
      category: c.category === 'boy' ? 'Boy' : 'Girl',
      votes: c.votes || 0,
      color: c.category === 'boy' ? '#d4af37' : '#f59e0b',
    }));
  }, [candidates, chartCategory, chartSortMode]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-3 sm:p-4 relative overflow-hidden">
        {/* Haute Couture Fashion Runway Stage Animation */}
        <RunwayStageBackground />

        <div className="max-w-sm sm:max-w-md w-full bg-black/40 backdrop-blur-2xl rounded-3xl p-5 sm:p-8 border border-white/20 shadow-[0_30px_90px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.2)] text-center space-y-5 sm:space-y-6 relative overflow-hidden animate-in zoom-in-95 duration-500">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-300 to-transparent animate-scan-sweep" />

          {/* Luxury Monogram Floating Badge */}
          <div className="relative mx-auto w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
            <div className="absolute inset-0 rounded-2xl bg-amber-400/25 blur-xl animate-luxury-glow pointer-events-none" />
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/10 backdrop-blur-xl text-novera-gold flex items-center justify-center shadow-2xl border border-amber-400/40 animate-float relative z-10">
              <Lock className="w-6 h-6 sm:w-8 sm:h-8 text-amber-300 drop-shadow-[0_0_12px_rgba(236,213,153,0.9)]" />
            </div>
          </div>

          <div className="space-y-1 sm:space-y-1.5">
            <h1 className="font-serif text-xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#FFF5D6] via-[#ECD599] to-[#B3924F] tracking-tight pt-1">
              NOVERA &rsquo;26 Admin Console
            </h1>
            <p className="text-[11px] sm:text-xs text-zinc-300 font-medium">
              Enter your authorized access passcode to unlock the console.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div>
              <label className="block text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-amber-200/90 mb-1.5">
                Access Passcode
              </label>
              <input
                type="password"
                placeholder="Enter access passcode"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full px-4 py-3 sm:py-3.5 rounded-2xl bg-white/10 text-xs sm:text-sm text-white placeholder-zinc-400 outline-none focus:border-amber-400 focus:bg-white/15 font-mono text-center tracking-widest text-base shadow-inner border border-white/20 transition-all backdrop-blur-md"
                required
                autoFocus
              />
            </div>

            {passcodeError && (
              <div className="p-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2 shadow-sm animate-in fade-in duration-200 backdrop-blur-md">
                <span>{passcodeError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 sm:py-3.5 rounded-full bg-novera-foil text-novera-paper hover:bg-novera-ink transition-all text-xs sm:text-sm font-semibold tracking-wider uppercase shadow-md flex items-center justify-center gap-2 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
              <Lock className="w-4 h-4" />
              <span>Unlock Admin Console</span>
            </button>
          </form>

          <p className="text-[10px] sm:text-[11px] text-zinc-400 font-mono">
            Authorized Organizing Committee Access Only &bull; NOVERA &rsquo;26
          </p>
        </div>
      </div>
    );
  }

  // Active Award Definition for Tab 2
  const activeAwardDef = AWARD_DEFINITIONS.find((a) => a.key === selectedJuryAward) || AWARD_DEFINITIONS[0];
  const rankedBoysForAward = getRankedStats('boy', selectedJuryAward);
  const rankedGirlsForAward = getRankedStats('girl', selectedJuryAward);
  const leadingBoyForAward = rankedBoysForAward[0];
  const leadingGirlForAward = rankedGirlsForAward[0];

  return (
    <div className="min-h-screen relative text-white overflow-x-hidden print:bg-white print:text-black print:min-h-0">
      {/* 🌟 CINEMATIC RUNWAY OPENING COUNTDOWN OVERLAY - ONLY FOR STAGE OPERATOR (WHO HAS START VOTING BUTTON) */}
      {adminRole === 'stage' && votingSettings.countdownUntil && votingSettings.countdownUntil > Date.now() && (
        <VotingCountdownOverlay
          countdownUntil={votingSettings.countdownUntil}
          onComplete={async () => {
            if (openedSessionIdRef.current && openedSessionIdRef.current === votingSettings.sessionId) {
              try {
                await saveVotingSettings({
                  ...votingSettings,
                  countdownUntil: null,
                });
              } catch (e) { }
            }
            setVotingSettings((prev) => ({ ...prev, countdownUntil: null }));
            router.push('/qr');
          }}
        />
      )}


      {/* Haute Couture Fashion Runway Stage Animation */}
      <div className="print:hidden">
        <RunwayStageBackground />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 relative z-10 print:hidden">
        {/* ================= VIEW 1: STAGE LAUNCHPAD ONLY (STAGE VOTING OPERATOR) ================= */}
        {adminRole === 'stage' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Top Stage Header */}
            <div className="p-4 sm:p-8 rounded-2xl sm:rounded-3xl bg-black/40 backdrop-blur-2xl border border-white/15 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6 shadow-2xl">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/35 text-xs uppercase tracking-widest font-bold text-amber-300 mb-2">
                  <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span>Stage Controller · Voting Operator</span>
                </div>
                <h1 className="font-serif text-2xl sm:text-4xl font-bold text-white">
                  Audience Voting Launchpad
                </h1>
                <p className="text-xs sm:text-sm text-zinc-300 mt-1">
                  Live Runway Voting &amp; Stage Display Launcher &bull; Marks &amp; Results Hidden
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <Link
                  href="/qr"
                  target="_blank"
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-novera-gold to-amber-400 text-black shadow-md hover:brightness-110 active:scale-95 transition-all border border-amber-300 text-center"
                >
                  <QrCode className="w-4 h-4 text-black shrink-0" />
                  <span><span className="hidden sm:inline">Launch </span>Stage Screen &rarr;</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs font-semibold text-zinc-300 bg-white/5 hover:bg-white/10 hover:text-white border border-white/15 backdrop-blur-md transition-colors shadow-sm active:scale-95 cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>

            {/* Main Launchpad Card with Big Button and Session Configuration */}
            <div className="p-4 sm:p-8 rounded-2xl sm:rounded-3xl bg-black/50 backdrop-blur-2xl border border-white/15 shadow-2xl space-y-5 sm:space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 border-b border-white/10 pb-4 sm:pb-5">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-novera-gold font-bold block mb-1">
                    Master Stage Controller &bull; Privacy Protected
                  </span>
                  <h2 className="font-serif text-xl sm:text-3xl font-bold text-white">
                    Live Voting Control
                  </h2>
                  <p className="text-xs text-zinc-300 mt-1">
                    Trigger public audience voting for NOVERA ’26 with the master button below.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-2 px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider border ${votingSettings.isVotingOpen
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_20px_rgba(212,175,55,0.3)]'
                      : 'bg-black/60 text-zinc-400 border-white/10'
                    }`}>
                    <span className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${votingSettings.isVotingOpen ? 'bg-amber-400 animate-ping' : 'bg-zinc-500'}`} />
                    <span>{votingSettings.isVotingOpen ? 'Stage Status: LIVE' : 'Stage Status: LOCKED'}</span>
                  </span>
                </div>
              </div>

              {/* 🚀 THE BIG OPEN / STOP VOTING BUTTON */}
              <div>
                <button
                  type="button"
                  onClick={toggleVotingStatus}
                  disabled={isUpdatingVotingStatus}
                  className={`w-full py-7 sm:py-12 md:py-14 px-4 sm:px-10 rounded-2xl sm:rounded-3xl transition-all duration-300 flex items-center justify-center gap-3 sm:gap-6 relative overflow-hidden group cursor-pointer border-2 shadow-2xl active:scale-[0.99] ${votingSettings.isVotingOpen
                      ? 'bg-gradient-to-r from-[#171410] via-[#241d15] to-[#171410] border-amber-400/80 text-amber-100 shadow-[0_0_50px_rgba(212,175,55,0.35)] hover:border-amber-300 hover:shadow-[0_0_65px_rgba(212,175,55,0.5)]'
                      : 'bg-gradient-to-r from-[#d4af37] via-[#f5e6b8] to-[#aa7c11] border-white/80 text-black shadow-[0_0_60px_rgba(212,175,55,0.45)] hover:brightness-110'
                    }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />

                  <div className="flex items-center gap-3 sm:gap-6">
                    {votingSettings.isVotingOpen ? (
                      <Square className="w-6 h-6 sm:w-10 sm:h-10 md:w-12 md:h-12 text-amber-300 fill-amber-300 shrink-0 drop-shadow-md" />
                    ) : (
                      <Play className="w-6 h-6 sm:w-10 sm:h-10 md:w-12 md:h-12 text-black fill-black shrink-0 drop-shadow-md animate-pulse" />
                    )}
                    <span className={`font-serif text-lg sm:text-3xl md:text-5xl font-black uppercase tracking-wide drop-shadow-[0_2px_15px_rgba(0,0,0,0.8)] text-center leading-tight ${votingSettings.isVotingOpen
                        ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-white to-amber-300'
                        : 'text-black'
                      }`}>
                      {votingSettings.isVotingOpen
                        ? 'Stop Audience Voting'
                        : `Open Audience Voting (${votingDurationMinutes} Mins)`}
                    </span>
                  </div>
                </button>
              </div>

              {/* ⏱️ LIVE 10-MINUTE COUNTDOWN DISPLAY (WHEN VOTING IS LIVE) */}
              {votingSettings.isVotingOpen && remainingTimeText && (
                <div className="p-6 sm:p-7 rounded-2xl bg-gradient-to-r from-amber-500/15 via-black/80 to-amber-500/10 border-2 border-novera-gold/70 shadow-[0_0_35px_rgba(203,167,95,0.3)] flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="space-y-1 text-center md:text-left">
                    <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-novera-gold font-bold">
                      <Clock className="w-4 h-4 text-novera-gold animate-spin-slow" />
                      <span>Official Synchronized Runway Timer</span>
                    </div>
                    <h3 className="font-serif text-xl sm:text-2xl font-bold text-white">
                      Audience Voting Session In Progress
                    </h3>
                    <p className="text-xs text-zinc-300">
                      Stage QR Code is unlocked. When the timer hits 00:00, voting will automatically close and the QR will lock.
                    </p>
                  </div>

                  <div className="flex flex-col items-center md:items-end gap-1.5 shrink-0">
                    <div className="px-6 py-2.5 rounded-2xl bg-black/90 border-2 border-novera-gold/80 shadow-[0_0_30px_rgba(251,191,36,0.5)] flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full bg-novera-gold animate-ping" />
                      <span className="font-mono text-3xl sm:text-5xl font-black text-amber-300 tracking-widest drop-shadow-[0_0_15px_rgba(251,191,36,0.9)]">
                        {remainingTimeText}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-zinc-400">Time Remaining Before Auto-Close</span>
                  </div>
                </div>
              )}

              {/* Voting Session Configuration (When voting is closed) */}
              {!votingSettings.isVotingOpen && (
                <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-white block">Session Duration Configuration</span>
                    <span className="text-[11px] text-zinc-400">Select how long audience voting remains active before auto-closing:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {[5, 10, 15, 20].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setVotingDurationMinutes(mins)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${votingDurationMinutes === mins
                            ? 'bg-gradient-to-r from-novera-gold to-amber-400 text-black border-amber-300 shadow-md font-extrabold'
                            : 'bg-white/5 hover:bg-white/15 text-zinc-300 border-white/10'
                          }`}
                      >
                        {mins} Mins{mins === 10 ? ' (Default)' : ''}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= VIEW 2: CONFIDENTIAL RESULTS VAULT (FOR MASTER COMMITTEE ONLY) ================= */}
        {adminRole === 'master' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Top Banner */}
            <div className="p-6 sm:p-8 rounded-3xl bg-black/40 backdrop-blur-2xl border border-white/15 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/50 backdrop-blur-xl border border-white/20 text-xs uppercase tracking-widest font-bold text-novera-gold mb-2">
                  <ShieldCheck className="w-4 h-4 text-novera-gold animate-float" />
                  <span>Confidential Results Vault · Master Committee</span>
                </div>
                <h1 className="font-serif text-2xl sm:text-4xl font-bold text-white">
                  Central Tabulation &amp; Official Marks
                </h1>
                <p className="text-xs sm:text-sm text-zinc-300 mt-1">
                  Confidential Judges Scorecards &bull; Audience Votes &bull; Grand Finale Standings
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Privacy Shield Toggle (Hides counts & leaders from backstage bystanders) */}
                <button
                  type="button"
                  onClick={() => setIsPrivacyMasked(!isPrivacyMasked)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm backdrop-blur-md border ${isPrivacyMasked
                      ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                      : 'bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 border-white/20'
                    }`}
                  title={isPrivacyMasked ? 'Privacy Shield is ACTIVE (Results concealed from bystanders)' : 'Privacy Shield is REVEALED'}
                >
                  {isPrivacyMasked ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                      <span>Privacy Shield</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5 text-amber-400" />
                      <span>Revealed</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setShowPdfStudio(true)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold bg-gradient-to-r from-amber-500/20 via-amber-400/25 to-novera-gold/20 hover:from-amber-500/35 hover:to-novera-gold/35 text-amber-200 border border-amber-400/50 backdrop-blur-md transition-all shadow-[0_0_15px_rgba(212,175,55,0.2)] group"
                  title="Open Interactive PDF Studio & Official Cue Sheet"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-300 group-hover:scale-110 transition-transform" />
                  <span>Official PDF Studio</span>
                  <span className="hidden sm:inline-block px-1.5 py-0.2 rounded bg-amber-400/30 text-[9px] font-mono font-bold text-amber-200 uppercase">
                    MC &amp; Audit
                  </span>
                </button>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-semibold text-zinc-300 bg-white/5 hover:bg-white/10 hover:text-white border border-white/15 backdrop-blur-md transition-colors shadow-sm"
                  title="Sign Out of Master Admin Hub"
                >
                  <LogOut className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>

            {/* Vault Tabs Navigation */}
            <div className="flex justify-center my-2">
              <div className="grid grid-cols-3 gap-1 sm:gap-2 p-1 sm:p-1.5 rounded-full bg-black/50 backdrop-blur-xl border border-white/15 shadow-inner w-full max-w-2xl">
                <button
                  onClick={() => setVaultTab('audience')}
                  className={`flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-3 px-2 sm:px-4 rounded-full text-[10px] sm:text-sm font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${vaultTab === 'audience'
                      ? 'bg-gradient-to-r from-novera-gold to-amber-500 text-black shadow-lg font-extrabold'
                      : 'text-zinc-400 hover:text-white hover:bg-white/10'
                    }`}
                >
                  <Vote className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${vaultTab === 'audience' ? 'text-black' : 'text-novera-gold'}`} />
                  <span className="truncate">Audience<span className="hidden sm:inline"> Votes</span></span>
                </button>

                <button
                  onClick={() => setVaultTab('judges')}
                  className={`flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-3 px-2 sm:px-4 rounded-full text-[10px] sm:text-sm font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${vaultTab === 'judges'
                      ? 'bg-gradient-to-r from-novera-gold to-amber-500 text-black shadow-lg font-extrabold'
                      : 'text-zinc-400 hover:text-white hover:bg-white/10'
                    }`}
                >
                  <Award className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${vaultTab === 'judges' ? 'text-black' : 'text-novera-gold'}`} />
                  <span className="truncate">Judges<span className="hidden sm:inline"> Scores</span></span>
                </button>

                <button
                  onClick={() => setVaultTab('summary')}
                  className={`flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-3 px-2 sm:px-4 rounded-full text-[10px] sm:text-sm font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${vaultTab === 'summary'
                      ? 'bg-gradient-to-r from-novera-gold to-amber-500 text-black shadow-lg font-extrabold'
                      : 'text-zinc-400 hover:text-white hover:bg-white/10'
                    }`}
                >
                  <Trophy className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${vaultTab === 'summary' ? 'text-black' : 'text-novera-gold'}`} />
                  <span className="truncate">Award<span className="hidden sm:inline"> Titles</span></span>
                </button>
              </div>
            </div>

            {/* ================= TAB 1: AUDIENCE VOTES ================= */}
            {vaultTab === 'audience' && (
              <div className="space-y-8 animate-in fade-in duration-200">
                {/* Quick Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="p-6 rounded-2xl bg-black/40 backdrop-blur-2xl border border-white/15 shadow-xl flex items-center justify-between text-white">
                    <div>
                      <span className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">Total Audience Ballots</span>
                      <div className="text-3xl font-serif font-bold text-white mt-1">
                        {isPrivacyMasked ? (
                          <span className="font-mono tracking-widest text-novera-gold text-2xl font-bold">••••••</span>
                        ) : (
                          totalOverallVotes
                        )}
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-novera-gold">
                      <Users className="w-6 h-6 text-novera-gold" />
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl bg-black/40 backdrop-blur-2xl border border-white/15 shadow-xl flex items-center justify-between text-white">
                    <div>
                      <span className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">Male Model Votes</span>
                      <div className="text-3xl font-serif font-bold text-white mt-1">
                        {isPrivacyMasked ? (
                          <span className="font-mono tracking-widest text-novera-gold text-2xl font-bold">••••</span>
                        ) : (
                          totalBoyVotes
                        )}
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-novera-gold">
                      <Crown className="w-6 h-6 text-novera-gold" />
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl bg-black/40 backdrop-blur-2xl border border-white/15 shadow-xl flex items-center justify-between text-white">
                    <div>
                      <span className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">Female Model Votes</span>
                      <div className="text-3xl font-serif font-bold text-white mt-1">
                        {isPrivacyMasked ? (
                          <span className="font-mono tracking-widest text-novera-gold text-2xl font-bold">••••</span>
                        ) : (
                          totalGirlVotes
                        )}
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-novera-gold">
                      <Crown className="w-6 h-6 text-novera-gold" />
                    </div>
                  </div>
                </div>

                {/* Leaders Showcase */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                  {isPrivacyMasked && (
                    <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-md rounded-3xl border border-novera-gold/30 p-6 flex flex-col items-center justify-center text-center space-y-3 shadow-2xl">
                      <div className="w-14 h-14 rounded-full bg-novera-gold/20 border border-novera-gold/40 flex items-center justify-center shadow-[0_0_20px_rgba(203,167,95,0.3)]">
                        <EyeOff className="w-7 h-7 text-novera-gold animate-pulse" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-serif text-lg font-bold text-white uppercase tracking-wider">
                          Audience Leaders Masked
                        </h4>
                        <p className="text-xs text-zinc-400 max-w-md">
                          Confidential mode is active to prevent bystanders or backstage participants from peeking at the live standings.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsPrivacyMasked(false)}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-novera-gold to-amber-500 text-black font-extrabold text-xs uppercase tracking-wider hover:brightness-110 shadow-md transition-all flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Reveal Leaders</span>
                      </button>
                    </div>
                  )}

                  {/* Leading Boy */}
                  <div className="p-6 rounded-3xl bg-black/40 backdrop-blur-2xl border-2 border-novera-gold/40 shadow-xl flex items-center gap-5 text-white">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-novera-gold/30 to-amber-900/40 border-2 border-novera-gold text-novera-gold font-mono font-extrabold text-base sm:text-lg flex items-center justify-center shrink-0 shadow-lg">
                      {topBoyAudience?.candidateNumber || 'Boy'}
                    </div>
                    <div className="flex-grow">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-novera-gold/20 border border-novera-gold/30 text-[10px] font-bold uppercase tracking-wider text-novera-gold mb-1">
                        <Crown className="w-3 h-3" />
                        <span>Leading Boy &bull; People&rsquo;s Choice</span>
                      </div>
                      <h3 className="font-serif text-xl font-bold text-white">{topBoyAudience?.name || 'N/A'}</h3>
                      <div className="text-xs text-zinc-300 mt-1">
                        <strong className="text-novera-gold text-base font-mono">{topBoyAudience?.votes || 0}</strong> votes (
                        {totalBoyVotes > 0 ? Math.round(((topBoyAudience?.votes || 0) / totalBoyVotes) * 100) : 0}%)
                      </div>
                    </div>
                  </div>

                  {/* Leading Girl */}
                  <div className="p-6 rounded-3xl bg-black/40 backdrop-blur-2xl border-2 border-novera-gold/40 shadow-xl flex items-center gap-5 text-white">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-novera-gold/30 to-amber-900/40 border-2 border-novera-gold text-novera-gold font-mono font-extrabold text-base sm:text-lg flex items-center justify-center shrink-0 shadow-lg">
                      {topGirlAudience?.candidateNumber || 'Girl'}
                    </div>
                    <div className="flex-grow">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-novera-gold/20 border border-novera-gold/30 text-[10px] font-bold uppercase tracking-wider text-novera-gold mb-1">
                        <Crown className="w-3 h-3" />
                        <span>Leading Girl &bull; People&rsquo;s Choice</span>
                      </div>
                      <h3 className="font-serif text-xl font-bold text-white">{topGirlAudience?.name || 'N/A'}</h3>
                      <div className="text-xs text-zinc-300 mt-1">
                        <strong className="text-novera-gold text-base font-mono">{topGirlAudience?.votes || 0}</strong> votes (
                        {totalGirlVotes > 0 ? Math.round(((topGirlAudience?.votes || 0) / totalGirlVotes) * 100) : 0}%)
                      </div>
                    </div>
                  </div>
                </div>

                {/* Live Vote Distribution Section */}
                <div className="p-6 sm:p-8 rounded-3xl bg-black/40 backdrop-blur-2xl border border-white/15 shadow-2xl text-white">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 border-b border-white/10 gap-4">
                    <div>
                      <h2 className="font-serif text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
                        <span>Live Vote Distribution</span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-sans font-bold uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Live Standings
                        </span>
                      </h2>
                      <p className="text-xs text-zinc-400 mt-1">Real-time vote comparison across runway models &bull; Standings update automatically</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      {/* Sort Order Toggle */}
                      <div className="inline-flex p-1 rounded-xl bg-white/10 border border-white/15 text-xs">
                        <button
                          type="button"
                          onClick={() => setChartSortMode('number')}
                          className={`px-3 py-1.5 rounded-lg font-medium transition-all ${chartSortMode === 'number' ? 'bg-white/20 text-white font-bold' : 'text-zinc-400 hover:text-white'}`}
                        >
                          Contender #
                        </button>
                        <button
                          type="button"
                          onClick={() => setChartSortMode('votes')}
                          className={`px-3 py-1.5 rounded-lg font-medium transition-all ${chartSortMode === 'votes' ? 'bg-gradient-to-r from-novera-gold to-amber-500 text-black font-extrabold shadow' : 'text-zinc-400 hover:text-white'}`}
                        >
                          Ranked
                        </button>
                      </div>

                      {/* Category Filter */}
                      <div className="inline-flex p-1 rounded-xl bg-white/10 border border-white/15 text-xs">
                        <button
                          type="button"
                          onClick={() => setChartCategory('both')}
                          className={`px-3 py-1.5 rounded-lg font-medium transition-all ${chartCategory === 'both' ? 'bg-gradient-to-r from-novera-gold to-amber-500 text-black font-extrabold shadow' : 'text-zinc-400 hover:text-white'}`}
                        >
                          All Models
                        </button>
                        <button
                          type="button"
                          onClick={() => setChartCategory('boy')}
                          className={`px-3 py-1.5 rounded-lg font-medium transition-all ${chartCategory === 'boy' ? 'bg-gradient-to-r from-novera-gold to-amber-500 text-black font-extrabold shadow' : 'text-zinc-400 hover:text-white'}`}
                        >
                          Boys Only
                        </button>
                        <button
                          type="button"
                          onClick={() => setChartCategory('girl')}
                          className={`px-3 py-1.5 rounded-lg font-medium transition-all ${chartCategory === 'girl' ? 'bg-gradient-to-r from-novera-gold to-amber-500 text-black font-extrabold shadow' : 'text-zinc-400 hover:text-white'}`}
                        >
                          Girls Only
                        </button>
                      </div>

                      {/* Privacy Toggle */}
                      <button
                        type="button"
                        onClick={() => setIsPrivacyMasked(!isPrivacyMasked)}
                        title={isPrivacyMasked ? 'Reveal Chart' : 'Conceal Chart'}
                        className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          isPrivacyMasked ? 'bg-amber-500/20 text-amber-300 border-amber-400/40' : 'bg-white/10 text-zinc-300 border-white/15 hover:bg-white/20'
                        }`}
                      >
                        {isPrivacyMasked ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="mt-8 w-full relative">
                    {isPrivacyMasked && (
                      <div className="absolute inset-0 z-20 bg-black/85 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center text-center p-4 space-y-3">
                        <EyeOff className="w-8 h-8 text-novera-gold animate-pulse" />
                        <span className="font-serif text-sm font-bold uppercase tracking-wider text-white">
                          Vote Distribution Concealed
                        </span>
                        <p className="text-xs text-zinc-400 max-w-sm">
                          Relative standings are shielded from view. Click to inspect live real-time bar graphs.
                        </p>
                        <button
                          type="button"
                          onClick={() => setIsPrivacyMasked(false)}
                          className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-novera-gold border border-novera-gold/30 text-xs font-bold uppercase tracking-wider transition-all"
                        >
                          Reveal Chart
                        </button>
                      </div>
                    )}

                    <div className="overflow-x-auto pb-2">
                      <div className={`h-88 sm:h-96 ${chartCategory === 'both' ? 'min-w-[850px]' : chartCategory === 'girl' ? 'min-w-[650px]' : 'min-w-[480px]'} w-full`}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} margin={{ top: 20, right: 15, left: -20, bottom: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.08)" />
                            <XAxis
                              dataKey="displayName"
                              tick={{ fontSize: 10, fill: '#d4d4d8' }}
                              interval={0}
                              angle={-45}
                              textAnchor="end"
                              height={60}
                            />
                            <YAxis
                              tick={{ fontSize: 11, fill: '#d4d4d8' }}
                              allowDecimals={false}
                              domain={[0, (dataMax: number) => Math.max(5, Math.ceil(dataMax * 1.15))]}
                            />
                            <Tooltip
                              cursor={{ fill: 'rgba(212, 175, 55, 0.08)', radius: 6 }}
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  return (
                                    <div className="bg-[#0c0a08]/95 backdrop-blur-xl border border-novera-gold/40 text-white p-3 rounded-xl shadow-2xl text-xs space-y-1.5 min-w-[170px]">
                                      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1">
                                        <span className="font-mono font-bold text-novera-gold text-[11px] bg-novera-gold/15 px-1.5 py-0.5 rounded">
                                          #{data.number}
                                        </span>
                                        <span className="text-[10px] uppercase font-semibold text-zinc-400">
                                          {data.category} Model
                                        </span>
                                      </div>
                                      <div className="font-serif font-bold text-white text-sm pt-0.5">
                                        {data.fullName}
                                      </div>
                                      <div className="flex items-baseline justify-between pt-1 text-zinc-300">
                                        <span>Votes:</span>
                                        <span className="font-mono text-base font-extrabold text-amber-300">
                                          {data.votes} votes
                                        </span>
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Bar dataKey="votes" radius={[6, 6, 0, 0]} maxBarSize={44}>
                              <LabelList
                                dataKey="votes"
                                position="top"
                                fill="#fef08a"
                                fontSize={11}
                                fontWeight={700}
                                formatter={(val: any) => (Number(val) > 0 ? `${val}` : '')}
                              />
                              {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Live Ranked Audience Leaderboard (Piliwelata Pahalata) */}
                <div className="p-6 sm:p-8 rounded-3xl bg-black/40 backdrop-blur-2xl border border-white/15 shadow-2xl text-white space-y-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-white/10 gap-4">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <Trophy className="w-5 h-5 text-novera-gold" />
                        <h3 className="font-serif text-xl sm:text-2xl font-bold text-white">
                          Live Audience Standings Leaderboard
                        </h3>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">
                        Full runway model standings ranked in order by total audience votes
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Category Filter */}
                      <div className="inline-flex p-1 rounded-xl bg-white/10 border border-white/15 text-xs">
                        <button
                          type="button"
                          onClick={() => setLeaderboardCategory('both')}
                          className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                            leaderboardCategory === 'both'
                              ? 'bg-gradient-to-r from-novera-gold to-amber-500 text-black font-extrabold shadow'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          All Categories
                        </button>
                        <button
                          type="button"
                          onClick={() => setLeaderboardCategory('boy')}
                          className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                            leaderboardCategory === 'boy'
                              ? 'bg-gradient-to-r from-novera-gold to-amber-500 text-black font-extrabold shadow'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          Boys ({boys.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setLeaderboardCategory('girl')}
                          className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                            leaderboardCategory === 'girl'
                              ? 'bg-gradient-to-r from-novera-gold to-amber-500 text-black font-extrabold shadow'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          Girls ({girls.length})
                        </button>
                      </div>

                      <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Live Standings
                      </span>
                    </div>
                  </div>

                  {/* Leaderboard Lists */}
                  {leaderboardCategory === 'both' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Boys Column */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-amber-400/20">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#d4af37]" />
                            <h4 className="font-serif text-base font-bold text-amber-200">
                              Male Models ({boys.length})
                            </h4>
                          </div>
                          <span className="text-xs font-mono text-zinc-400">
                            {totalBoyVotes} total votes
                          </span>
                        </div>
                        <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                          {boys.map((c, idx) => {
                            const isLeader = idx === 0 && (c.votes || 0) > 0;
                            const pct = totalBoyVotes > 0 ? Math.round(((c.votes || 0) / totalBoyVotes) * 100) : 0;
                            const barWidth = (boys[0]?.votes || 0) > 0 ? Math.max(3, Math.round(((c.votes || 0) / (boys[0]?.votes || 1)) * 100)) : 0;

                            return (
                              <div
                                key={c.id}
                                className={`p-3 sm:p-3.5 rounded-2xl border transition-all flex items-center gap-3 relative overflow-hidden ${
                                  isLeader
                                    ? 'bg-gradient-to-r from-amber-500/15 via-black/70 to-black/90 border-amber-400/60 shadow-[0_0_20px_rgba(212,175,55,0.2)]'
                                    : idx === 1 && (c.votes || 0) > 0
                                    ? 'bg-white/[0.05] border-white/20'
                                    : idx === 2 && (c.votes || 0) > 0
                                    ? 'bg-amber-950/20 border-amber-600/30'
                                    : 'bg-black/30 border-white/10 hover:border-white/20'
                                }`}
                              >
                                <div
                                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold font-mono text-xs ${
                                    idx === 0
                                      ? 'bg-gradient-to-br from-amber-300 to-amber-500 text-black shadow-sm font-black'
                                      : idx === 1
                                      ? 'bg-zinc-200 text-black font-bold'
                                      : idx === 2
                                      ? 'bg-amber-700 text-white font-bold'
                                      : 'bg-white/5 border border-white/10 text-zinc-400'
                                  }`}
                                >
                                  {idx === 0 ? <Crown className="w-4 h-4 fill-black" /> : `#${idx + 1}`}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-novera-gold/15 text-novera-gold border border-novera-gold/30">
                                      #{c.candidateNumber || c.id}
                                    </span>
                                    {isLeader && (
                                      <span className="text-[9px] uppercase font-bold text-amber-300 bg-amber-400/20 px-1.5 py-0.5 rounded-full border border-amber-400/40 animate-pulse">
                                        Leader
                                      </span>
                                    )}
                                  </div>
                                  <div className="font-serif font-bold text-white text-sm truncate">
                                    {c.name}
                                  </div>
                                  <div className="w-full bg-white/10 h-1.5 rounded-full mt-1.5 overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-200 transition-all duration-500"
                                      style={{ width: `${barWidth}%` }}
                                    />
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="font-mono text-base font-black text-amber-300">
                                    {c.votes || 0}
                                    <span className="text-[10px] font-normal text-zinc-400 ml-1">v</span>
                                  </div>
                                  <div className="text-[10px] text-zinc-400 font-mono">
                                    {pct}%
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Girls Column */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-amber-400/20">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                            <h4 className="font-serif text-base font-bold text-amber-200">
                              Female Models ({girls.length})
                            </h4>
                          </div>
                          <span className="text-xs font-mono text-zinc-400">
                            {totalGirlVotes} total votes
                          </span>
                        </div>
                        <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                          {girls.map((c, idx) => {
                            const isLeader = idx === 0 && (c.votes || 0) > 0;
                            const pct = totalGirlVotes > 0 ? Math.round(((c.votes || 0) / totalGirlVotes) * 100) : 0;
                            const barWidth = (girls[0]?.votes || 0) > 0 ? Math.max(3, Math.round(((c.votes || 0) / (girls[0]?.votes || 1)) * 100)) : 0;

                            return (
                              <div
                                key={c.id}
                                className={`p-3 sm:p-3.5 rounded-2xl border transition-all flex items-center gap-3 relative overflow-hidden ${
                                  isLeader
                                    ? 'bg-gradient-to-r from-amber-500/15 via-black/70 to-black/90 border-amber-400/60 shadow-[0_0_20px_rgba(212,175,55,0.2)]'
                                    : idx === 1 && (c.votes || 0) > 0
                                    ? 'bg-white/[0.05] border-white/20'
                                    : idx === 2 && (c.votes || 0) > 0
                                    ? 'bg-amber-950/20 border-amber-600/30'
                                    : 'bg-black/30 border-white/10 hover:border-white/20'
                                }`}
                              >
                                <div
                                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold font-mono text-xs ${
                                    idx === 0
                                      ? 'bg-gradient-to-br from-amber-300 to-amber-500 text-black shadow-sm font-black'
                                      : idx === 1
                                      ? 'bg-zinc-200 text-black font-bold'
                                      : idx === 2
                                      ? 'bg-amber-700 text-white font-bold'
                                      : 'bg-white/5 border border-white/10 text-zinc-400'
                                  }`}
                                >
                                  {idx === 0 ? <Crown className="w-4 h-4 fill-black" /> : `#${idx + 1}`}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                      #{c.candidateNumber || c.id}
                                    </span>
                                    {isLeader && (
                                      <span className="text-[9px] uppercase font-bold text-amber-300 bg-amber-400/20 px-1.5 py-0.5 rounded-full border border-amber-400/40 animate-pulse">
                                        Leader
                                      </span>
                                    )}
                                  </div>
                                  <div className="font-serif font-bold text-white text-sm truncate">
                                    {c.name}
                                  </div>
                                  <div className="w-full bg-white/10 h-1.5 rounded-full mt-1.5 overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-all duration-500"
                                      style={{ width: `${barWidth}%` }}
                                    />
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="font-mono text-base font-black text-amber-300">
                                    {c.votes || 0}
                                    <span className="text-[10px] font-normal text-zinc-400 ml-1">v</span>
                                  </div>
                                  <div className="text-[10px] text-zinc-400 font-mono">
                                    {pct}%
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : leaderboardCategory === 'boy' ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-amber-400/20">
                        <h4 className="font-serif text-base font-bold text-amber-200">
                          Male Models Leaderboard (Rank 1 to {boys.length})
                        </h4>
                        <span className="text-xs font-mono text-zinc-400">
                          {totalBoyVotes} total votes
                        </span>
                      </div>
                      <div className="space-y-2.5 max-h-[700px] overflow-y-auto pr-1">
                        {boys.map((c, idx) => {
                          const isLeader = idx === 0 && (c.votes || 0) > 0;
                          const pct = totalBoyVotes > 0 ? Math.round(((c.votes || 0) / totalBoyVotes) * 100) : 0;
                          const barWidth = (boys[0]?.votes || 0) > 0 ? Math.max(3, Math.round(((c.votes || 0) / (boys[0]?.votes || 1)) * 100)) : 0;

                          return (
                            <div
                              key={c.id}
                              className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex items-center gap-3 sm:gap-4 relative overflow-hidden ${
                                isLeader
                                  ? 'bg-gradient-to-r from-amber-500/15 via-black/70 to-black/90 border-amber-400/60 shadow-[0_0_20px_rgba(212,175,55,0.2)]'
                                  : idx === 1 && (c.votes || 0) > 0
                                  ? 'bg-white/[0.05] border-white/20'
                                  : idx === 2 && (c.votes || 0) > 0
                                  ? 'bg-amber-950/20 border-amber-600/30'
                                  : 'bg-black/30 border-white/10 hover:border-white/20'
                              }`}
                            >
                              <div
                                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 font-bold font-mono text-xs sm:text-sm ${
                                  idx === 0
                                    ? 'bg-gradient-to-br from-amber-300 to-amber-500 text-black shadow-sm font-black'
                                    : idx === 1
                                    ? 'bg-zinc-200 text-black font-bold'
                                    : idx === 2
                                    ? 'bg-amber-700 text-white font-bold'
                                    : 'bg-white/5 border border-white/10 text-zinc-400'
                                }`}
                              >
                                {idx === 0 ? <Crown className="w-5 h-5 fill-black" /> : `#${idx + 1}`}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-novera-gold/15 text-novera-gold border border-novera-gold/30">
                                    #{c.candidateNumber || c.id}
                                  </span>
                                  {isLeader && (
                                    <span className="text-[10px] uppercase font-bold text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded-full border border-amber-400/40 animate-pulse">
                                      Leader
                                    </span>
                                  )}
                                </div>
                                <div className="font-serif font-bold text-white text-sm sm:text-base truncate">
                                  {c.name}
                                </div>
                                <div className="w-full bg-white/10 h-2 rounded-full mt-2 overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-200 transition-all duration-500"
                                    style={{ width: `${barWidth}%` }}
                                  />
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="font-mono text-lg sm:text-xl font-black text-amber-300">
                                  {c.votes || 0}
                                  <span className="text-xs font-normal text-zinc-400 ml-1">votes</span>
                                </div>
                                <div className="text-[11px] text-zinc-400 font-mono">
                                  {pct}% share
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-amber-400/20">
                        <h4 className="font-serif text-base font-bold text-amber-200">
                          Female Models Leaderboard (Rank 1 to {girls.length})
                        </h4>
                        <span className="text-xs font-mono text-zinc-400">
                          {totalGirlVotes} total votes
                        </span>
                      </div>
                      <div className="space-y-2.5 max-h-[700px] overflow-y-auto pr-1">
                        {girls.map((c, idx) => {
                          const isLeader = idx === 0 && (c.votes || 0) > 0;
                          const pct = totalGirlVotes > 0 ? Math.round(((c.votes || 0) / totalGirlVotes) * 100) : 0;
                          const barWidth = (girls[0]?.votes || 0) > 0 ? Math.max(3, Math.round(((c.votes || 0) / (girls[0]?.votes || 1)) * 100)) : 0;

                          return (
                            <div
                              key={c.id}
                              className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex items-center gap-3 sm:gap-4 relative overflow-hidden ${
                                isLeader
                                  ? 'bg-gradient-to-r from-amber-500/15 via-black/70 to-black/90 border-amber-400/60 shadow-[0_0_20px_rgba(212,175,55,0.2)]'
                                  : idx === 1 && (c.votes || 0) > 0
                                  ? 'bg-white/[0.05] border-white/20'
                                  : idx === 2 && (c.votes || 0) > 0
                                  ? 'bg-amber-950/20 border-amber-600/30'
                                  : 'bg-black/30 border-white/10 hover:border-white/20'
                              }`}
                            >
                              <div
                                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 font-bold font-mono text-xs sm:text-sm ${
                                  idx === 0
                                    ? 'bg-gradient-to-br from-amber-300 to-amber-500 text-black shadow-sm font-black'
                                    : idx === 1
                                    ? 'bg-zinc-200 text-black font-bold'
                                    : idx === 2
                                    ? 'bg-amber-700 text-white font-bold'
                                    : 'bg-white/5 border border-white/10 text-zinc-400'
                                }`}
                              >
                                {idx === 0 ? <Crown className="w-5 h-5 fill-black" /> : `#${idx + 1}`}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                    #{c.candidateNumber || c.id}
                                  </span>
                                  {isLeader && (
                                    <span className="text-[10px] uppercase font-bold text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded-full border border-amber-400/40 animate-pulse">
                                      Leader
                                    </span>
                                  )}
                                </div>
                                <div className="font-serif font-bold text-white text-sm sm:text-base truncate">
                                  {c.name}
                                </div>
                                <div className="w-full bg-white/10 h-2 rounded-full mt-2 overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-all duration-500"
                                    style={{ width: `${barWidth}%` }}
                                  />
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="font-mono text-lg sm:text-xl font-black text-amber-300">
                                  {c.votes || 0}
                                  <span className="text-xs font-normal text-zinc-400 ml-1">votes</span>
                                </div>
                                <div className="text-[11px] text-zinc-400 font-mono">
                                  {pct}% share
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Admin Tools for Audience Votes */}
                <div className="p-6 rounded-2xl bg-black/40 backdrop-blur-2xl border border-white/15 shadow-xl flex flex-wrap items-center justify-between gap-4 text-white">
                  <div>
                    <h4 className="font-bold text-sm text-white">Audience Vote Management</h4>
                    <p className="text-xs text-zinc-400">Test or clear public votes before the live session</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleSimulateVotes}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 border border-white/15 text-white hover:bg-white/20 transition-all"
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                      <span>Simulate Demo Votes</span>
                    </button>
                    <button
                      onClick={handleResetVotes}
                      disabled={isResetting}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 transition-all"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Audience Votes</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ================= TAB 2: JUDGES' SCORES & AWARDS ================= */}
            {vaultTab === 'judges' && (
              <div className="space-y-8 animate-in fade-in duration-200">
                {/* 6 Official Judges Roster & Real-time Evaluation Status */}
                <div className="p-6 rounded-3xl bg-black/40 backdrop-blur-2xl border border-white/15 shadow-xl space-y-4 text-white">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/10 gap-2">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <ShieldCheck className="w-5 h-5 text-novera-gold" />
                        <h3 className="font-serif text-lg font-bold text-white">
                          8 Official Judges &bull; Live Telemetry &amp; Evaluation Audit
                        </h3>
                      </div>
                      <p className="text-[11px] text-zinc-300 mt-0.5">
                        Click any judge card below to view their individual scores, criteria breakdown, and remarks.
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-1.5 text-xs text-emerald-300 font-mono font-bold bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-500/40 self-start sm:self-auto">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span>LIVE TELEMETRY ACTIVE</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-3">
                    {OFFICIAL_JUDGE_ROSTER.map((judge) => {
                      const count = judgeScores.filter((s) => s.judgeId === judge.id).length;
                      return (
                        <button
                          key={judge.id}
                          type="button"
                          onClick={() => {
                            setSelectedAuditJudge(judge);
                            setAuditCategoryFilter('all');
                          }}
                          className={`p-3 rounded-2xl border text-center transition-all cursor-pointer hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] group relative overflow-hidden flex flex-col justify-between ${count > 0
                              ? 'bg-emerald-950/30 border-emerald-500/40 hover:border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                              : 'bg-white/5 border-white/10 hover:border-white/25'
                            }`}
                        >
                          <div>
                            <div className="w-8 h-8 rounded-full bg-novera-gold/20 text-novera-gold border border-novera-gold/30 text-xs font-bold mx-auto flex items-center justify-center mb-1.5 shadow-sm group-hover:bg-novera-gold group-hover:text-black transition-colors">
                              {judge.name[0]}
                            </div>
                            <div className="font-serif font-bold text-xs text-white truncate">
                              Judge {judge.name}
                            </div>
                            <div className="text-[10px] font-mono mt-1 font-semibold text-zinc-300">
                              {count} / {candidates.length} Scored
                            </div>
                            <div className="mt-1.5 flex items-center justify-center gap-1 text-[9px] font-bold uppercase tracking-wider">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${count > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'
                                  }`}
                              />
                              <span className={count > 0 ? 'text-emerald-300' : 'text-zinc-400'}>
                                {count > 0 ? 'Active' : 'Pending'}
                              </span>
                            </div>
                          </div>

                          <div className="mt-2.5 pt-1.5 border-t border-white/10 flex items-center justify-center gap-1 text-[9px] font-bold uppercase tracking-wider text-novera-gold group-hover:text-white transition-colors">
                            <Eye className="w-2.5 h-2.5" />
                            <span>View Scores</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sub-Tabs: 5 Jury Award Categories Alignment */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-novera-gold">
                        Official Award Marking Alignment
                      </span>
                      <h3 className="font-serif text-xl font-bold text-white">
                        Select Award Title Leaderboard
                      </h3>
                    </div>
                    <div className="text-xs text-zinc-300 font-medium">
                      {activeAwardDef.criteriaText}
                    </div>
                  </div>

                  {/* Award Selection Pills */}
                  <div className="flex flex-wrap gap-2">
                    {AWARD_DEFINITIONS.filter((a) => a.source === 'jury').map((award) => {
                      const Icon = award.icon;
                      const isSelected = selectedJuryAward === award.key;
                      return (
                        <button
                          key={award.key}
                          onClick={() => setSelectedJuryAward(award.key)}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${isSelected
                              ? 'bg-gradient-to-r from-novera-gold to-amber-500 text-black shadow-lg font-extrabold'
                              : 'bg-white/10 text-zinc-300 border border-white/15 hover:bg-white/20 hover:text-white'
                            }`}
                        >
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-black' : 'text-novera-gold'}`} />
                          <span>{award.title}</span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full ${isSelected ? 'bg-black/20 text-black font-mono' : 'bg-white/10 text-zinc-300'
                              }`}
                          >
                            /{award.maxScore}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Top Boy & Girl Leaders for Selected Award */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                  {isPrivacyMasked && (
                    <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-md rounded-3xl border border-novera-gold/30 p-6 flex flex-col items-center justify-center text-center space-y-3 shadow-2xl">
                      <div className="w-14 h-14 rounded-full bg-novera-gold/20 border border-novera-gold/40 flex items-center justify-center shadow-[0_0_20px_rgba(203,167,95,0.3)]">
                        <EyeOff className="w-7 h-7 text-novera-gold animate-pulse" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-serif text-lg font-bold text-white uppercase tracking-wider">
                          Judges Category Leaders Masked
                        </h4>
                        <p className="text-xs text-zinc-400 max-w-md">
                          Live average scores and leading candidates are confidential until revealed by the Admin.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsPrivacyMasked(false)}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-novera-gold to-amber-500 text-black font-extrabold text-xs uppercase tracking-wider hover:brightness-110 shadow-md transition-all flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Reveal Category Leaders</span>
                      </button>
                    </div>
                  )}

                  {/* Leading Boy */}
                  <div className="p-6 rounded-3xl bg-black/40 backdrop-blur-2xl border-2 border-novera-gold/40 shadow-xl flex items-center gap-5 text-white">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-novera-gold/30 to-amber-900/40 border-2 border-novera-gold text-novera-gold font-mono font-extrabold text-base sm:text-lg flex items-center justify-center shrink-0 shadow-lg">
                      {leadingBoyForAward?.candidate.candidateNumber || 'Boy'}
                    </div>
                    <div className="flex-grow">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-novera-gold/20 border border-novera-gold/30 text-[10px] font-bold uppercase tracking-wider text-novera-gold mb-1">
                        <Crown className="w-3 h-3" />
                        <span>Leading Boy &bull; {activeAwardDef.title}</span>
                      </div>
                      <h3 className="font-serif text-xl font-bold text-white">
                        {leadingBoyForAward?.candidate.name || 'N/A'}
                      </h3>
                      <div className="text-xs text-zinc-300 mt-1">
                        Average Score:{' '}
                        <strong className="text-novera-gold text-lg font-mono">
                          {leadingBoyForAward
                            ? getScoreValueForAward(leadingBoyForAward, selectedJuryAward).score
                            : 0}
                        </strong>{' '}
                        / {activeAwardDef.maxScore} ({leadingBoyForAward?.judgeCount || 0} judges scored)
                      </div>
                    </div>
                  </div>

                  {/* Leading Girl */}
                  <div className="p-6 rounded-3xl bg-black/40 backdrop-blur-2xl border-2 border-novera-gold/40 shadow-xl flex items-center gap-5 text-white">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-novera-gold/30 to-amber-900/40 border-2 border-novera-gold text-novera-gold font-mono font-extrabold text-base sm:text-lg flex items-center justify-center shrink-0 shadow-lg">
                      {leadingGirlForAward?.candidate.candidateNumber || 'Girl'}
                    </div>
                    <div className="flex-grow">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-novera-gold/20 border border-novera-gold/30 text-[10px] font-bold uppercase tracking-wider text-novera-gold mb-1">
                        <Crown className="w-3 h-3" />
                        <span>Leading Girl &bull; {activeAwardDef.title}</span>
                      </div>
                      <h3 className="font-serif text-xl font-bold text-white">
                        {leadingGirlForAward?.candidate.name || 'N/A'}
                      </h3>
                      <div className="text-xs text-zinc-300 mt-1">
                        Average Score:{' '}
                        <strong className="text-novera-gold text-lg font-mono">
                          {leadingGirlForAward
                            ? getScoreValueForAward(leadingGirlForAward, selectedJuryAward).score
                            : 0}
                        </strong>{' '}
                        / {activeAwardDef.maxScore} ({leadingGirlForAward?.judgeCount || 0} judges scored)
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detailed Ranked Table: Boys & Girls */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Boys Leaderboard */}
                  <div className="p-6 rounded-3xl bg-black/40 backdrop-blur-2xl border border-white/15 shadow-xl space-y-4 text-white">
                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                      <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                        <Crown className="w-4 h-4 text-novera-gold" />
                        <span>Male Contenders &bull; {activeAwardDef.title}</span>
                      </h3>
                      <span className="text-xs text-zinc-400">
                        Ranked by Score (Max {activeAwardDef.maxScore})
                      </span>
                    </div>

                    <div className="space-y-3">
                      {rankedBoysForAward.map((stat, idx) => {
                        const scoreObj = getScoreValueForAward(stat, selectedJuryAward);
                        return (
                          <div
                            key={stat.candidate.id}
                            className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3 text-white"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${idx === 0
                                    ? 'bg-gradient-to-r from-novera-gold to-amber-500 text-black font-extrabold'
                                    : 'bg-white/15 text-white'
                                  }`}
                              >
                                #{idx + 1}
                              </div>
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-novera-gold/20 to-amber-900/30 border border-novera-gold/40 text-novera-gold font-mono font-bold text-xs flex items-center justify-center shrink-0">
                                {stat.candidate.candidateNumber}
                              </div>
                              <div>
                                <div className="font-serif font-bold text-sm text-white">
                                  {stat.candidate.name}
                                </div>
                                <div className="text-[11px] text-zinc-400">
                                  {stat.candidate.candidateNumber} &bull; {stat.judgeCount} judge(s)
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="font-mono text-base font-bold text-novera-gold">
                                {scoreObj.score}{' '}
                                <span className="text-xs text-zinc-400 font-sans">
                                  / {activeAwardDef.maxScore}
                                </span>
                              </div>
                              <div className="text-[10px] text-zinc-400">
                                {stat.judgeCount > 0 ? 'Verified' : 'No marks yet'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Girls Leaderboard */}
                  <div className="p-6 rounded-3xl bg-black/40 backdrop-blur-2xl border border-white/15 shadow-xl space-y-4 text-white">
                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                      <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                        <Crown className="w-4 h-4 text-novera-gold" />
                        <span>Female Contenders &bull; {activeAwardDef.title}</span>
                      </h3>
                      <span className="text-xs text-zinc-400">
                        Ranked by Score (Max {activeAwardDef.maxScore})
                      </span>
                    </div>

                    <div className="space-y-3">
                      {rankedGirlsForAward.map((stat, idx) => {
                        const scoreObj = getScoreValueForAward(stat, selectedJuryAward);
                        return (
                          <div
                            key={stat.candidate.id}
                            className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3 text-white"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${idx === 0
                                    ? 'bg-gradient-to-r from-novera-gold to-amber-500 text-black font-extrabold'
                                    : 'bg-white/15 text-white'
                                  }`}
                              >
                                #{idx + 1}
                              </div>
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-novera-gold/20 to-amber-900/30 border border-novera-gold/40 text-novera-gold font-mono font-bold text-xs flex items-center justify-center shrink-0">
                                {stat.candidate.candidateNumber}
                              </div>
                              <div>
                                <div className="font-serif font-bold text-sm text-white">
                                  {stat.candidate.name}
                                </div>
                                <div className="text-[11px] text-zinc-400">
                                  {stat.candidate.candidateNumber} &bull; {stat.judgeCount} judge(s)
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="font-mono text-base font-bold text-novera-gold">
                                {scoreObj.score}{' '}
                                <span className="text-xs text-zinc-400 font-sans">
                                  / {activeAwardDef.maxScore}
                                </span>
                              </div>
                              <div className="text-[10px] text-zinc-400">
                                {stat.judgeCount > 0 ? 'Verified' : 'No marks yet'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Reset Judges Scores */}
                <div className="p-6 rounded-2xl bg-black/40 backdrop-blur-2xl border border-white/15 shadow-xl flex items-center justify-between text-white">
                  <div>
                    <h4 className="font-bold text-sm text-white">Reset Judge Scoring Data</h4>
                    <p className="text-xs text-zinc-400">
                      Clear all scorecards submitted by judges to begin a fresh round
                    </p>
                  </div>
                  <button
                    onClick={handleResetJudges}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 transition-all"
                  >
                    Reset All Judge Scores
                  </button>
                </div>
              </div>
            )}

            {/* ================= TAB 3: FINAL 6 TITLES SUMMARY ================= */}
            {vaultTab === 'summary' && (
              <div className="space-y-8 animate-in fade-in duration-200">
                <div className="text-center max-w-2xl mx-auto space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-novera-gold/20 border border-novera-gold/30 text-xs uppercase tracking-widest font-bold text-novera-gold">
                    <Trophy className="w-4 h-4 text-novera-gold" />
                    <span>Official Runway Award Announcement</span>
                  </div>
                  <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white">
                    NOVERA &rsquo;26 Winners Podium
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-300">
                    Consolidated announcement sheet for MCs and Organizing Committee (Girl &amp; Boy ranked separately)
                  </p>
                </div>

                {/* The 6 Official Award Titles Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
                  {isPrivacyMasked && (
                    <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-md rounded-3xl border border-novera-gold/30 p-8 flex flex-col items-center justify-center text-center space-y-4 shadow-2xl">
                      <div className="w-16 h-16 rounded-full bg-novera-gold/20 border border-novera-gold/40 flex items-center justify-center shadow-[0_0_25px_rgba(203,167,95,0.4)]">
                        <EyeOff className="w-8 h-8 text-novera-gold animate-pulse" />
                      </div>
                      <div className="space-y-1.5 max-w-md">
                        <h4 className="font-serif text-xl font-bold text-white uppercase tracking-wider">
                          Official Award Winners Shielded
                        </h4>
                        <p className="text-xs text-zinc-400">
                          Winners for all 6 titles are hidden for stage confidentiality. Unmask when ready to announce or certify.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsPrivacyMasked(false)}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-novera-gold to-amber-500 text-black font-extrabold text-xs uppercase tracking-wider hover:brightness-110 shadow-lg transition-all flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Reveal Winners Podium</span>
                      </button>
                    </div>
                  )}
                  {AWARD_DEFINITIONS.map((award, index) => {
                    const Icon = award.icon;
                    const rankedBoys = getRankedStats('boy', award.key);
                    const rankedGirls = getRankedStats('girl', award.key);
                    const winnerBoy = rankedBoys[0];
                    const winnerGirl = rankedGirls[0];

                    const boyScore = winnerBoy ? getScoreValueForAward(winnerBoy, award.key).score : 0;
                    const girlScore = winnerGirl ? getScoreValueForAward(winnerGirl, award.key).score : 0;

                    return (
                      <div
                        key={award.key}
                        className="p-6 sm:p-8 rounded-3xl bg-black/40 backdrop-blur-2xl border-2 border-white/15 hover:border-novera-gold/50 shadow-2xl space-y-6 flex flex-col justify-between text-white transition-all duration-300"
                      >
                        {/* Card Header */}
                        <div>
                          <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-2xl bg-novera-gold/20 border border-novera-gold/30 text-novera-gold flex items-center justify-center shrink-0 shadow-md">
                                <Icon className="w-6 h-6" />
                              </div>
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-novera-gold">
                                  Title #{index + 1} &bull; {award.source === 'jury' ? 'Official Judges Evaluation' : 'Public Web Ballot'}
                                </span>
                                <h3 className="font-serif text-xl sm:text-2xl font-bold text-white">
                                  {award.title}
                                </h3>
                              </div>
                            </div>
                            <span className="text-xs font-mono font-bold text-zinc-300 bg-white/10 px-2.5 py-1 rounded-full border border-white/15">
                              {award.source === 'jury' ? `Max ${award.maxScore}` : 'Public Votes'}
                            </span>
                          </div>

                          <p className="text-xs text-zinc-300 mb-5">
                            {award.criteriaText}
                          </p>

                          {/* Boy & Girl Winner Cards */}
                          <div className="space-y-4">
                            {/* Boy Winner */}
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-4 text-white">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-novera-gold/30 to-amber-900/40 border border-novera-gold text-novera-gold font-mono font-extrabold text-sm flex items-center justify-center shrink-0 shadow-md">
                                  {winnerBoy?.candidate.candidateNumber || 'Boy'}
                                </div>
                                <div>
                                  <span className="text-[10px] uppercase font-bold text-novera-gold tracking-wider flex items-center gap-1">
                                    <Crown className="w-3 h-3" />
                                    <span>Male Winner (Boy)</span>
                                  </span>
                                  <h4 className="font-serif text-base font-bold text-white">
                                    {winnerBoy?.candidate.name || 'To Be Announced'}
                                  </h4>
                                  <span className="text-[11px] text-zinc-400">
                                    Candidate No: {winnerBoy?.candidate.candidateNumber || 'N/A'}
                                  </span>
                                </div>
                              </div>

                              <div className="text-right">
                                <div className="font-mono text-lg font-bold text-novera-gold">
                                  {boyScore}
                                  {award.maxScore > 0 && (
                                    <span className="text-xs text-zinc-400 font-sans">
                                      /{award.maxScore}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-zinc-400">
                                  {award.source === 'jury'
                                    ? `${winnerBoy?.judgeCount || 0} judges`
                                    : 'audience votes'}
                                </div>
                              </div>
                            </div>

                            {/* Girl Winner */}
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-4 text-white">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-novera-gold/30 to-amber-900/40 border border-novera-gold text-novera-gold font-mono font-extrabold text-sm flex items-center justify-center shrink-0 shadow-md">
                                  {winnerGirl?.candidate.candidateNumber || 'Girl'}
                                </div>
                                <div>
                                  <span className="text-[10px] uppercase font-bold text-novera-gold tracking-wider flex items-center gap-1">
                                    <Crown className="w-3 h-3" />
                                    <span>Female Winner (Girl)</span>
                                  </span>
                                  <h4 className="font-serif text-base font-bold text-white">
                                    {winnerGirl?.candidate.name || 'To Be Announced'}
                                  </h4>
                                  <span className="text-[11px] text-zinc-400">
                                    Candidate No: {winnerGirl?.candidate.candidateNumber || 'N/A'}
                                  </span>
                                </div>
                              </div>

                              <div className="text-right">
                                <div className="font-mono text-lg font-bold text-novera-gold">
                                  {girlScore}
                                  {award.maxScore > 0 && (
                                    <span className="text-xs text-zinc-400 font-sans">
                                      /{award.maxScore}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-zinc-400">
                                  {award.source === 'jury'
                                    ? `${winnerGirl?.judgeCount || 0} judges`
                                    : 'audience votes'}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 text-[11px] text-zinc-400 flex items-center justify-between border-t border-white/10">
                          <span>Ranked separately for Girl and Boy</span>
                          <span className="font-bold text-novera-gold uppercase">NOVERA &rsquo;26 OFFICIAL</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= JUDGE SCORECARD AUDIT MODAL ================= */}
        {selectedAuditJudge && (
          <div
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl overflow-y-auto p-3 sm:p-6"
            onClick={() => setSelectedAuditJudge(null)}
          >
            <RunwayStageBackground contained className="opacity-90 pointer-events-none" />
            <div className="min-h-full flex items-center justify-center py-2 sm:py-4">
              <div
                className="max-w-3xl w-full bg-[#0c0a08]/95 backdrop-blur-3xl rounded-2xl sm:rounded-3xl p-3.5 sm:p-7 border border-white/20 shadow-2xl relative z-10 animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden text-left text-white max-h-[92dvh] sm:max-h-[calc(100dvh-2rem)]"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-start justify-between pb-3 sm:pb-4 border-b border-white/10 shrink-0 gap-2">
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-novera-gold/20 text-novera-gold border border-novera-gold/30 text-base sm:text-lg font-serif font-bold flex items-center justify-center shadow-md shrink-0">
                      {selectedAuditJudge.name[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[9px] sm:text-[10px] font-mono uppercase tracking-widest text-novera-gold font-bold truncate">
                        Official Judges Evaluation Audit
                      </div>
                      <h3 className="font-serif text-lg sm:text-2xl font-bold text-white truncate">
                        Judge {selectedAuditJudge.name}
                      </h3>
                      <div className="text-[11px] sm:text-xs text-zinc-300 font-medium truncate">
                        {selectedAuditJudge.title}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedAuditJudge(null)}
                    className="px-3 sm:px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-rose-500/20 active:scale-95 text-zinc-300 hover:text-rose-200 border border-white/20 hover:border-rose-400/40 flex items-center gap-1.5 text-xs font-semibold tracking-wide transition-all shadow-sm shrink-0 cursor-pointer group"
                    title="Close Audit View"
                  >
                    <X className="w-3.5 h-3.5 text-zinc-400 group-hover:text-rose-300 transition-colors" strokeWidth={2.5} />
                    <span>Close</span>
                  </button>
                </div>

                {/* Filter & Progress Summary Bar (Clean Flex Wrap without overlapping) */}
                <div className="py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 border-b border-white/10 pb-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] sm:text-xs font-semibold text-zinc-300 shrink-0">Category:</span>
                      <div className="inline-flex items-center p-1 rounded-xl bg-white/10 border border-white/10 gap-0.5">
                        <button
                          type="button"
                          onClick={() => setAuditCategoryFilter('all')}
                          className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold uppercase transition-all whitespace-nowrap cursor-pointer ${auditCategoryFilter === 'all'
                              ? 'bg-gradient-to-r from-novera-gold to-amber-500 text-black font-extrabold shadow-sm'
                              : 'text-zinc-400 hover:text-white'
                            }`}
                        >
                          All ({candidates.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setAuditCategoryFilter('boy')}
                          className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold uppercase transition-all whitespace-nowrap cursor-pointer ${auditCategoryFilter === 'boy'
                              ? 'bg-gradient-to-r from-novera-gold to-amber-500 text-black font-extrabold shadow-sm'
                              : 'text-zinc-400 hover:text-white'
                            }`}
                        >
                          Boys ({candidates.filter((c) => c.category === 'boy').length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setAuditCategoryFilter('girl')}
                          className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold uppercase transition-all whitespace-nowrap cursor-pointer ${auditCategoryFilter === 'girl'
                              ? 'bg-gradient-to-r from-novera-gold to-amber-500 text-black font-extrabold shadow-sm'
                              : 'text-zinc-400 hover:text-white'
                            }`}
                        >
                          Girls ({candidates.filter((c) => c.category === 'girl').length})
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] sm:text-xs font-semibold text-zinc-300 shrink-0">Status:</span>
                      <div className="inline-flex items-center p-1 rounded-xl bg-white/10 border border-white/10 gap-0.5">
                        <button
                          type="button"
                          onClick={() => setAuditStatusFilter('all')}
                          className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold uppercase transition-all whitespace-nowrap cursor-pointer ${auditStatusFilter === 'all'
                              ? 'bg-white/20 text-white font-extrabold shadow-sm'
                              : 'text-zinc-400 hover:text-white'
                            }`}
                        >
                          All
                        </button>
                        <button
                          type="button"
                          onClick={() => setAuditStatusFilter('scored')}
                          className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold uppercase transition-all whitespace-nowrap cursor-pointer ${auditStatusFilter === 'scored'
                              ? 'bg-emerald-500 text-black font-extrabold shadow-sm'
                              : 'text-zinc-400 hover:text-emerald-400'
                            }`}
                        >
                          Scored ({judgeScores.filter((s) => s.judgeId === selectedAuditJudge.id).length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setAuditStatusFilter('pending')}
                          className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold uppercase transition-all whitespace-nowrap cursor-pointer ${auditStatusFilter === 'pending'
                              ? 'bg-amber-500 text-black font-extrabold shadow-sm'
                              : 'text-zinc-400 hover:text-amber-400'
                            }`}
                        >
                          Pending ({candidates.length - judgeScores.filter((s) => s.judgeId === selectedAuditJudge.id).length})
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Completion Tag */}
                  <div className="text-[11px] sm:text-xs font-mono font-semibold text-zinc-300 flex items-center gap-2 shrink-0">
                    <span>Progress:</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 font-bold border border-emerald-500/40">
                      {judgeScores.filter((s) => s.judgeId === selectedAuditJudge.id).length} / {candidates.length} Scored
                    </span>
                  </div>
                </div>

                {/* Scrollable Candidates Score Cards List */}
                <div className="flex-1 min-h-0 overflow-y-auto novera-scrollbar space-y-3.5 pr-1">
                {candidates
                  .filter((c) => auditCategoryFilter === 'all' || c.category === auditCategoryFilter)
                  .filter((c) => {
                    if (auditStatusFilter === 'all') return true;
                    const isScored = judgeScores.some((s) => s.judgeId === selectedAuditJudge.id && s.candidateId === c.id);
                    return auditStatusFilter === 'scored' ? isScored : !isScored;
                  })
                  .map((candidate) => {
                    const score = judgeScores.find(
                      (s) => s.judgeId === selectedAuditJudge.id && s.candidateId === candidate.id
                    );

                    const modelTotal = score
                      ? (score.totalModel ?? (Number(score.walking || 0) + Number(score.confidence || 0) + Number(score.stage || 0) + Number(score.posture || 0) + Number(score.poses || 0) + Number(score.face || 0)))
                      : 0;

                    const designTotal = score
                      ? (score.totalDesign ?? (Number(score.designCreativity || 0) + Number(score.designCraftsmanship || 0) + Number(score.designTheme || 0) + Number(score.designFit || 0) + Number(score.designImpact || 0)))
                      : 0;

                    return (
                      <div
                        key={candidate.id}
                        className={`p-4 rounded-2xl border transition-all ${score
                            ? 'bg-black/60 border-emerald-500/40 shadow-sm text-white'
                            : 'bg-white/5 border-white/10 opacity-70 text-zinc-300'
                          }`}
                      >
                        {/* Candidate Row Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-novera-gold/20 to-amber-900/30 border border-novera-gold/40 text-novera-gold font-mono font-bold text-xs flex items-center justify-center shrink-0">
                              {candidate.candidateNumber}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-md bg-white/10 text-novera-gold font-mono font-bold text-xs border border-white/15">
                                  {candidate.candidateNumber}
                                </span>
                                <span className="text-[10px] uppercase font-bold text-novera-gold">
                                  {candidate.category === 'boy' ? 'Male Model' : 'Female Model'}
                                </span>
                              </div>
                              <h4 className="font-serif font-bold text-base text-white pt-0.5">
                                {candidate.name}
                              </h4>
                            </div>
                          </div>

                          {/* Both Scores Badges: Model Runway & Student Design */}
                          <div className="shrink-0">
                            {score ? (
                              <div className="flex items-center gap-2">
                                <div className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-right">
                                  <div className="text-[9px] uppercase tracking-wider text-novera-gold font-bold">
                                    Model Runway
                                  </div>
                                  <div className="font-mono text-lg font-bold text-white leading-tight">
                                    {modelTotal} <span className="text-[10px] text-zinc-400 font-sans">/ 100</span>
                                  </div>
                                </div>
                                <div className="px-3 py-1.5 rounded-xl bg-purple-500/15 border border-purple-500/40 text-right">
                                  <div className="text-[9px] uppercase tracking-wider text-purple-300 font-bold">
                                    Student Design
                                  </div>
                                  <div className="font-mono text-lg font-bold text-white leading-tight">
                                    {designTotal} <span className="text-[10px] text-zinc-400 font-sans">/ 100</span>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <span className="px-3 py-1 rounded-full bg-white/10 text-zinc-400 text-xs font-mono font-semibold border border-white/10">
                                Pending Evaluation
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Full Detailed Criteria Markings (If Scored) */}
                        {score && (
                          <div className="pt-3 space-y-3">
                            {/* 1. Official Model Runway Markings */}
                            <div className="p-3 rounded-2xl bg-white/[0.03] border border-amber-500/25 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                                  <Crown className="w-3.5 h-3.5 text-novera-gold" />
                                  <span>1. Model Runway Markings ({modelTotal} / 100)</span>
                                </div>
                                <span className="text-[10px] font-mono text-zinc-400">Award: Top Model</span>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center text-xs">
                                <div className="p-2 rounded-xl bg-white/5 border border-white/10 shadow-xs">
                                  <span className="text-[10px] text-zinc-400 font-semibold block">Walking</span>
                                  <strong className="font-mono text-sm text-white">{score.walking ?? 0} / 20</strong>
                                </div>
                                <div className="p-2 rounded-xl bg-white/5 border border-white/10 shadow-xs">
                                  <span className="text-[10px] text-zinc-400 font-semibold block">Confidence</span>
                                  <strong className="font-mono text-sm text-white">{score.confidence ?? 0} / 20</strong>
                                </div>
                                <div className="p-2 rounded-xl bg-white/5 border border-white/10 shadow-xs">
                                  <span className="text-[10px] text-zinc-400 font-semibold block">Stage Pres.</span>
                                  <strong className="font-mono text-sm text-white">{score.stage ?? 0} / 20</strong>
                                </div>
                                <div className="p-2 rounded-xl bg-white/5 border border-white/10 shadow-xs">
                                  <span className="text-[10px] text-zinc-400 font-semibold block">Posture</span>
                                  <strong className="font-mono text-sm text-white">{score.posture ?? 0} / 15</strong>
                                </div>
                                <div className="p-2 rounded-xl bg-white/5 border border-white/10 shadow-xs">
                                  <span className="text-[10px] text-zinc-400 font-semibold block">Poses</span>
                                  <strong className="font-mono text-sm text-white">{score.poses ?? 0} / 15</strong>
                                </div>
                                <div className="p-2 rounded-xl bg-white/5 border border-white/10 shadow-xs">
                                  <span className="text-[10px] text-zinc-400 font-semibold block">Face</span>
                                  <strong className="font-mono text-sm text-white">{score.face ?? 0} / 10</strong>
                                </div>
                              </div>

                              {/* Sub-award totals summary */}
                              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
                                <div className="flex items-center gap-1.5">
                                  <Star className="w-3.5 h-3.5 text-amber-400" />
                                  <span className="text-zinc-300">Personality:</span>
                                  <strong className="font-mono text-white">{score.personalityScore ?? ((score.confidence || 0) + (score.stage || 0) + (score.face || 0))}/50</strong>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                                  <span className="text-zinc-300">Stage Impact:</span>
                                  <strong className="font-mono text-white">{score.stagePresenceScore ?? (Math.min(10, Math.round((score.confidence || 0) / 2)) + (score.stage || 0))}/30</strong>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Camera className="w-3.5 h-3.5 text-amber-400" />
                                  <span className="text-zinc-300">Photogenic:</span>
                                  <strong className="font-mono text-white">{score.photogenicScore ?? ((score.posture || 0) + (score.poses || 0) + (score.face || 0))}/40</strong>
                                </div>
                              </div>
                            </div>

                            {/* 2. Official Student Design Markings */}
                            <div className="p-3 rounded-2xl bg-white/[0.03] border border-purple-500/25 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-purple-300">
                                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                                  <span>2. Student Design Markings ({designTotal} / 100)</span>
                                </div>
                                <span className="text-[10px] font-mono text-zinc-400">Award: Best Design (Students)</span>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-center text-xs">
                                <div className="p-2 rounded-xl bg-white/5 border border-white/10 shadow-xs">
                                  <span className="text-[10px] text-zinc-400 font-semibold block">Creativity</span>
                                  <strong className="font-mono text-sm text-purple-200">{score.designCreativity ?? 0} / 30</strong>
                                </div>
                                <div className="p-2 rounded-xl bg-white/5 border border-white/10 shadow-xs">
                                  <span className="text-[10px] text-zinc-400 font-semibold block">Craftsmanship</span>
                                  <strong className="font-mono text-sm text-purple-200">{score.designCraftsmanship ?? 0} / 25</strong>
                                </div>
                                <div className="p-2 rounded-xl bg-white/5 border border-white/10 shadow-xs">
                                  <span className="text-[10px] text-zinc-400 font-semibold block">Theme Relevance</span>
                                  <strong className="font-mono text-sm text-purple-200">{score.designTheme ?? 0} / 20</strong>
                                </div>
                                <div className="p-2 rounded-xl bg-white/5 border border-white/10 shadow-xs">
                                  <span className="text-[10px] text-zinc-400 font-semibold block">Fit &amp; Styling</span>
                                  <strong className="font-mono text-sm text-purple-200">{score.designFit ?? 0} / 15</strong>
                                </div>
                                <div className="p-2 rounded-xl bg-white/5 border border-white/10 shadow-xs">
                                  <span className="text-[10px] text-zinc-400 font-semibold block">Overall Impact</span>
                                  <strong className="font-mono text-sm text-purple-200">{score.designImpact ?? 0} / 10</strong>
                                </div>
                              </div>
                            </div>

                            {/* 3. Confidential Notes */}
                            {score.notes && (
                              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-zinc-300 italic flex items-start gap-2">
                                <MessageSquare className="w-3.5 h-3.5 text-novera-gold shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-semibold text-white not-italic">Judge Remark: </span>
                                  &ldquo;{score.notes}&rdquo;
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>

              {/* Modal Footer */}
              <div className="pt-3 pb-safe border-t border-white/10 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedAuditJudge(null)}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-novera-gold to-amber-500 text-black font-extrabold hover:brightness-110 active:scale-95 text-xs uppercase tracking-wider transition-all shadow-sm text-center cursor-pointer"
                >
                  Close Audit View
                </button>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* ================= HAUTE COUTURE CONFIRMATION MODAL (USER-FRIENDLY REPLACEMENT FOR BROWSER ALERTS) ================= */}
        {confirmModal && confirmModal.isOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl overflow-y-auto p-3 sm:p-6"
            onClick={() => setConfirmModal(null)}
          >
            <RunwayStageBackground contained className="opacity-75 pointer-events-none" />
            <div className="min-h-full flex items-center justify-center py-4">
              <div
                className="relative z-10 w-full max-w-md bg-[#0e0c0a]/95 border border-amber-500/30 rounded-3xl p-6 sm:p-7 shadow-[0_0_60px_rgba(0,0,0,0.95),0_0_30px_rgba(203,167,95,0.15)] text-center text-white space-y-5 animate-in zoom-in-95 duration-200 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Subtle Ambient Radial Glow */}
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-28 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />

                {/* Close (X) button */}
                <button
                type="button"
                onClick={() => setConfirmModal(null)}
                disabled={isResetting}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors disabled:opacity-40"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Glowing Alert Emblem */}
              <div className="relative w-16 h-16 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shadow-[0_0_25px_rgba(244,63,94,0.25)]">
                <AlertTriangle className="w-8 h-8 text-rose-400 animate-pulse" />
              </div>

              {/* Header Texts */}
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-[10px] font-mono uppercase tracking-widest text-rose-300 font-bold">
                  <ShieldCheck className="w-3 h-3 text-rose-400" />
                  <span>{confirmModal.subtitle}</span>
                </div>
                <h3 className="font-serif text-2xl font-bold text-white pt-1">
                  {confirmModal.title}
                </h3>
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed pt-1">
                  {confirmModal.description}
                </p>
              </div>

              {/* Safety warning badge */}
              {confirmModal.warningNote && (
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-left text-[11px] text-zinc-400 flex items-center gap-2.5">
                  <RotateCcw className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{confirmModal.warningNote}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  disabled={isResetting}
                  onClick={() => setConfirmModal(null)}
                  className="py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold bg-white/5 border border-white/15 text-zinc-300 hover:text-white hover:bg-white/10 transition-all active:scale-95 disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isResetting}
                  onClick={confirmModal.onConfirm}
                  className="py-3 px-4 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-rose-600 via-rose-500 to-rose-700 hover:brightness-110 text-white shadow-[0_0_25px_rgba(225,29,72,0.45)] transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60"
                >
                  {isResetting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Resetting...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      <span>{confirmModal.confirmLabel}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* ================= ELEGANT FLOATING TOAST FEEDBACK ================= */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="px-5 py-3 rounded-2xl bg-[#0f0d0b]/95 backdrop-blur-2xl border border-amber-500/40 text-white shadow-[0_0_30px_rgba(203,167,95,0.25)] flex items-center gap-3 text-xs sm:text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-medium text-zinc-100">{toastMessage.text}</span>
            </div>
          </div>
        )}
        {/* ================= 🌟 INTERACTIVE LUXURY PDF & MC CUE SHEET STUDIO MODAL ================= */}
        {showPdfStudio && (
          <div
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl overflow-y-auto p-3 sm:p-6 animate-in fade-in duration-200"
            onClick={() => setShowPdfStudio(false)}
          >
            <RunwayStageBackground contained className="opacity-80 pointer-events-none" />
            <div className="min-h-full flex items-center justify-center py-4">
              <div
                className="relative z-10 w-full max-w-5xl bg-[#0e0c0a]/98 border border-amber-500/40 rounded-3xl p-5 sm:p-8 shadow-[0_0_90px_rgba(0,0,0,0.95),0_0_50px_rgba(203,167,95,0.2)] text-white space-y-6 animate-in zoom-in-95 duration-200 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Gold Top Light Sweep */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-300 to-transparent animate-scan-sweep" />

                {/* Modal Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/10 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-600/30 border border-amber-400/50 flex items-center justify-center text-amber-300 shadow-[0_0_20px_rgba(212,175,55,0.3)] shrink-0">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-serif text-xl sm:text-2xl font-bold text-white tracking-wide">
                          Official PDF &amp; Document Studio
                        </h3>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          Live Ledger
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Interactive Grand Finale Awards Dossier &bull; MC Announcement Cues &bull; Certified Telemetry
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => setShowPdfStudio(false)}
                      className="p-2 rounded-xl text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                      title="Close Studio"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Control Panel: Tabs, Toggles, and Quick Actions */}
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {/* Document Selector Tabs */}
                    <div className="inline-flex p-1 rounded-xl bg-black/50 border border-white/15 text-xs">
                      <button
                        type="button"
                        onClick={() => setPdfDocumentTab('mc_cues')}
                        className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                          pdfDocumentTab === 'mc_cues'
                            ? 'bg-gradient-to-r from-novera-gold to-amber-500 text-black font-extrabold shadow'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        🎙️ MC Stage Cue Sheet
                      </button>
                      <button
                        type="button"
                        onClick={() => setPdfDocumentTab('championship')}
                        className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                          pdfDocumentTab === 'championship'
                            ? 'bg-gradient-to-r from-novera-gold to-amber-500 text-black font-extrabold shadow'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        👑 Championship Dossier
                      </button>
                      <button
                        type="button"
                        onClick={() => setPdfDocumentTab('audience')}
                        className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                          pdfDocumentTab === 'audience'
                            ? 'bg-gradient-to-r from-novera-gold to-amber-500 text-black font-extrabold shadow'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        👥 Audience Voting Ledger
                      </button>
                      <button
                        type="button"
                        onClick={() => setPdfDocumentTab('all')}
                        className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                          pdfDocumentTab === 'all'
                            ? 'bg-gradient-to-r from-novera-gold to-amber-500 text-black font-extrabold shadow'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        📜 Complete Official Report
                      </button>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyMcScript}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-zinc-200 border border-white/15 transition-all shadow-sm cursor-pointer"
                        title="Copy formatted text script for MCs / WhatsApp"
                      >
                        {isCopiedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-300" />}
                        <span>{isCopiedScript ? 'Copied!' : 'Copy Script'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleExportCSV}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-zinc-200 border border-white/15 transition-all shadow-sm cursor-pointer"
                        title="Download verified spreadsheet"
                      >
                        <Download className="w-3.5 h-3.5 text-amber-300" />
                        <span>Export CSV</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-novera-gold via-amber-300 to-amber-500 text-black hover:brightness-110 transition-all shadow-[0_0_20px_rgba(212,175,55,0.4)] cursor-pointer"
                        title="Print or Save as PDF"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print / Save as PDF</span>
                      </button>
                    </div>
                  </div>

                  {/* Interactive Options Toggles */}
                  <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-white/10 text-xs text-zinc-300">
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={pdfIncludeScripts}
                        onChange={(e) => setPdfIncludeScripts(e.target.checked)}
                        className="rounded border-zinc-600 text-amber-500 focus:ring-0 w-4 h-4 cursor-pointer"
                      />
                      <span>Include MC Host Announcement Dialogue</span>
                    </label>

                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={pdfIncludeRunnerUps}
                        onChange={(e) => setPdfIncludeRunnerUps(e.target.checked)}
                        className="rounded border-zinc-600 text-amber-500 focus:ring-0 w-4 h-4 cursor-pointer"
                      />
                      <span>Include 1st &amp; 2nd Runner-Ups</span>
                    </label>

                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={pdfIncludeSignatures}
                        onChange={(e) => setPdfIncludeSignatures(e.target.checked)}
                        className="rounded border-zinc-600 text-amber-500 focus:ring-0 w-4 h-4 cursor-pointer"
                      />
                      <span>Include Official Sign-off &amp; Seals</span>
                    </label>
                  </div>
                </div>

                {/* 📄 LIVE INTERACTIVE A4 DOCUMENT PREVIEW CANVAS */}
                <div className="p-2 sm:p-6 bg-zinc-950/90 rounded-2xl border border-white/10 max-h-[60vh] overflow-y-auto">
                  <div className="max-w-3xl mx-auto bg-white text-zinc-900 p-6 sm:p-10 rounded-xl shadow-2xl border-4 border-[#b3924f]/40 font-sans space-y-6 relative">
                    {/* Luxury Watermark */}
                    <div className="absolute top-6 right-6 pointer-events-none opacity-5">
                      <Crown className="w-48 h-48 text-amber-900" />
                    </div>

                    {/* Official Document Letterhead */}
                    <div className="border-b-2 border-zinc-900 pb-4 text-center space-y-1 relative">
                      <div className="text-[10px] uppercase tracking-[0.25em] font-extrabold text-amber-800">
                        AIESEC IN CINEC &bull; CENTRAL TABULATION BUREAU
                      </div>
                      <h1 className="text-2xl sm:text-3xl font-serif font-black uppercase tracking-tight text-zinc-900">
                        NOVERA &rsquo;26 &bull; OFFICIAL AWARDS DOSSIER
                      </h1>
                      <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-zinc-600 font-mono pt-1">
                        <span>Doc Ref: <strong className="text-zinc-900">NOV26-AUDIT-{new Date().getFullYear()}</strong></span>
                        <span>&bull;</span>
                        <span>Certified: {new Date().toLocaleDateString()}</span>
                        <span>&bull;</span>
                        <span className="text-emerald-700 font-bold uppercase">&bull; Sealed Official</span>
                      </div>
                    </div>

                    {/* DOCUMENT BODY ACCORDING TO TAB */}
                    {(pdfDocumentTab === 'mc_cues' || pdfDocumentTab === 'all') && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-zinc-300 pb-1">
                          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-700 font-mono">
                            Part 1: Official Award Titles &amp; Stage Cues
                          </h2>
                          <span className="text-[10px] text-zinc-500 font-mono">6 Official Titles</span>
                        </div>

                        <div className="space-y-3.5">
                          {AWARD_DEFINITIONS.map((award, idx) => {
                            const rankedBoys = getRankedStats('boy', award.key);
                            const rankedGirls = getRankedStats('girl', award.key);
                            const winnerBoy = rankedBoys[0];
                            const winnerGirl = rankedGirls[0];
                            const runnerBoy = rankedBoys[1];
                            const runnerGirl = rankedGirls[1];
                            const boyScore = winnerBoy ? getScoreValueForAward(winnerBoy, award.key).score : 0;
                            const girlScore = winnerGirl ? getScoreValueForAward(winnerGirl, award.key).score : 0;

                            return (
                              <div key={award.key} className="border border-zinc-300 rounded-xl p-4 bg-zinc-50/70 space-y-3">
                                <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-amber-400/30 text-amber-900 font-black text-[11px] flex items-center justify-center font-mono">
                                      {idx + 1}
                                    </span>
                                    <div>
                                      <h3 className="font-serif text-base font-black uppercase text-zinc-900">
                                        {award.title}
                                      </h3>
                                      <span className="text-[10px] text-zinc-500 font-mono">
                                        Criteria: {award.criteriaText}
                                      </span>
                                    </div>
                                  </div>
                                  <span className="text-[11px] font-mono font-bold bg-white px-2.5 py-0.5 rounded border border-zinc-300 shadow-sm text-zinc-800">
                                    {award.source === 'jury' ? `Max Score: ${award.maxScore}` : 'Public Votes'}
                                  </span>
                                </div>

                                {/* Winner Podiums */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {/* Male Winner */}
                                  <div className="p-3 bg-white rounded-lg border-2 border-amber-500/30 shadow-sm space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                                        👔 Male Winner (Boy)
                                      </span>
                                      <span className="text-xs font-mono font-black text-amber-600">
                                        {boyScore} {award.source === 'jury' ? 'pts' : 'votes'}
                                      </span>
                                    </div>
                                    <div className="font-serif text-base font-bold text-zinc-900">
                                      {winnerBoy?.candidate.name || 'To Be Announced'}
                                    </div>
                                    <div className="text-[11px] text-zinc-600 font-mono">
                                      Contender #{winnerBoy?.candidate.candidateNumber || 'N/A'}
                                    </div>
                                    {pdfIncludeRunnerUps && runnerBoy && (
                                      <div className="text-[10px] text-zinc-500 pt-1 border-t border-zinc-100 font-mono">
                                        Runner-Up: #{runnerBoy.candidate.candidateNumber} {runnerBoy.candidate.name} ({getScoreValueForAward(runnerBoy, award.key).score})
                                      </div>
                                    )}
                                  </div>

                                  {/* Female Winner */}
                                  <div className="p-3 bg-white rounded-lg border-2 border-amber-500/30 shadow-sm space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                                        👗 Female Winner (Girl)
                                      </span>
                                      <span className="text-xs font-mono font-black text-amber-600">
                                        {girlScore} {award.source === 'jury' ? 'pts' : 'votes'}
                                      </span>
                                    </div>
                                    <div className="font-serif text-base font-bold text-zinc-900">
                                      {winnerGirl?.candidate.name || 'To Be Announced'}
                                    </div>
                                    <div className="text-[11px] text-zinc-600 font-mono">
                                      Contender #{winnerGirl?.candidate.candidateNumber || 'N/A'}
                                    </div>
                                    {pdfIncludeRunnerUps && runnerGirl && (
                                      <div className="text-[10px] text-zinc-500 pt-1 border-t border-zinc-100 font-mono">
                                        Runner-Up: #{runnerGirl.candidate.candidateNumber} {runnerGirl.candidate.name} ({getScoreValueForAward(runnerGirl, award.key).score})
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Host Cue Box */}
                                {pdfIncludeScripts && (
                                  <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-300 text-xs text-amber-950 font-serif italic leading-relaxed">
                                    &ldquo;Ladies and Gentlemen, for the title of <strong>{award.title}</strong>, the winner for Male Model is Candidate <strong>#{winnerBoy?.candidate.candidateNumber} - {winnerBoy?.candidate.name}</strong>, and for Female Model is Candidate <strong>#{winnerGirl?.candidate.candidateNumber} - {winnerGirl?.candidate.name}</strong>!&rdquo;
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* AUDIENCE LEDGER TAB CONTENT */}
                    {(pdfDocumentTab === 'audience' || pdfDocumentTab === 'all') && (
                      <div className="space-y-4 pt-2">
                        <div className="flex items-center justify-between border-b border-zinc-300 pb-1">
                          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-700 font-mono">
                            Part 2: Certified Audience Popular Vote Standings
                          </h2>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {totalOverallVotes} Total Verified Ballots
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Boys Standings */}
                          <div className="space-y-2 border border-zinc-300 rounded-lg p-3 bg-zinc-50">
                            <h3 className="text-xs font-bold uppercase text-amber-800 font-mono">
                              Male Models ({totalBoyVotes} votes)
                            </h3>
                            <div className="space-y-1.5 text-xs">
                              {boys.slice(0, 7).map((c, idx) => (
                                <div key={c.id} className="flex items-center justify-between border-b border-zinc-200 pb-1">
                                  <span className="font-mono text-zinc-600 font-bold">#{idx + 1} {c.candidateNumber}</span>
                                  <span className="truncate max-w-[140px] font-medium">{c.name}</span>
                                  <span className="font-mono font-bold text-zinc-900">{c.votes || 0} v</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Girls Standings */}
                          <div className="space-y-2 border border-zinc-300 rounded-lg p-3 bg-zinc-50">
                            <h3 className="text-xs font-bold uppercase text-amber-800 font-mono">
                              Female Models ({totalGirlVotes} votes)
                            </h3>
                            <div className="space-y-1.5 text-xs">
                              {girls.slice(0, 7).map((c, idx) => (
                                <div key={c.id} className="flex items-center justify-between border-b border-zinc-200 pb-1">
                                  <span className="font-mono text-zinc-600 font-bold">#{idx + 1} {c.candidateNumber}</span>
                                  <span className="truncate max-w-[140px] font-medium">{c.name}</span>
                                  <span className="font-mono font-bold text-zinc-900">{c.votes || 0} v</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* OFFICIAL CERTIFICATION SEAL & SIGN-OFFS */}
                    {pdfIncludeSignatures && (
                      <div className="border-t-2 border-zinc-900 pt-6 mt-8 space-y-4">
                        <div className="grid grid-cols-3 gap-4 text-center text-xs font-mono">
                          <div className="border-t border-zinc-400 pt-2 space-y-1">
                            <div className="font-bold uppercase text-zinc-800">President, AIESEC in CINEC</div>
                            <div className="text-[10px] text-zinc-500">Official Executive Signature</div>
                          </div>
                          <div className="flex flex-col items-center justify-center -mt-3">
                            <div className="w-14 h-14 rounded-full border-2 border-amber-600 border-dashed flex flex-col items-center justify-center text-[8px] font-mono font-black uppercase text-amber-800 p-1">
                              <span>AIESEC</span>
                              <span className="text-[10px]">★ SEAL ★</span>
                              <span>CINEC</span>
                            </div>
                          </div>
                          <div className="border-t border-zinc-400 pt-2 space-y-1">
                            <div className="font-bold uppercase text-zinc-800">Chief Runway Judge</div>
                            <div className="text-[10px] text-zinc-500">Jury Tabulation Certification</div>
                          </div>
                        </div>
                        <div className="text-center text-[10px] text-zinc-400 font-mono">
                          NOVERA &rsquo;26 Haute Couture Fashion Showcase &bull; Official Digital Ledger &bull; All Rights Reserved
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================= 🌟 DEDICATED PRINT-ONLY LUXURY MC & AWARDS DOSSIER ================= */}
      <div className="hidden print:block p-8 bg-white text-zinc-900 font-sans space-y-6">
        <div className="border-b-2 border-zinc-900 pb-4 text-center space-y-1">
          <div className="text-[10px] uppercase tracking-[0.25em] font-extrabold text-amber-800">
            AIESEC IN CINEC &bull; OFFICIAL CENTRAL TABULATION
          </div>
          <h1 className="text-3xl font-serif font-black uppercase tracking-tight text-zinc-900">
            NOVERA &rsquo;26 &bull; OFFICIAL AWARDS CUE SHEET &amp; DOSSIER
          </h1>
          <p className="text-xs text-zinc-500 font-mono">
            Certified by Central Committee &bull; Telemetry Ledger &bull; {new Date().toLocaleDateString()}
          </p>
        </div>

        <div className="space-y-4">
          {AWARD_DEFINITIONS.map((award, idx) => {
            const rankedBoys = getRankedStats('boy', award.key);
            const rankedGirls = getRankedStats('girl', award.key);
            const winnerBoy = rankedBoys[0];
            const winnerGirl = rankedGirls[0];
            const boyScore = winnerBoy ? getScoreValueForAward(winnerBoy, award.key).score : 0;
            const girlScore = winnerGirl ? getScoreValueForAward(winnerGirl, award.key).score : 0;

            return (
              <div key={award.key} className="border border-zinc-400 rounded-xl p-4 bg-zinc-50 space-y-3 break-inside-avoid">
                <div className="flex justify-between items-center border-b border-zinc-300 pb-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                      Title #{idx + 1}
                    </span>
                    <h2 className="text-lg font-bold uppercase text-zinc-900">{award.title}</h2>
                    <span className="text-[10px] text-zinc-500 font-mono block">
                      Criteria: {award.criteriaText}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold bg-white px-2.5 py-1 rounded border border-zinc-300 shadow-sm">
                    {award.source === 'jury' ? `Max Score: ${award.maxScore}` : 'Public Votes'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div className="p-3 bg-white rounded-lg border border-amber-500/30">
                    <span className="text-[10px] font-bold uppercase text-amber-700 block">Male Winner (Boy)</span>
                    <div className="text-base font-bold text-zinc-900">{winnerBoy?.candidate.name || 'To Be Announced'}</div>
                    <div className="text-xs text-zinc-600 font-mono">
                      Candidate No: {winnerBoy?.candidate.candidateNumber || 'N/A'} &bull; Final Score / Votes: {boyScore}
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-amber-500/30">
                    <span className="text-[10px] font-bold uppercase text-amber-700 block">Female Winner (Girl)</span>
                    <div className="text-base font-bold text-zinc-900">{winnerGirl?.candidate.name || 'To Be Announced'}</div>
                    <div className="text-xs text-zinc-600 font-mono">
                      Candidate No: {winnerGirl?.candidate.candidateNumber || 'N/A'} &bull; Final Score / Votes: {girlScore}
                    </div>
                  </div>
                </div>

                {pdfIncludeScripts && (
                  <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-300 text-xs text-amber-950 font-serif italic leading-relaxed">
                    &ldquo;Ladies and Gentlemen, for the title of <strong>{award.title}</strong>, the winner for Male Model is Candidate <strong>#{winnerBoy?.candidate.candidateNumber} - {winnerBoy?.candidate.name}</strong>, and for Female Model is Candidate <strong>#{winnerGirl?.candidate.candidateNumber} - {winnerGirl?.candidate.name}</strong>!&rdquo;
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="border-t-2 border-zinc-900 pt-6 flex justify-between text-xs text-zinc-700 font-mono">
          <div>Official Seal: AIESEC in CINEC</div>
          <div>Organizing Committee Sign-off: _______________________</div>
          <div>Chief Judge Sign-off: _______________________</div>
        </div>
      </div>
    </div>
  );
}
