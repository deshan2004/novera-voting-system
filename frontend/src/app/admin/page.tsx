'use client';

import { useState, useEffect } from 'react';
import { Candidate, JudgeScore } from '@/lib/types';
import {
  fetchCandidates,
  resetAllVotes,
  saveLocalCandidates,
  getLocalCandidates,
  subscribeToCandidates,
  subscribeToJudgeScores,
  resetAllJudgeScores,
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
  BarChart3,
  Trophy,
  Users,
  RotateCcw,
  Sparkles,
  QrCode,
  ShieldCheck,
  Crown,
  Play,
  Pause,
  Shuffle,
  Vote,
  Lock,
  LogOut,
  Award,
  Star,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

const ADMIN_PASSCODE = 'novera2026';

export default function AdminLeaderboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [passcode, setPasscode] = useState<string>('');
  const [passcodeError, setPasscodeError] = useState<string>('');

  const [activeTab, setActiveTab] = useState<'audience' | 'judges' | 'summary'>('audience');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [judgeScores, setJudgeScores] = useState<JudgeScore[]>([]);
  const [votingActive, setVotingActive] = useState<boolean>(true);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [chartCategory, setChartCategory] = useState<'both' | 'boy' | 'girl'>('both');

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

    // Real-time Firebase candidates
    const unsubscribeCandidates = subscribeToCandidates((updatedList) => {
      setCandidates(updatedList);
    });

    // Real-time Firebase judge scores
    const unsubscribeJudgeScores = subscribeToJudgeScores((scores) => {
      setJudgeScores(scores);
    });

    const interval = setInterval(loadData, 3000);
    const handleVoteSync = () => loadData();
    window.addEventListener('novera_vote_updated', handleVoteSync);

    return () => {
      unsubscribeCandidates();
      unsubscribeJudgeScores();
      clearInterval(interval);
      window.removeEventListener('novera_vote_updated', handleVoteSync);
    };
  }, []);

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
  const boys = candidates
    .filter((c) => c.category === 'boy')
    .sort((a, b) => (b.votes || 0) - (a.votes || 0));

  const girls = candidates
    .filter((c) => c.category === 'girl')
    .sort((a, b) => (b.votes || 0) - (a.votes || 0));

  const totalBoyVotes = boys.reduce((sum, c) => sum + (c.votes || 0), 0);
  const totalGirlVotes = girls.reduce((sum, c) => sum + (c.votes || 0), 0);
  const totalOverallVotes = totalBoyVotes + totalGirlVotes;

  const topBoyAudience = boys[0];
  const topGirlAudience = girls[0];

  // Judges Calculations
  const computeJudgeStats = (candidate: Candidate) => {
    const scores = judgeScores.filter((s) => s.candidateId === candidate.id);
    const judgeCount = scores.length;
    const totalScore = scores.reduce((sum, s) => sum + Number(s.total || 0), 0);
    const averageScore = judgeCount > 0 ? Math.round((totalScore / judgeCount) * 10) / 10 : 0;
    return {
      candidate,
      scores,
      judgeCount,
      totalScore,
      averageScore,
    };
  };

  const boysJudgeStats = candidates
    .filter((c) => c.category === 'boy')
    .map(computeJudgeStats)
    .sort((a, b) => b.averageScore - a.averageScore || b.totalScore - a.totalScore);

  const girlsJudgeStats = candidates
    .filter((c) => c.category === 'girl')
    .map(computeJudgeStats)
    .sort((a, b) => b.averageScore - a.averageScore || b.totalScore - a.totalScore);

  const topBoyJudge = boysJudgeStats[0];
  const topGirlJudge = girlsJudgeStats[0];

  const handleResetVotes = async () => {
    if (!window.confirm('Are you sure you want to reset all AUDIENCE votes to 0?')) return;
    setIsResetting(true);
    await resetAllVotes();
    loadData();
    setIsResetting(false);
  };

  const handleResetJudges = async () => {
    if (!window.confirm('Are you sure you want to reset all JUDGES scores to 0?')) return;
    setIsResetting(true);
    await resetAllJudgeScores();
    setIsResetting(false);
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
      <div className="min-h-[75vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-novera-ink/10 shadow-editorial text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-novera-ink text-novera-gold mx-auto flex items-center justify-center shadow-md">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold tracking-[0.25em] uppercase text-novera-foil">
              Restricted Area
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-novera-ink">
              NOVERA &rsquo;26 Admin
            </h1>
            <p className="text-xs text-novera-charcoal">
              Enter master administrator password to view live audience votes and judge evaluations.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-novera-charcoal mb-1.5">
                Master Passcode
              </label>
              <input
                type="password"
                placeholder="Enter admin passcode"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-novera-ink/20 text-xs sm:text-sm bg-novera-paper-dim text-novera-ink outline-none focus:border-novera-foil font-mono"
                required
              />
            </div>

            {passcodeError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passcodeError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-novera-ink text-novera-paper hover:bg-novera-foil transition-all text-xs font-bold uppercase tracking-wider shadow-sm"
            >
              Unlock Admin Dashboard
            </button>
          </form>

          <p className="text-[11px] text-novera-silver">
            NOVERA ’26 &bull; AIESEC in CINEC Official Results System
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Admin Top Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-novera-ink text-novera-paper shadow-editorial mb-8 flex flex-col lg:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4 text-center lg:text-left">
          <div className="w-14 h-14 rounded-2xl bg-novera-foil/20 border border-novera-foil/40 flex items-center justify-center shrink-0">
            <BarChart3 className="w-7 h-7 text-novera-gold" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-novera-gold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Organizer Master Dashboard</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-4xl font-bold tracking-tight">
              NOVERA &rsquo;26 &bull; Results Control Room
            </h1>
            <p className="text-xs text-novera-silver mt-1">
              Separate collection for Audience Public Votes and Judges&rsquo; Scoring Sheets
            </p>
          </div>
        </div>

        {/* Quick Links & Logout */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/judge"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider bg-novera-foil text-novera-paper hover:bg-novera-gold transition-colors"
          >
            <Award className="w-3.5 h-3.5" />
            <span>Open Judge Portal</span>
            <ExternalLink className="w-3 h-3" />
          </Link>

          <Link
            href="/qr"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider bg-white/10 hover:bg-white/20 text-novera-paper transition-colors"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Stage QR</span>
            <ExternalLink className="w-3 h-3" />
          </Link>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Lock</span>
          </button>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex p-1.5 rounded-2xl bg-white border border-novera-ink/10 shadow-sm">
          <button
            onClick={() => setActiveTab('audience')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold tracking-wider uppercase transition-all ${
              activeTab === 'audience'
                ? 'bg-novera-ink text-novera-paper shadow-md'
                : 'text-novera-charcoal hover:text-novera-ink'
            }`}
          >
            <Users className="w-4 h-4 text-novera-gold" />
            <span>1. Audience Votes ({totalOverallVotes})</span>
          </button>

          <button
            onClick={() => setActiveTab('judges')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold tracking-wider uppercase transition-all ${
              activeTab === 'judges'
                ? 'bg-novera-ink text-novera-paper shadow-md'
                : 'text-novera-charcoal hover:text-novera-ink'
            }`}
          >
            <Award className="w-4 h-4 text-novera-gold" />
            <span>2. Judges&rsquo; Scores ({judgeScores.length} Evaluated)</span>
          </button>

          <button
            onClick={() => setActiveTab('summary')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold tracking-wider uppercase transition-all ${
              activeTab === 'summary'
                ? 'bg-novera-foil text-novera-paper shadow-md'
                : 'text-novera-charcoal hover:text-novera-ink'
            }`}
          >
            <Crown className="w-4 h-4 text-novera-paper" />
            <span>3. Final Winners Summary</span>
          </button>
        </div>
      </div>

      {/* ================= TAB 1: AUDIENCE VOTES ================= */}
      {activeTab === 'audience' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white border border-novera-ink/10 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs uppercase tracking-wider text-novera-silver font-semibold">Total Audience Votes</span>
                <div className="text-3xl font-serif font-bold text-novera-ink mt-1">{totalOverallVotes}</div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-novera-paper-dim flex items-center justify-center">
                <Vote className="w-6 h-6 text-novera-foil" />
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-novera-ink/10 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs uppercase tracking-wider text-novera-silver font-semibold">Best Male Votes</span>
                <div className="text-3xl font-serif font-bold text-novera-foil mt-1">{totalBoyVotes}</div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-novera-paper-dim flex items-center justify-center">
                <Crown className="w-6 h-6 text-novera-foil" />
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-novera-ink/10 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs uppercase tracking-wider text-novera-silver font-semibold">Best Female Votes</span>
                <div className="text-3xl font-serif font-bold text-novera-ink mt-1">{totalGirlVotes}</div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-novera-paper-dim flex items-center justify-center">
                <Crown className="w-6 h-6 text-novera-ink" />
              </div>
            </div>
          </div>

          {/* Leaders Showcase */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Leading Boy */}
            <div className="p-6 rounded-3xl bg-white border-2 border-novera-foil/30 shadow-md flex items-center gap-5">
              <div className="relative w-24 h-24 rounded-2xl overflow-hidden shrink-0 shadow-inner">
                {topBoyAudience && (
                  <Image src={topBoyAudience.imageUrl} alt={topBoyAudience.name} fill className="object-cover" />
                )}
              </div>
              <div className="flex-grow">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-novera-foil/15 text-[10px] font-bold uppercase tracking-wider text-novera-foil mb-1">
                  <Crown className="w-3 h-3" />
                  <span>Audience Favorite &bull; Male</span>
                </div>
                <h3 className="font-serif text-xl font-bold text-novera-ink">{topBoyAudience?.name || 'N/A'}</h3>
                <div className="text-xs text-novera-charcoal mt-1">
                  <strong className="text-novera-foil text-base font-mono">{topBoyAudience?.votes || 0}</strong> votes (
                  {totalBoyVotes > 0 ? Math.round(((topBoyAudience?.votes || 0) / totalBoyVotes) * 100) : 0}%)
                </div>
              </div>
            </div>

            {/* Leading Girl */}
            <div className="p-6 rounded-3xl bg-white border-2 border-novera-foil/30 shadow-md flex items-center gap-5">
              <div className="relative w-24 h-24 rounded-2xl overflow-hidden shrink-0 shadow-inner">
                {topGirlAudience && (
                  <Image src={topGirlAudience.imageUrl} alt={topGirlAudience.name} fill className="object-cover" />
                )}
              </div>
              <div className="flex-grow">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-novera-foil/15 text-[10px] font-bold uppercase tracking-wider text-novera-foil mb-1">
                  <Crown className="w-3 h-3" />
                  <span>Audience Favorite &bull; Female</span>
                </div>
                <h3 className="font-serif text-xl font-bold text-novera-ink">{topGirlAudience?.name || 'N/A'}</h3>
                <div className="text-xs text-novera-charcoal mt-1">
                  <strong className="text-novera-foil text-base font-mono">{topGirlAudience?.votes || 0}</strong> votes (
                  {totalGirlVotes > 0 ? Math.round(((topGirlAudience?.votes || 0) / totalGirlVotes) * 100) : 0}%)
                </div>
              </div>
            </div>
          </div>

          {/* Bar Chart Section */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-novera-ink/10 shadow-editorial">
            <div className="flex flex-col sm:flex-row items-center justify-between pb-6 border-b border-novera-ink/10 gap-4">
              <div>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-novera-ink">
                  Live Vote Distribution (Bar Chart)
                </h2>
                <p className="text-xs text-novera-charcoal">Real-time vote comparison across models</p>
              </div>

              {/* Chart Tabs */}
              <div className="inline-flex p-1 rounded-xl bg-novera-paper-dim border border-novera-ink/10 text-xs">
                <button
                  onClick={() => setChartCategory('both')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    chartCategory === 'both' ? 'bg-white shadow text-novera-ink font-bold' : 'text-novera-charcoal'
                  }`}
                >
                  All Models
                </button>
                <button
                  onClick={() => setChartCategory('boy')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    chartCategory === 'boy' ? 'bg-white shadow text-novera-ink font-bold' : 'text-novera-charcoal'
                  }`}
                >
                  Boys Only
                </button>
                <button
                  onClick={() => setChartCategory('girl')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    chartCategory === 'girl' ? 'bg-white shadow text-novera-ink font-bold' : 'text-novera-charcoal'
                  }`}
                >
                  Girls Only
                </button>
              </div>
            </div>

            <div className="mt-8 h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#666' }} interval={0} angle={-25} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11, fill: '#666' }} allowDecimals={false} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-novera-ink text-novera-paper p-3 rounded-xl shadow-xl text-xs space-y-1">
                            <div className="font-bold text-novera-gold">{data.fullName}</div>
                            <div className="text-novera-silver">Category: {data.category}</div>
                            <div className="font-mono text-sm font-bold">{data.votes} votes</div>
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
          <div className="p-6 rounded-2xl bg-white border border-novera-ink/10 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-sm text-novera-ink">Audience Vote Management</h4>
              <p className="text-xs text-novera-charcoal">Test or clear public votes before the live session</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSimulateVotes}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-novera-paper-dim border border-novera-ink/15 text-novera-ink hover:bg-novera-ink hover:text-novera-paper transition-all"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Simulate Demo Votes</span>
              </button>
              <button
                onClick={handleResetVotes}
                disabled={isResetting}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Audience Votes</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: JUDGES' SCORES ================= */}
      {activeTab === 'judges' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Top Judges Summary Banner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Boy by Judges */}
            <div className="p-6 rounded-3xl bg-white border-2 border-novera-foil/30 shadow-md flex items-center gap-5">
              <div className="relative w-24 h-24 rounded-2xl overflow-hidden shrink-0 shadow-inner">
                {topBoyJudge && (
                  <Image src={topBoyJudge.candidate.imageUrl} alt={topBoyJudge.candidate.name} fill className="object-cover" />
                )}
              </div>
              <div className="flex-grow">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-novera-foil/15 text-[10px] font-bold uppercase tracking-wider text-novera-foil mb-1">
                  <Trophy className="w-3 h-3" />
                  <span>Jury Best Male &bull; Most Talented</span>
                </div>
                <h3 className="font-serif text-xl font-bold text-novera-ink">{topBoyJudge?.candidate.name || 'N/A'}</h3>
                <div className="text-xs text-novera-charcoal mt-1">
                  Average Score: <strong className="text-novera-foil text-lg font-mono">{topBoyJudge?.averageScore || 0}</strong> / 100
                  ({topBoyJudge?.judgeCount || 0} judges scored)
                </div>
              </div>
            </div>

            {/* Top Girl by Judges */}
            <div className="p-6 rounded-3xl bg-white border-2 border-novera-foil/30 shadow-md flex items-center gap-5">
              <div className="relative w-24 h-24 rounded-2xl overflow-hidden shrink-0 shadow-inner">
                {topGirlJudge && (
                  <Image src={topGirlJudge.candidate.imageUrl} alt={topGirlJudge.candidate.name} fill className="object-cover" />
                )}
              </div>
              <div className="flex-grow">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-novera-foil/15 text-[10px] font-bold uppercase tracking-wider text-novera-foil mb-1">
                  <Trophy className="w-3 h-3" />
                  <span>Jury Best Female &bull; Most Talented</span>
                </div>
                <h3 className="font-serif text-xl font-bold text-novera-ink">{topGirlJudge?.candidate.name || 'N/A'}</h3>
                <div className="text-xs text-novera-charcoal mt-1">
                  Average Score: <strong className="text-novera-foil text-lg font-mono">{topGirlJudge?.averageScore || 0}</strong> / 100
                  ({topGirlJudge?.judgeCount || 0} judges scored)
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Judge Score Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Boys Leaderboard by Judges */}
            <div className="p-6 rounded-3xl bg-white border border-novera-ink/10 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-novera-ink/10">
                <h3 className="font-serif text-lg font-bold text-novera-ink flex items-center gap-2">
                  <Crown className="w-4 h-4 text-novera-foil" />
                  <span>Male Contenders &bull; Jury Rankings</span>
                </h3>
                <span className="text-xs text-novera-silver">Sorted by Average Score</span>
              </div>

              <div className="space-y-3">
                {boysJudgeStats.map((stat, idx) => (
                  <div
                    key={stat.candidate.id}
                    className="p-3.5 rounded-2xl bg-novera-paper-dim border border-novera-ink/5 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-novera-ink text-novera-paper text-xs font-bold flex items-center justify-center shrink-0">
                        #{idx + 1}
                      </div>
                      <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0">
                        <Image src={stat.candidate.imageUrl} alt={stat.candidate.name} fill className="object-cover" />
                      </div>
                      <div>
                        <div className="font-serif font-bold text-sm text-novera-ink">{stat.candidate.name}</div>
                        <div className="text-[11px] text-novera-charcoal">
                          {stat.candidate.candidateNumber} &bull; {stat.judgeCount} judge(s)
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono text-base font-bold text-novera-foil">
                        {stat.averageScore} <span className="text-xs text-novera-charcoal font-sans">/ 100</span>
                      </div>
                      <div className="text-[10px] text-novera-silver">Total: {stat.totalScore} pts</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Girls Leaderboard by Judges */}
            <div className="p-6 rounded-3xl bg-white border border-novera-ink/10 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-novera-ink/10">
                <h3 className="font-serif text-lg font-bold text-novera-ink flex items-center gap-2">
                  <Crown className="w-4 h-4 text-novera-foil" />
                  <span>Female Contenders &bull; Jury Rankings</span>
                </h3>
                <span className="text-xs text-novera-silver">Sorted by Average Score</span>
              </div>

              <div className="space-y-3">
                {girlsJudgeStats.map((stat, idx) => (
                  <div
                    key={stat.candidate.id}
                    className="p-3.5 rounded-2xl bg-novera-paper-dim border border-novera-ink/5 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-novera-ink text-novera-paper text-xs font-bold flex items-center justify-center shrink-0">
                        #{idx + 1}
                      </div>
                      <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0">
                        <Image src={stat.candidate.imageUrl} alt={stat.candidate.name} fill className="object-cover" />
                      </div>
                      <div>
                        <div className="font-serif font-bold text-sm text-novera-ink">{stat.candidate.name}</div>
                        <div className="text-[11px] text-novera-charcoal">
                          {stat.candidate.candidateNumber} &bull; {stat.judgeCount} judge(s)
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono text-base font-bold text-novera-foil">
                        {stat.averageScore} <span className="text-xs text-novera-charcoal font-sans">/ 100</span>
                      </div>
                      <div className="text-[10px] text-novera-silver">Total: {stat.totalScore} pts</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Reset Judges Scores */}
          <div className="p-6 rounded-2xl bg-white border border-novera-ink/10 shadow-sm flex items-center justify-between">
            <div>
              <h4 className="font-bold text-sm text-novera-ink">Reset Judge Scoring Data</h4>
              <p className="text-xs text-novera-charcoal">Clear all scorecards submitted by judges to begin a fresh round</p>
            </div>
            <button
              onClick={handleResetJudges}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-all"
            >
              Reset All Judge Scores
            </button>
          </div>
        </div>
      )}

      {/* ================= TAB 3: FINAL WINNERS SUMMARY ================= */}
      {activeTab === 'summary' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-novera-foil/15 text-xs uppercase tracking-widest font-bold text-novera-foil">
              <Trophy className="w-4 h-4 text-novera-gold" />
              <span>Official Award Winners Summary</span>
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-novera-ink">
              NOVERA &rsquo;26 Titles
            </h2>
            <p className="text-xs sm:text-sm text-novera-charcoal">
              Consolidated announcement card for MCs and Organizing Committee
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Category 1: Audience Choice Awards */}
            <div className="p-8 rounded-3xl bg-white border-2 border-novera-ink/10 shadow-editorial space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-novera-ink/10">
                <div className="w-12 h-12 rounded-2xl bg-novera-ink text-novera-gold flex items-center justify-center shrink-0">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-novera-foil">
                    Audience Public Choice
                  </span>
                  <h3 className="font-serif text-xl font-bold text-novera-ink">
                    Most Popular Runway Models
                  </h3>
                </div>
              </div>

              {/* King Audience */}
              <div className="p-4 rounded-2xl bg-novera-paper-dim flex items-center gap-4">
                <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0">
                  {topBoyAudience && (
                    <Image src={topBoyAudience.imageUrl} alt={topBoyAudience.name} fill className="object-cover" />
                  )}
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-novera-foil tracking-wider">
                    King of the Runway (Audience)
                  </span>
                  <h4 className="font-serif text-lg font-bold text-novera-ink">
                    {topBoyAudience?.name || 'To Be Announced'}
                  </h4>
                  <div className="text-xs text-novera-charcoal">
                    {topBoyAudience?.votes || 0} votes recorded
                  </div>
                </div>
              </div>

              {/* Queen Audience */}
              <div className="p-4 rounded-2xl bg-novera-paper-dim flex items-center gap-4">
                <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0">
                  {topGirlAudience && (
                    <Image src={topGirlAudience.imageUrl} alt={topGirlAudience.name} fill className="object-cover" />
                  )}
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-novera-foil tracking-wider">
                    Queen of the Runway (Audience)
                  </span>
                  <h4 className="font-serif text-lg font-bold text-novera-ink">
                    {topGirlAudience?.name || 'To Be Announced'}
                  </h4>
                  <div className="text-xs text-novera-charcoal">
                    {topGirlAudience?.votes || 0} votes recorded
                  </div>
                </div>
              </div>
            </div>

            {/* Category 2: Jury / Most Talented Awards */}
            <div className="p-8 rounded-3xl bg-white border-2 border-novera-foil/30 shadow-editorial space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-novera-ink/10">
                <div className="w-12 h-12 rounded-2xl bg-novera-foil text-novera-paper flex items-center justify-center shrink-0">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-novera-foil">
                    Jury &bull; Official Evaluation
                  </span>
                  <h3 className="font-serif text-xl font-bold text-novera-ink">
                    Most Talented Runway Models
                  </h3>
                </div>
              </div>

              {/* Best Male Jury */}
              <div className="p-4 rounded-2xl bg-novera-paper-dim flex items-center gap-4">
                <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0">
                  {topBoyJudge && (
                    <Image src={topBoyJudge.candidate.imageUrl} alt={topBoyJudge.candidate.name} fill className="object-cover" />
                  )}
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-novera-foil tracking-wider">
                    Best Male Model (Judges&rsquo; Choice)
                  </span>
                  <h4 className="font-serif text-lg font-bold text-novera-ink">
                    {topBoyJudge?.candidate.name || 'To Be Announced'}
                  </h4>
                  <div className="text-xs text-novera-charcoal">
                    Score: {topBoyJudge?.averageScore || 0}/100 ({topBoyJudge?.judgeCount || 0} judges)
                  </div>
                </div>
              </div>

              {/* Best Female Jury */}
              <div className="p-4 rounded-2xl bg-novera-paper-dim flex items-center gap-4">
                <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0">
                  {topGirlJudge && (
                    <Image src={topGirlJudge.candidate.imageUrl} alt={topGirlJudge.candidate.name} fill className="object-cover" />
                  )}
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-novera-foil tracking-wider">
                    Best Female Model (Judges&rsquo; Choice)
                  </span>
                  <h4 className="font-serif text-lg font-bold text-novera-ink">
                    {topGirlJudge?.candidate.name || 'To Be Announced'}
                  </h4>
                  <div className="text-xs text-novera-charcoal">
                    Score: {topGirlJudge?.averageScore || 0}/100 ({topGirlJudge?.judgeCount || 0} judges)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
