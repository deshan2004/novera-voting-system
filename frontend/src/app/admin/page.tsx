'use client';

import { useState, useEffect } from 'react';
import { Candidate } from '@/lib/types';
import {
  fetchCandidates,
  resetAllVotes,
  saveLocalCandidates,
  getLocalCandidates,
  subscribeToCandidates,
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
} from 'lucide-react';
import Link from 'next/link';

export default function AdminLeaderboardPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [votingActive, setVotingActive] = useState<boolean>(true);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [chartTab, setChartTab] = useState<'both' | 'boy' | 'girl'>('both');

  const loadData = () => {
    fetchCandidates().then((list) => {
      setCandidates(list);
    });
  };

  useEffect(() => {
    // 1. Initial load
    loadData();

    // 2. Real-time Firebase Firestore listener
    const unsubscribeFirebase = subscribeToCandidates((updatedList) => {
      setCandidates(updatedList);
    });

    // 3. Fallback poll interval
    const interval = setInterval(loadData, 3000);

    const handleVoteSync = () => loadData();
    window.addEventListener('novera_vote_updated', handleVoteSync);

    return () => {
      unsubscribeFirebase();
      clearInterval(interval);
      window.removeEventListener('novera_vote_updated', handleVoteSync);
    };
  }, []);

  const boys = candidates
    .filter((c) => c.category === 'boy')
    .sort((a, b) => (b.votes || 0) - (a.votes || 0));

  const girls = candidates
    .filter((c) => c.category === 'girl')
    .sort((a, b) => (b.votes || 0) - (a.votes || 0));

  const totalBoyVotes = boys.reduce((sum, c) => sum + (c.votes || 0), 0);
  const totalGirlVotes = girls.reduce((sum, c) => sum + (c.votes || 0), 0);
  const totalOverallVotes = totalBoyVotes + totalGirlVotes;

  const topBoy = boys[0];
  const topGirl = girls[0];

  const handleReset = async () => {
    if (!window.confirm('Are you sure you want to reset all votes back to 0? This action cannot be undone.')) {
      return;
    }
    setIsResetting(true);
    await resetAllVotes();
    loadData();
    setIsResetting(false);
  };

  const handleSimulateVotes = () => {
    // Add random votes for demonstration purposes
    const updated = candidates.map((c) => ({
      ...c,
      votes: (c.votes || 0) + Math.floor(Math.random() * 5) + 1,
    }));
    saveLocalCandidates(updated);
    setCandidates(updated);
    window.dispatchEvent(new Event('novera_vote_updated'));
  };

  // Prepare chart data format
  const boyChartData = boys.map((c) => ({
    name: c.name.split(' ')[0],
    fullName: c.name,
    number: c.candidateNumber,
    votes: c.votes || 0,
    percentage: totalBoyVotes > 0 ? Math.round(((c.votes || 0) / totalBoyVotes) * 100) : 0,
  }));

  const girlChartData = girls.map((c) => ({
    name: c.name.split(' ')[0],
    fullName: c.name,
    number: c.candidateNumber,
    votes: c.votes || 0,
    percentage: totalGirlVotes > 0 ? Math.round(((c.votes || 0) / totalGirlVotes) * 100) : 0,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
      {/* Top Header & Admin Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-novera-ink/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-novera-foil/15 border border-novera-foil/30 text-xs uppercase tracking-widest font-semibold text-novera-foil mb-2">
            <Trophy className="w-3.5 h-3.5 text-novera-gold" />
            <span>Executive Command Center</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-novera-ink">
            Live Voting Leaderboard
          </h1>
          <p className="text-xs sm:text-sm text-novera-charcoal mt-1">
            Real-time bar charts &amp; analytics for Best Male Model and Best Female Model.
          </p>
        </div>

        {/* Admin Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setVotingActive(!votingActive)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold tracking-wider uppercase transition-all ${
              votingActive
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-amber-600 text-white hover:bg-amber-700'
            }`}
          >
            {votingActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{votingActive ? 'Voting Live' : 'Voting Paused'}</span>
          </button>

          <button
            onClick={handleSimulateVotes}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-novera-ink/15 text-novera-ink hover:border-novera-foil text-xs font-semibold tracking-wider uppercase transition-all shadow-sm"
            title="Add random votes to preview bar chart motion"
          >
            <Shuffle className="w-3.5 h-3.5 text-novera-foil" />
            <span>Simulate Votes</span>
          </button>

          <button
            onClick={handleReset}
            disabled={isResetting}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 text-xs font-semibold tracking-wider uppercase transition-all"
            title="Reset all vote tallies to zero"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isResetting ? 'Resetting...' : 'Reset Votes'}</span>
          </button>

          <Link
            href="/qr"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-novera-ink text-novera-paper hover:bg-novera-foil text-xs font-semibold tracking-wider uppercase transition-all"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Stage QR</span>
          </Link>
        </div>
      </div>

      {/* Stats KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 rounded-2xl bg-white border border-novera-ink/10 shadow-editorial">
          <div className="text-xs uppercase tracking-wider text-novera-silver font-semibold">Total Votes Cast</div>
          <div className="font-serif text-3xl sm:text-4xl font-bold text-novera-ink mt-2">
            {totalOverallVotes}
          </div>
          <div className="text-xs text-novera-charcoal mt-1 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Strict single-ballot verification</span>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-novera-ink/10 shadow-editorial">
          <div className="text-xs uppercase tracking-wider text-novera-silver font-semibold">Male Model (Boy) Votes</div>
          <div className="font-serif text-3xl sm:text-4xl font-bold text-novera-ink mt-2">
            {totalBoyVotes}
          </div>
          <div className="text-xs text-novera-foil mt-1 font-medium">
            Across {boys.length} male contenders
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-novera-ink/10 shadow-editorial">
          <div className="text-xs uppercase tracking-wider text-novera-silver font-semibold">Female Model (Girl) Votes</div>
          <div className="font-serif text-3xl sm:text-4xl font-bold text-novera-ink mt-2">
            {totalGirlVotes}
          </div>
          <div className="text-xs text-novera-foil mt-1 font-medium">
            Across {girls.length} female contenders
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-novera-ink text-novera-paper shadow-luxury border border-novera-foil/40">
          <div className="text-xs uppercase tracking-wider text-novera-gold font-semibold">Ballot Integrity</div>
          <div className="font-serif text-xl font-bold text-novera-paper mt-2 flex items-center gap-2">
            <span>1 Boy + 1 Girl</span>
          </div>
          <div className="text-xs text-novera-silver mt-1">
            Device fingerprint &amp; session lock
          </div>
        </div>
      </div>

      {/* Featured Current Leaders Showcase */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Leading Boy Card */}
        <div className="p-6 rounded-3xl bg-white border-2 border-novera-foil/40 shadow-editorial relative overflow-hidden flex flex-col sm:flex-row items-center gap-6">
          <div className="absolute top-3 right-3 flex items-center gap-1 px-3 py-1 rounded-full bg-novera-foil text-novera-paper text-[10px] font-bold uppercase tracking-widest">
            <Crown className="w-3.5 h-3.5 text-novera-gold" />
            <span>Leader &bull; Male</span>
          </div>

          <div className="relative w-28 h-36 rounded-2xl overflow-hidden shrink-0 shadow-md">
            {topBoy && (
              <img
                src={topBoy.imageUrl}
                alt={topBoy.name}
                className="w-full h-full object-cover"
              />
            )}
          </div>

          <div className="space-y-2 text-center sm:text-left flex-grow">
            <span className="text-xs font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-novera-paper-dim text-novera-charcoal">
              {topBoy?.candidateNumber || 'M-01'}
            </span>
            <h3 className="font-serif text-2xl font-bold text-novera-ink">
              {topBoy?.name || 'No votes yet'}
            </h3>
            <div className="flex items-center justify-center sm:justify-start gap-4 text-xs">
              <span className="text-novera-foil font-bold text-base">
                {topBoy?.votes || 0} votes
              </span>
              <span className="text-novera-silver">
                {totalBoyVotes > 0 ? Math.round(((topBoy?.votes || 0) / totalBoyVotes) * 100) : 0}% of category
              </span>
            </div>
            <p className="text-xs text-novera-charcoal line-clamp-2">
              {topBoy?.bio}
            </p>
          </div>
        </div>

        {/* Leading Girl Card */}
        <div className="p-6 rounded-3xl bg-white border-2 border-novera-foil/40 shadow-editorial relative overflow-hidden flex flex-col sm:flex-row items-center gap-6">
          <div className="absolute top-3 right-3 flex items-center gap-1 px-3 py-1 rounded-full bg-novera-foil text-novera-paper text-[10px] font-bold uppercase tracking-widest">
            <Crown className="w-3.5 h-3.5 text-novera-gold" />
            <span>Leader &bull; Female</span>
          </div>

          <div className="relative w-28 h-36 rounded-2xl overflow-hidden shrink-0 shadow-md">
            {topGirl && (
              <img
                src={topGirl.imageUrl}
                alt={topGirl.name}
                className="w-full h-full object-cover"
              />
            )}
          </div>

          <div className="space-y-2 text-center sm:text-left flex-grow">
            <span className="text-xs font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-novera-paper-dim text-novera-charcoal">
              {topGirl?.candidateNumber || 'F-01'}
            </span>
            <h3 className="font-serif text-2xl font-bold text-novera-ink">
              {topGirl?.name || 'No votes yet'}
            </h3>
            <div className="flex items-center justify-center sm:justify-start gap-4 text-xs">
              <span className="text-novera-foil font-bold text-base">
                {topGirl?.votes || 0} votes
              </span>
              <span className="text-novera-silver">
                {totalGirlVotes > 0 ? Math.round(((topGirl?.votes || 0) / totalGirlVotes) * 100) : 0}% of category
              </span>
            </div>
            <p className="text-xs text-novera-charcoal line-clamp-2">
              {topGirl?.bio}
            </p>
          </div>
        </div>
      </div>

      {/* Bar Charts Section */}
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-novera-foil" />
            <h2 className="font-serif text-2xl font-bold text-novera-ink">Comparative Bar Charts</h2>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => setChartTab('both')}
              className={`px-3 py-1 rounded-full font-medium ${
                chartTab === 'both' ? 'bg-novera-ink text-white' : 'bg-novera-paper-dim text-novera-charcoal'
              }`}
            >
              Side-by-Side
            </button>
            <button
              onClick={() => setChartTab('boy')}
              className={`px-3 py-1 rounded-full font-medium ${
                chartTab === 'boy' ? 'bg-novera-ink text-white' : 'bg-novera-paper-dim text-novera-charcoal'
              }`}
            >
              Boys Only
            </button>
            <button
              onClick={() => setChartTab('girl')}
              className={`px-3 py-1 rounded-full font-medium ${
                chartTab === 'girl' ? 'bg-novera-ink text-white' : 'bg-novera-paper-dim text-novera-charcoal'
              }`}
            >
              Girls Only
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Male Chart */}
          {(chartTab === 'both' || chartTab === 'boy') && (
            <div className="p-6 rounded-3xl bg-white border border-novera-ink/10 shadow-editorial">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-serif text-lg font-bold text-novera-ink">Male Model Votes</h3>
                  <p className="text-xs text-novera-charcoal">Real-time vote distribution</p>
                </div>
                <span className="text-xs font-mono font-bold text-novera-foil bg-novera-paper-dim px-2.5 py-1 rounded-md">
                  Total: {totalBoyVotes}
                </span>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={boyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8e3d6" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#423e35', fontSize: 11 }}
                      axisLine={{ stroke: '#e8e3d6' }}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: '#423e35', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-novera-ink text-novera-paper p-3 rounded-xl shadow-xl text-xs space-y-1">
                              <p className="font-bold text-novera-gold">{data.fullName} ({data.number})</p>
                              <p>Votes: <strong className="text-white">{data.votes}</strong></p>
                              <p>Share: <strong className="text-novera-gold-light">{data.percentage}%</strong></p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="votes" radius={[8, 8, 0, 0]} animationDuration={800}>
                      {boyChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={index === 0 && entry.votes > 0 ? '#b3924f' : '#423e35'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Female Chart */}
          {(chartTab === 'both' || chartTab === 'girl') && (
            <div className="p-6 rounded-3xl bg-white border border-novera-ink/10 shadow-editorial">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-serif text-lg font-bold text-novera-ink">Female Model Votes</h3>
                  <p className="text-xs text-novera-charcoal">Real-time vote distribution</p>
                </div>
                <span className="text-xs font-mono font-bold text-novera-foil bg-novera-paper-dim px-2.5 py-1 rounded-md">
                  Total: {totalGirlVotes}
                </span>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={girlChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8e3d6" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#423e35', fontSize: 11 }}
                      axisLine={{ stroke: '#e8e3d6' }}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: '#423e35', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-novera-ink text-novera-paper p-3 rounded-xl shadow-xl text-xs space-y-1">
                              <p className="font-bold text-novera-gold">{data.fullName} ({data.number})</p>
                              <p>Votes: <strong className="text-white">{data.votes}</strong></p>
                              <p>Share: <strong className="text-novera-gold-light">{data.percentage}%</strong></p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="votes" radius={[8, 8, 0, 0]} animationDuration={800}>
                      {girlChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={index === 0 && entry.votes > 0 ? '#b3924f' : '#6b5e4a'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Ranked Candidate Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Male Contenders Ranked */}
        <div className="p-6 rounded-3xl bg-white border border-novera-ink/10 shadow-editorial">
          <h3 className="font-serif text-xl font-bold text-novera-ink mb-4 flex items-center justify-between">
            <span>Male Model Standings</span>
            <span className="text-xs uppercase tracking-wider text-novera-silver font-normal">Ranked by votes</span>
          </h3>
          <div className="space-y-3">
            {boys.map((candidate, idx) => {
              const pct = totalBoyVotes > 0 ? Math.round(((candidate.votes || 0) / totalBoyVotes) * 100) : 0;
              return (
                <div
                  key={candidate.id}
                  className="p-3 rounded-xl bg-novera-paper/60 hover:bg-novera-paper-dim flex items-center justify-between gap-4 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx === 0
                          ? 'bg-novera-foil text-novera-paper'
                          : 'bg-novera-paper-dim text-novera-charcoal'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <img
                      src={candidate.imageUrl}
                      alt={candidate.name}
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                    <div>
                      <div className="font-semibold text-xs text-novera-ink">{candidate.name}</div>
                      <div className="text-[10px] text-novera-silver font-mono">{candidate.candidateNumber}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-xs text-novera-ink">{candidate.votes || 0} votes</div>
                    <div className="text-[10px] text-novera-foil">{pct}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Female Contenders Ranked */}
        <div className="p-6 rounded-3xl bg-white border border-novera-ink/10 shadow-editorial">
          <h3 className="font-serif text-xl font-bold text-novera-ink mb-4 flex items-center justify-between">
            <span>Female Model Standings</span>
            <span className="text-xs uppercase tracking-wider text-novera-silver font-normal">Ranked by votes</span>
          </h3>
          <div className="space-y-3">
            {girls.map((candidate, idx) => {
              const pct = totalGirlVotes > 0 ? Math.round(((candidate.votes || 0) / totalGirlVotes) * 100) : 0;
              return (
                <div
                  key={candidate.id}
                  className="p-3 rounded-xl bg-novera-paper/60 hover:bg-novera-paper-dim flex items-center justify-between gap-4 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx === 0
                          ? 'bg-novera-foil text-novera-paper'
                          : 'bg-novera-paper-dim text-novera-charcoal'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <img
                      src={candidate.imageUrl}
                      alt={candidate.name}
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                    <div>
                      <div className="font-semibold text-xs text-novera-ink">{candidate.name}</div>
                      <div className="text-[10px] text-novera-silver font-mono">{candidate.candidateNumber}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-xs text-novera-ink">{candidate.votes || 0} votes</div>
                    <div className="text-[10px] text-novera-foil">{pct}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

