'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Candidate, JudgeScore, VotingSettings } from '@/lib/types';
import {
  fetchCandidates,
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
  Trophy,
  Eye,
  EyeOff,
  QrCode,
  MessageSquare,
  CheckCircle2,
} from 'lucide-react';
import Image from 'next/image';
import RunwayStageBackground from '@/app/components/RunwayStageBackground';
import VotingCountdownOverlay from '@/app/components/VotingCountdownOverlay';

const ADMIN_PASSCODE = 'novera2026';

const OFFICIAL_JUDGE_ROSTER = [
  { id: 'judge_piyumi', name: 'Piyumi', title: 'Fashion & Runway Jury' },
  { id: 'judge_kalwani', name: 'Kalwani', title: 'Styling & Visual Jury' },
  { id: 'judge_devdunu', name: 'Devdunu', title: 'Poise & Presence Jury' },
  { id: 'judge_erusha', name: 'Erusha', title: 'Runway Technique Jury' },
  { id: 'judge_sachith', name: 'Sachith', title: 'Personality & Charisma Jury' },
  { id: 'judge_dulmi', name: 'Dulmi', title: 'Elegance & Wardrobe Jury' },
];

export type AwardKey =
  | 'topModel'
  | 'personality'
  | 'stagePresence'
  | 'photogenic'
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
  const [passcode, setPasscode] = useState<string>('');
  const [passcodeError, setPasscodeError] = useState<string>('');

  const [activeTab, setActiveTab] = useState<'audience' | 'judges' | 'summary'>('audience');
  const [selectedJuryAward, setSelectedJuryAward] = useState<AwardKey>('topModel');
  const [selectedAuditJudge, setSelectedAuditJudge] = useState<typeof OFFICIAL_JUDGE_ROSTER[0] | null>(null);
  const [auditCategoryFilter, setAuditCategoryFilter] = useState<'all' | 'boy' | 'girl'>('all');

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [judgeScores, setJudgeScores] = useState<JudgeScore[]>([]);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [chartCategory, setChartCategory] = useState<'both' | 'boy' | 'girl'>('both');
  const [votingSettings, setVotingSettings] = useState<VotingSettings>({ isVotingOpen: true });
  const [isUpdatingVotingStatus, setIsUpdatingVotingStatus] = useState<boolean>(false);
  const [isPrivacyMasked, setIsPrivacyMasked] = useState<boolean>(true);

  const loadData = () => {
    fetchCandidates().then((list) => {
      setCandidates(list);
    });
  };

  useEffect(() => {
    const savedAuth = sessionStorage.getItem('novera_admin_auth');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
    }

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
    window.addEventListener('novera_vote_updated', handleVoteSync);

    return () => {
      unsubscribeCandidates();
      unsubscribeJudgeScores();
      unsubscribeVotingSettings();
      clearInterval(interval);
      window.removeEventListener('novera_vote_updated', handleVoteSync);
    };
  }, []);

  const toggleVotingStatus = async () => {
    if (!votingSettings.isVotingOpen) {
      // Opening voting: initiate a cinematic 5-second synchronized countdown
      const countdownTarget = Date.now() + 5200;
      setIsUpdatingVotingStatus(true);
      try {
        await saveVotingSettings({
          isVotingOpen: true,
          countdownUntil: countdownTarget,
          announcement: 'Audience voting is LIVE!',
        });
        // Immediately navigate to the Stage QR Screen (/qr)
        router.push('/qr');
      } finally {
        setIsUpdatingVotingStatus(false);
      }
    } else {
      // Closing voting: immediate lock
      setIsUpdatingVotingStatus(true);
      try {
        await saveVotingSettings({
          isVotingOpen: false,
          countdownUntil: null,
          announcement: 'Audience voting is currently PAUSED / CONCLUDED by the Central Committee.',
        });
      } finally {
        setIsUpdatingVotingStatus(false);
      }
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode.trim() === ADMIN_PASSCODE) {
      setIsAuthenticated(true);
      sessionStorage.setItem('novera_admin_auth', 'true');
      setPasscodeError('');
    } else {
      setPasscodeError('Invalid Admin Passcode. Please enter the master access code.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('novera_admin_auth');
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

      return {
        candidate,
        judgeCount,
        scores,
        topModelAvg,
        personalityAvg,
        stagePresenceAvg,
        photogenicAvg,
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
      case 'peoplesChoice':
      default:
        return { score: stat.votes, max: 0 };
    }
  };

  const handleResetVotes = async () => {
    if (!window.confirm('Are you sure you want to reset all AUDIENCE votes to 0?')) return;
    setIsResetting(true);
    try {
      await resetAllVotes();
      setCandidates((prev) => prev.map((c) => ({ ...c, votes: 0 })));
      loadData();
    } catch (err) {
      console.error('Reset error:', err);
    } finally {
      setIsResetting(false);
    }
  };

  const handleResetJudges = async () => {
    if (!window.confirm('Are you sure you want to reset all JUDGES scores to 0?')) return;
    setIsResetting(true);
    try {
      await resetAllJudgeScores();
      setJudgeScores([]);
    } catch (err) {
      console.error('Reset judges error:', err);
    } finally {
      setIsResetting(false);
    }
  };

  const handleSimulateVotes = () => {
    const updated = candidates.map((c) => ({
      ...c,
      votes: (c.votes || 0) + Math.floor(Math.random() * 5) + 1,
    }));
    saveLocalCandidates(updated);
    setCandidates(updated);
  };

  // Recharts Data Prep
  const chartData = [
    ...(chartCategory === 'both' || chartCategory === 'boy'
      ? boys.map((c) => ({
          name: c.name.split(' ')[0],
          fullName: c.name,
          category: 'Boy',
          votes: c.votes || 0,
          color: '#b3924f',
        }))
      : []),
    ...(chartCategory === 'both' || chartCategory === 'girl'
      ? girls.map((c) => ({
          name: c.name.split(' ')[0],
          fullName: c.name,
          category: 'Girl',
          votes: c.votes || 0,
          color: '#0b0b0b',
        }))
      : []),
  ];

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
              NOVERA &rsquo;26 Admin
            </h1>
            <p className="text-[11px] sm:text-xs text-zinc-300 font-medium">
              Enter master administrator password to view live audience votes and judge evaluations.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div>
              <label className="block text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-amber-200/90 mb-1.5">
                Master Passcode
              </label>
              <input
                type="password"
                placeholder="Enter admin passcode"
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
              <span>Unlock Admin Dashboard</span>
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
    <div className="min-h-screen relative bg-[#070605] text-white overflow-x-hidden print:bg-white print:text-black print:min-h-0">
      {/* 🌟 CINEMATIC RUNWAY OPENING COUNTDOWN OVERLAY */}
      {votingSettings.countdownUntil && votingSettings.countdownUntil > Date.now() && (
        <VotingCountdownOverlay
          countdownUntil={votingSettings.countdownUntil}
          onComplete={() => {
            saveVotingSettings({
              isVotingOpen: true,
              countdownUntil: null,
              announcement: 'Audience voting is LIVE!',
            });
          }}
        />
      )}

      {/* Haute Couture Fashion Runway Stage Animation */}
      <div className="print:hidden">
        <RunwayStageBackground />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 relative z-10 print:hidden">
      {/* Top Banner & Navigation */}
      <div className="p-6 sm:p-8 rounded-3xl bg-black/40 backdrop-blur-2xl border border-white/15 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/50 backdrop-blur-xl border border-white/20 text-xs uppercase tracking-widest font-bold text-novera-gold mb-2">
            <ShieldCheck className="w-4 h-4 text-novera-gold animate-float" />
            <span>Master Administration Hub</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-4xl font-bold text-white">
            Central Tabulation &amp; Surveillance
          </h1>
          <p className="text-xs sm:text-sm text-zinc-300 mt-1">
            Official Award Marking Alignment &bull; 6 Titles (Girl &amp; Boy) &bull; Live Telemetry
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Live Voting Toggle Switch */}
          <button
            type="button"
            onClick={toggleVotingStatus}
            disabled={isUpdatingVotingStatus}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all shadow-md backdrop-blur-md border ${
              votingSettings.isVotingOpen
                ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-500/40 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
            }`}
            title="Click to toggle live audience voting on or off"
          >
            <span className={`w-2.5 h-2.5 rounded-full ${votingSettings.isVotingOpen ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'}`} />
            <span>{votingSettings.isVotingOpen ? 'Audience Voting: OPEN' : 'Audience Voting: CLOSED'}</span>
          </button>

          {/* Direct link to Stage QR Screen */}
          <Link
            href="/qr"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider bg-white/10 hover:bg-white/20 text-white border border-white/15 backdrop-blur-md transition-all shadow-sm hover:border-novera-gold/50"
            title="Open Stage QR Screen for Audience"
          >
            <QrCode className="w-4 h-4 text-novera-gold" />
            <span>Stage QR Screen</span>
          </Link>

          {/* Privacy Shield Toggle (Hides counts & leaders from backstage bystanders) */}
          <button
            type="button"
            onClick={() => setIsPrivacyMasked(!isPrivacyMasked)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all shadow-md backdrop-blur-md border ${
              isPrivacyMasked
                ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                : 'bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 border-white/20'
            }`}
            title={isPrivacyMasked ? 'Privacy Shield is ACTIVE (Results concealed from bystanders)' : 'Privacy Shield is REVEALED'}
          >
            {isPrivacyMasked ? (
              <>
                <EyeOff className="w-4 h-4 text-amber-400" />
                <span>Privacy Shield: ACTIVE</span>
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 text-emerald-400" />
                <span>Privacy Shield: REVEALED</span>
              </>
            )}
          </button>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/15 backdrop-blur-md transition-all shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>Print MC Summary</span>
          </button>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-semibold text-rose-300 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 backdrop-blur-md transition-colors shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex justify-center my-2">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 rounded-2xl sm:rounded-full bg-black/50 backdrop-blur-xl border border-white/15 shadow-inner w-full max-w-3xl">
          <button
            onClick={() => setActiveTab('audience')}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl sm:rounded-full text-xs sm:text-sm font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-200 ${
              activeTab === 'audience'
                ? 'bg-gradient-to-r from-novera-gold to-amber-500 text-black shadow-lg font-extrabold'
                : 'text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Vote className={`w-4 h-4 shrink-0 ${activeTab === 'audience' ? 'text-black' : 'text-novera-gold'}`} />
            <span>Audience Votes</span>
          </button>

          <button
            onClick={() => setActiveTab('judges')}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl sm:rounded-full text-xs sm:text-sm font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-200 ${
              activeTab === 'judges'
                ? 'bg-gradient-to-r from-novera-gold to-amber-500 text-black shadow-lg font-extrabold'
                : 'text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Award className={`w-4 h-4 shrink-0 ${activeTab === 'judges' ? 'text-black' : 'text-novera-gold'}`} />
            <span>Jury Scores</span>
          </button>

          <button
            onClick={() => setActiveTab('summary')}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl sm:rounded-full text-xs sm:text-sm font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-200 ${
              activeTab === 'summary'
                ? 'bg-gradient-to-r from-novera-gold to-amber-500 text-black shadow-lg font-extrabold'
                : 'text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Trophy className={`w-4 h-4 shrink-0 ${activeTab === 'summary' ? 'text-black' : 'text-novera-gold'}`} />
            <span>Final 6 Titles</span>
          </button>
        </div>
      </div>

      {/* ================= TAB 1: AUDIENCE VOTES ================= */}
      {activeTab === 'audience' && (
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
              <div className="relative w-24 h-24 rounded-2xl overflow-hidden shrink-0 shadow-inner border border-white/15">
                {topBoyAudience && (
                  <Image src={topBoyAudience.imageUrl} alt={topBoyAudience.name} fill className="object-cover" />
                )}
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
              <div className="relative w-24 h-24 rounded-2xl overflow-hidden shrink-0 shadow-inner border border-white/15">
                {topGirlAudience && (
                  <Image src={topGirlAudience.imageUrl} alt={topGirlAudience.name} fill className="object-cover" />
                )}
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

          {/* Bar Chart Section */}
          <div className="p-6 sm:p-8 rounded-3xl bg-black/40 backdrop-blur-2xl border border-white/15 shadow-2xl text-white">
            <div className="flex flex-col sm:flex-row items-center justify-between pb-6 border-b border-white/10 gap-4">
              <div>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-white">
                  Live Vote Distribution (Bar Chart)
                </h2>
                <p className="text-xs text-zinc-400">Real-time vote comparison across runway models</p>
              </div>

              <div className="inline-flex p-1 rounded-xl bg-white/10 border border-white/15 text-xs">
                <button
                  onClick={() => setChartCategory('both')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    chartCategory === 'both' ? 'bg-gradient-to-r from-novera-gold to-amber-500 text-black font-extrabold shadow' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  All Models
                </button>
                <button
                  onClick={() => setChartCategory('boy')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    chartCategory === 'boy' ? 'bg-gradient-to-r from-novera-gold to-amber-500 text-black font-extrabold shadow' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Boys Only
                </button>
                <button
                  onClick={() => setChartCategory('girl')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    chartCategory === 'girl' ? 'bg-gradient-to-r from-novera-gold to-amber-500 text-black font-extrabold shadow' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Girls Only
                </button>
              </div>
            </div>

            <div className="mt-8 h-80 w-full relative">
              {isPrivacyMasked && (
                <div className="absolute inset-0 z-20 bg-black/85 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center text-center p-4 space-y-3">
                  <EyeOff className="w-8 h-8 text-novera-gold animate-pulse" />
                  <span className="font-serif text-sm font-bold uppercase tracking-wider text-white">
                    Vote Distribution Concealed
                  </span>
                  <p className="text-xs text-zinc-400 max-w-sm">
                    Relative standings are shielded from public view. Unmask to inspect real-time bar graphs.
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
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.1)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#d4d4d8' }} interval={0} angle={-25} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11, fill: '#d4d4d8' }} allowDecimals={false} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-[#0c0a08]/95 backdrop-blur-xl border border-white/20 text-white p-3 rounded-xl shadow-xl text-xs space-y-1">
                            <div className="font-bold text-novera-gold">{data.fullName}</div>
                            <div className="text-zinc-400">Category: {data.category}</div>
                            <div className="font-mono text-sm font-bold text-white">{data.votes} votes</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="votes" radius={[8, 8, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
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
      {activeTab === 'judges' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* 6 Official Judges Roster & Real-time Evaluation Status */}
          <div className="p-6 rounded-3xl bg-black/40 backdrop-blur-2xl border border-white/15 shadow-xl space-y-4 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/10 gap-2">
              <div>
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-novera-gold" />
                  <h3 className="font-serif text-lg font-bold text-white">
                    6 Official Judges &bull; Live Telemetry &amp; Evaluation Audit
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

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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
                    className={`p-3 rounded-2xl border text-center transition-all cursor-pointer hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] group relative overflow-hidden flex flex-col justify-between ${
                      count > 0
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
                          className={`w-1.5 h-1.5 rounded-full ${
                            count > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'
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
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-gradient-to-r from-novera-gold to-amber-500 text-black shadow-lg font-extrabold'
                        : 'bg-white/10 text-zinc-300 border border-white/15 hover:bg-white/20 hover:text-white'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-black' : 'text-novera-gold'}`} />
                    <span>{award.title}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full ${
                        isSelected ? 'bg-black/20 text-black font-mono' : 'bg-white/10 text-zinc-300'
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
                    Jury Category Leaders Masked
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
              <div className="relative w-24 h-24 rounded-2xl overflow-hidden shrink-0 shadow-inner border border-white/15">
                {leadingBoyForAward && (
                  <Image
                    src={leadingBoyForAward.candidate.imageUrl}
                    alt={leadingBoyForAward.candidate.name}
                    fill
                    className="object-cover"
                  />
                )}
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
              <div className="relative w-24 h-24 rounded-2xl overflow-hidden shrink-0 shadow-inner border border-white/15">
                {leadingGirlForAward && (
                  <Image
                    src={leadingGirlForAward.candidate.imageUrl}
                    alt={leadingGirlForAward.candidate.name}
                    fill
                    className="object-cover"
                  />
                )}
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
                          className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                            idx === 0
                              ? 'bg-gradient-to-r from-novera-gold to-amber-500 text-black font-extrabold'
                              : 'bg-white/15 text-white'
                          }`}
                        >
                          #{idx + 1}
                        </div>
                        <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-white/10">
                          <Image
                            src={stat.candidate.imageUrl}
                            alt={stat.candidate.name}
                            fill
                            className="object-cover"
                          />
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
                          className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                            idx === 0
                              ? 'bg-gradient-to-r from-novera-gold to-amber-500 text-black font-extrabold'
                              : 'bg-white/15 text-white'
                          }`}
                        >
                          #{idx + 1}
                        </div>
                        <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-white/10">
                          <Image
                            src={stat.candidate.imageUrl}
                            alt={stat.candidate.name}
                            fill
                            className="object-cover"
                          />
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
      {activeTab === 'summary' && (
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
                            Title #{index + 1} &bull; {award.source === 'jury' ? 'Official Jury Evaluation' : 'Public Web Ballot'}
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
                          <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 shadow-inner border border-white/10">
                            {winnerBoy && (
                              <Image
                                src={winnerBoy.candidate.imageUrl}
                                alt={winnerBoy.candidate.name}
                                fill
                                className="object-cover"
                              />
                            )}
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
                          <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 shadow-inner border border-white/10">
                            {winnerGirl && (
                              <Image
                                src={winnerGirl.candidate.imageUrl}
                                alt={winnerGirl.candidate.name}
                                fill
                                className="object-cover"
                              />
                            )}
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
      {/* ================= JUDGE SCORECARD AUDIT MODAL ================= */}
      {selectedAuditJudge && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-2xl flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="max-w-3xl w-full bg-[#0c0a08]/95 backdrop-blur-3xl rounded-3xl p-5 sm:p-7 border border-white/20 shadow-2xl relative animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col overflow-hidden text-left text-white">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-novera-gold/20 text-novera-gold border border-novera-gold/30 text-lg font-serif font-bold flex items-center justify-center shadow-md">
                  {selectedAuditJudge.name[0]}
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-novera-gold font-bold">
                    Official Jury Evaluation Audit
                  </div>
                  <h3 className="font-serif text-xl sm:text-2xl font-bold text-white">
                    Judge {selectedAuditJudge.name}
                  </h3>
                  <div className="text-xs text-zinc-300 font-medium">
                    {selectedAuditJudge.title}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedAuditJudge(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 flex items-center justify-center transition-colors text-base font-bold shadow-sm"
              >
                &times;
              </button>
            </div>

            {/* Filter & Progress Summary Bar */}
            <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-300">Filter:</span>
                <div className="flex p-1 rounded-xl bg-white/10 border border-white/10">
                  <button
                    onClick={() => setAuditCategoryFilter('all')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all ${
                      auditCategoryFilter === 'all'
                        ? 'bg-gradient-to-r from-novera-gold to-amber-500 text-black font-extrabold shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    All ({candidates.length})
                  </button>
                  <button
                    onClick={() => setAuditCategoryFilter('boy')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all ${
                      auditCategoryFilter === 'boy'
                        ? 'bg-gradient-to-r from-novera-gold to-amber-500 text-black font-extrabold shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Boys ({candidates.filter((c) => c.category === 'boy').length})
                  </button>
                  <button
                    onClick={() => setAuditCategoryFilter('girl')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all ${
                      auditCategoryFilter === 'girl'
                        ? 'bg-gradient-to-r from-novera-gold to-amber-500 text-black font-extrabold shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Girls ({candidates.filter((c) => c.category === 'girl').length})
                  </button>
                </div>
              </div>

              {/* Completion Tag */}
              <div className="text-xs font-mono font-semibold text-zinc-300 flex items-center gap-2">
                <span>Completed:</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 font-bold border border-emerald-500/40">
                  {judgeScores.filter((s) => s.judgeId === selectedAuditJudge.id).length} / {candidates.length} Scored
                </span>
              </div>
            </div>

            {/* Scrollable Candidates Score Cards List */}
            <div className="overflow-y-auto space-y-3.5 pr-1 flex-grow">
              {candidates
                .filter((c) => auditCategoryFilter === 'all' || c.category === auditCategoryFilter)
                .map((candidate) => {
                  const score = judgeScores.find(
                    (s) => s.judgeId === selectedAuditJudge.id && s.candidateId === candidate.id
                  );

                  return (
                    <div
                      key={candidate.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        score
                          ? 'bg-emerald-950/20 border-emerald-500/40 shadow-sm text-white'
                          : 'bg-white/5 border-white/10 opacity-70 text-zinc-300'
                      }`}
                    >
                      {/* Candidate Row Header */}
                      <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10">
                        <div className="flex items-center gap-3">
                          <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 shadow-sm border border-white/20">
                            <Image
                              src={candidate.imageUrl}
                              alt={candidate.name}
                              fill
                              className="object-cover"
                            />
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

                        {/* Overall Score Badge */}
                        <div className="text-right shrink-0">
                          {score ? (
                            <div>
                              <div className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">
                                Total Score
                              </div>
                              <div className="font-mono text-2xl font-bold text-novera-gold">
                                {score.totalModel} <span className="text-xs text-zinc-400 font-sans">/ 100</span>
                              </div>
                            </div>
                          ) : (
                            <span className="px-3 py-1 rounded-full bg-white/10 text-zinc-400 text-xs font-mono font-semibold border border-white/10">
                              Pending Evaluation
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Criteria Score Breakdown (If Scored) */}
                      {score && (
                        <div className="pt-3 space-y-2.5">
                          {/* 6 Official Runway Criteria Chips */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center text-xs">
                            <div className="p-2 rounded-xl bg-white/5 border border-white/10 shadow-xs">
                              <span className="text-[10px] text-zinc-400 font-semibold block">Walking</span>
                              <strong className="font-mono text-sm text-white">{score.walking} / 20</strong>
                            </div>
                            <div className="p-2 rounded-xl bg-white/5 border border-white/10 shadow-xs">
                              <span className="text-[10px] text-zinc-400 font-semibold block">Confidence</span>
                              <strong className="font-mono text-sm text-white">{score.confidence} / 20</strong>
                            </div>
                            <div className="p-2 rounded-xl bg-white/5 border border-white/10 shadow-xs">
                              <span className="text-[10px] text-zinc-400 font-semibold block">Stage Pres.</span>
                              <strong className="font-mono text-sm text-white">{score.stage} / 20</strong>
                            </div>
                            <div className="p-2 rounded-xl bg-white/5 border border-white/10 shadow-xs">
                              <span className="text-[10px] text-zinc-400 font-semibold block">Posture</span>
                              <strong className="font-mono text-sm text-white">{score.posture} / 15</strong>
                            </div>
                            <div className="p-2 rounded-xl bg-white/5 border border-white/10 shadow-xs">
                              <span className="text-[10px] text-zinc-400 font-semibold block">Poses</span>
                              <strong className="font-mono text-sm text-white">{score.poses} / 15</strong>
                            </div>
                            <div className="p-2 rounded-xl bg-white/5 border border-white/10 shadow-xs">
                              <span className="text-[10px] text-zinc-400 font-semibold block">Face</span>
                              <strong className="font-mono text-sm text-white">{score.face} / 10</strong>
                            </div>
                          </div>

                          {/* Sub-award totals summary */}
                          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
                            <div className="flex items-center gap-1.5">
                              <Star className="w-3.5 h-3.5 text-amber-400" />
                              <span className="text-zinc-300">Personality:</span>
                              <strong className="font-mono text-white">{score.personalityScore}/50</strong>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3.5 h-3.5 text-amber-400" />
                              <span className="text-zinc-300">Stage Impact:</span>
                              <strong className="font-mono text-white">{score.stagePresenceScore}/30</strong>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Camera className="w-3.5 h-3.5 text-amber-400" />
                              <span className="text-zinc-300">Photogenic:</span>
                              <strong className="font-mono text-white">{score.photogenicScore}/40</strong>
                            </div>
                          </div>

                          {/* Confidential Notes */}
                          {score.notes && (
                            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-zinc-300 italic flex items-start gap-2">
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
            <div className="pt-3 border-t border-white/10 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedAuditJudge(null)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-novera-gold to-amber-500 text-black font-extrabold hover:brightness-110 text-xs uppercase tracking-wider transition-all shadow-sm"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* ================= DEDICATED PRINT-ONLY MC ANNOUNCEMENT CUE SHEET ================= */}
      <div className="hidden print:block p-8 bg-white text-black font-sans space-y-6">
        <div className="border-b-2 border-black pb-4 text-center space-y-1">
          <div className="text-xs uppercase tracking-widest font-bold text-gray-600">
            AIESEC in CINEC Presents
          </div>
          <h1 className="text-3xl font-serif font-extrabold uppercase tracking-tight">
            NOVERA &rsquo;26 &bull; OFFICIAL AWARDS CUE SHEET
          </h1>
          <p className="text-xs text-gray-500 font-mono">
            Certified by Central Tabulation &bull; Live Telemetry Ledger &bull; {new Date().toLocaleDateString()}
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
              <div key={award.key} className="border border-gray-400 rounded-lg p-4 space-y-2 break-inside-avoid">
                <div className="flex justify-between items-center border-b border-gray-300 pb-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600">
                      Title #{idx + 1}
                    </span>
                    <h2 className="text-lg font-bold uppercase">{award.title}</h2>
                  </div>
                  <span className="text-xs font-mono font-bold bg-gray-100 px-2.5 py-1 rounded border border-gray-300">
                    {award.source === 'jury' ? `Max Score: ${award.maxScore}` : 'Public Votes'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div className="p-3 bg-gray-50 rounded border border-gray-200">
                    <span className="text-[10px] font-bold uppercase text-gray-600 block">Male Winner (Boy)</span>
                    <div className="text-base font-bold">{winnerBoy?.candidate.name || 'To Be Announced'}</div>
                    <div className="text-xs text-gray-600 font-mono">
                      Candidate No: {winnerBoy?.candidate.candidateNumber || 'N/A'} &bull; Final Score: {boyScore}
                    </div>
                  </div>

                  <div className="p-3 bg-gray-50 rounded border border-gray-200">
                    <span className="text-[10px] font-bold uppercase text-gray-600 block">Female Winner (Girl)</span>
                    <div className="text-base font-bold">{winnerGirl?.candidate.name || 'To Be Announced'}</div>
                    <div className="text-xs text-gray-600 font-mono">
                      Candidate No: {winnerGirl?.candidate.candidateNumber || 'N/A'} &bull; Final Score: {girlScore}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t-2 border-black pt-6 flex justify-between text-xs text-gray-700 font-mono">
          <div>Official Seal: AIESEC in CINEC</div>
          <div>Organizing Committee Sign-off: _______________________</div>
        </div>
      </div>
    </div>
  );
}
