'use client';

import { useState, useEffect, useMemo } from 'react';
import { Candidate, GenderCategory, JudgeScore } from '@/lib/types';
import { fetchCandidates, saveJudgeScore, getLocalJudgeScores, subscribeToJudgeScores } from '@/lib/api';
import Image from 'next/image';
import confetti from 'canvas-confetti';
import {
  Award,
  CheckCircle2,
  Lock,
  Sparkles,
  LogOut,
  Sliders,
  AlertCircle,
  Save,
  Radio,
  Check,
  Zap,
  Camera,
  Heart,
  Crown,
  Eye,
  CheckCheck,
  Compass,
  X,
  Search,
} from 'lucide-react';
import RunwayStageBackground from '@/app/components/RunwayStageBackground';

const OFFICIAL_JUDGES = [
  { id: 'judge_piyumi', name: 'Judge Piyumi', title: 'Fashion & Runway Jury', code: 'piyumi' },
  { id: 'judge_kalwani', name: 'Judge Kalwani', title: 'Styling & Visual Jury', code: 'kalwani' },
  { id: 'judge_devdunu', name: 'Judge Devdunu', title: 'Poise & Presence Jury', code: 'devdunu' },
  { id: 'judge_erusha', name: 'Judge Erusha', title: 'Runway Technique Jury', code: 'erusha' },
  { id: 'judge_sachith', name: 'Judge Sachith', title: 'Personality & Charisma Jury', code: 'sachith' },
  { id: 'judge_dulmi', name: 'Judge Dulmi', title: 'Elegance & Wardrobe Jury', code: 'dulmi' },
];

export default function JudgePortalPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [passcode, setPasscode] = useState<string>('');
  const [passcodeError, setPasscodeError] = useState<string>('');
  const [selectedJudgeId, setSelectedJudgeId] = useState<string>('judge_piyumi');

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<GenderCategory>('boy');
  const [judgeScores, setJudgeScores] = useState<JudgeScore[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [scoreFilter, setScoreFilter] = useState<'all' | 'unscored' | 'scored'>('all');

  // Active scoring candidate
  const [scoringCandidate, setScoringCandidate] = useState<Candidate | null>(null);
  const [scorecardTab, setScorecardTab] = useState<'model' | 'design'>('model');

  // 1. Model Official Runway Criteria (Max 100)
  const [walking, setWalking] = useState<number>(16); // max 20
  const [confidence, setConfidence] = useState<number>(16); // max 20
  const [stage, setStage] = useState<number>(16); // max 20
  const [posture, setPosture] = useState<number>(12); // max 15
  const [poses, setPoses] = useState<number>(12); // max 15
  const [face, setFace] = useState<number>(8); // max 10

  // 2. Student Design Official Criteria (Max 100)
  const [designCreativity, setDesignCreativity] = useState<number>(24); // max 30
  const [designCraftsmanship, setDesignCraftsmanship] = useState<number>(20); // max 25
  const [designTheme, setDesignTheme] = useState<number>(16); // max 20
  const [designFit, setDesignFit] = useState<number>(12); // max 15
  const [designImpact, setDesignImpact] = useState<number>(8); // max 10

  const [notes, setNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Big dramatic submission animation state
  const [animationState, setAnimationState] = useState<{
    isOpen: boolean;
    step: 1 | 2 | 3;
    score: number;
    candidateName: string;
    judgeName: string;
  } | null>(null);

  useEffect(() => {
    const savedSession = sessionStorage.getItem('novera_judge_auth');
    const savedJudge = localStorage.getItem('novera_active_judge');
    if (savedSession === 'true') {
      setIsAuthenticated(true);
    }
    if (savedJudge) {
      try {
        const parsed = JSON.parse(savedJudge);
        setSelectedJudgeId(parsed.id);
      } catch (e) {}
    }

    fetchCandidates().then(setCandidates);
    setJudgeScores(getLocalJudgeScores());

    const unsubscribe = subscribeToJudgeScores((scores) => {
      setJudgeScores(scores);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Prevent background page scrolling on mobile when scoring modal is open
  useEffect(() => {
    if (scoringCandidate) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [scoringCandidate]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const inputClean = passcode.trim().toLowerCase();

    const matchedJudge = OFFICIAL_JUDGES.find(
      (j) => j.code.toLowerCase() === inputClean || j.name.toLowerCase().includes(inputClean)
    );

    if (matchedJudge) {
      setSelectedJudgeId(matchedJudge.id);
      setIsAuthenticated(true);
      sessionStorage.setItem('novera_judge_auth', 'true');
      localStorage.setItem('novera_active_judge', JSON.stringify(matchedJudge));
      setPasscodeError('');
    } else if (inputClean === 'judge2026' || inputClean === 'novera') {
      const defaultJudge = OFFICIAL_JUDGES[0];
      setSelectedJudgeId(defaultJudge.id);
      setIsAuthenticated(true);
      sessionStorage.setItem('novera_judge_auth', 'true');
      localStorage.setItem('novera_active_judge', JSON.stringify(defaultJudge));
      setPasscodeError('');
    } else {
      setPasscodeError('Invalid Judge Passcode. Please enter your authorized name.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('novera_judge_auth');
  };

  const activeJudge = OFFICIAL_JUDGES.find((j) => j.id === selectedJudgeId) || OFFICIAL_JUDGES[0];

  const openScoringModal = (candidate: Candidate) => {
    setScoringCandidate(candidate);

    const existing = judgeScores.find(
      (s) => s.judgeId === selectedJudgeId && s.candidateId === candidate.id
    );

    if (existing) {
      setWalking(existing.walking ?? 16);
      setConfidence(existing.confidence ?? 16);
      setStage(existing.stage ?? 16);
      setPosture(existing.posture ?? 12);
      setPoses(existing.poses ?? 12);
      setFace(existing.face ?? 8);

      setDesignCreativity(existing.designCreativity ?? 24);
      setDesignCraftsmanship(existing.designCraftsmanship ?? 20);
      setDesignTheme(existing.designTheme ?? 16);
      setDesignFit(existing.designFit ?? 12);
      setDesignImpact(existing.designImpact ?? 8);

      setNotes(existing.notes || '');
    } else {
      setWalking(16);
      setConfidence(16);
      setStage(16);
      setPosture(12);
      setPoses(12);
      setFace(8);

      setDesignCreativity(24);
      setDesignCraftsmanship(20);
      setDesignTheme(16);
      setDesignFit(12);
      setDesignImpact(8);

      setNotes('');
    }
    setScorecardTab('model');
  };

  // Calculations for titles
  const totalModel = Number(walking) + Number(confidence) + Number(stage) + Number(posture) + Number(poses) + Number(face);
  const totalDesign = Number(designCreativity) + Number(designCraftsmanship) + Number(designTheme) + Number(designFit) + Number(designImpact);
  const personalityScore = Number(confidence) + Number(stage) + Number(face); // max 50
  const stagePresenceScore = Math.min(10, Math.round(Number(confidence) / 2)) + Number(stage); // max 30 (10 conf + 20 stage)
  const photogenicScore = Number(posture) + Number(poses) + Number(face); // max 40

  const handleScoreSubmit = async () => {
    if (!scoringCandidate) return;
    setIsSaving(true);

    const scoreData: JudgeScore = {
      id: `${selectedJudgeId}_${scoringCandidate.id}`,
      judgeId: selectedJudgeId,
      judgeName: activeJudge.name,
      candidateId: scoringCandidate.id,
      candidateCategory: scoringCandidate.category,

      // Model Criteria
      walking: Number(walking),
      confidence: Number(confidence),
      stage: Number(stage),
      posture: Number(posture),
      poses: Number(poses),
      face: Number(face),
      totalModel,

      // Sub-awards
      personalityScore,
      stagePresenceScore,
      photogenicScore,

      // Student Design Criteria (Best Design - Students)
      designCreativity: Number(designCreativity),
      designCraftsmanship: Number(designCraftsmanship),
      designTheme: Number(designTheme),
      designFit: Number(designFit),
      designImpact: Number(designImpact),
      totalDesign,

      notes,
      updatedAt: Date.now(),
    };

    setScoringCandidate(null);
    setIsSaving(false);

    setAnimationState({
      isOpen: true,
      step: 1,
      score: totalModel,
      candidateName: scoringCandidate.name,
      judgeName: activeJudge.name,
    });

    setTimeout(() => {
      setAnimationState((prev) => (prev ? { ...prev, step: 2 } : null));
    }, 900);

    setTimeout(() => {
      setAnimationState((prev) => (prev ? { ...prev, step: 3 } : null));
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.5 },
        colors: ['#b3924f', '#ecd599', '#ff3b30', '#ffffff', '#10b981'],
      });
      saveJudgeScore(scoreData);
    }, 1800);

    setTimeout(() => {
      setAnimationState(null);
    }, 3800);
  };

  const currentCategoryCandidates = useMemo(
    () => candidates.filter((c) => c.category === selectedCategory),
    [candidates, selectedCategory]
  );

  const getScoreForCandidate = (candidateId: string) => {
    return judgeScores.find((s) => s.judgeId === selectedJudgeId && s.candidateId === candidateId);
  };

  const scoredCount = currentCategoryCandidates.filter((c) => !!getScoreForCandidate(c.id)).length;
  const progressPercent = currentCategoryCandidates.length > 0 ? Math.round((scoredCount / currentCategoryCandidates.length) * 100) : 0;

  const filteredCandidates = useMemo(() => {
    return currentCategoryCandidates.filter((c) => {
      const isScored = !!getScoreForCandidate(c.id);
      if (scoreFilter === 'unscored' && isScored) return false;
      if (scoreFilter === 'scored' && !isScored) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const numClean = c.candidateNumber ? c.candidateNumber.toLowerCase() : '';
      const nameClean = c.name.toLowerCase();
      return numClean.includes(q) || nameClean.includes(q);
    });
  }, [currentCategoryCandidates, scoreFilter, searchQuery, judgeScores, selectedJudgeId]);

  const applyPresetProfile = (tier: 'outstanding' | 'excellent' | 'veryGood' | 'fair') => {
    if (tier === 'outstanding') {
      // 94 Total
      setWalking(19);
      setConfidence(19);
      setStage(19);
      setPosture(14);
      setPoses(14);
      setFace(9);
    } else if (tier === 'excellent') {
      // 84 Total
      setWalking(17);
      setConfidence(17);
      setStage(17);
      setPosture(13);
      setPoses(13);
      setFace(7);
    } else if (tier === 'veryGood') {
      // 74 Total
      setWalking(15);
      setConfidence(15);
      setStage(15);
      setPosture(11);
      setPoses(11);
      setFace(7);
    } else if (tier === 'fair') {
      // 60 Total
      setWalking(12);
      setConfidence(12);
      setStage(12);
      setPosture(9);
      setPoses(9);
      setFace(6);
    }
  };

  const applyDesignPresetProfile = (tier: 'outstanding' | 'excellent' | 'veryGood' | 'fair') => {
    if (tier === 'outstanding') {
      // 92 Total
      setDesignCreativity(28); // max 30
      setDesignCraftsmanship(23); // max 25
      setDesignTheme(18); // max 20
      setDesignFit(14); // max 15
      setDesignImpact(9); // max 10
    } else if (tier === 'excellent') {
      // 82 Total
      setDesignCreativity(25);
      setDesignCraftsmanship(20);
      setDesignTheme(16);
      setDesignFit(13);
      setDesignImpact(8);
    } else if (tier === 'veryGood') {
      // 72 Total
      setDesignCreativity(22);
      setDesignCraftsmanship(18);
      setDesignTheme(14);
      setDesignFit(11);
      setDesignImpact(7);
    } else if (tier === 'fair') {
      // 60 Total
      setDesignCreativity(18);
      setDesignCraftsmanship(15);
      setDesignTheme(12);
      setDesignFit(9);
      setDesignImpact(6);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-3 sm:p-4 relative overflow-hidden bg-transparent">
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
              Judges Scoring Portal
            </h1>
            <p className="text-[11px] sm:text-xs text-zinc-300 font-medium">
              Enter your confidential judge passcode to evaluate contestants
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div>
              <label className="block text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-amber-200/90 mb-1.5">
                Judge Passcode
              </label>
              <input
                type="password"
                placeholder="Enter passcode"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full px-4 py-3 sm:py-3.5 rounded-2xl bg-white/10 text-xs sm:text-sm text-white placeholder-zinc-400 outline-none focus:border-amber-400 focus:bg-white/15 font-mono text-center tracking-widest text-base shadow-inner border border-white/20 transition-all backdrop-blur-md"
                required
                autoFocus
              />
            </div>

            {passcodeError && (
              <div className="p-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2 shadow-sm animate-in fade-in duration-200 backdrop-blur-md">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passcodeError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 sm:py-3.5 rounded-full bg-novera-foil text-novera-paper hover:bg-novera-ink transition-all text-xs sm:text-sm font-semibold tracking-wider uppercase shadow-md flex items-center justify-center gap-2 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
              <Lock className="w-4 h-4" />
              <span>Unlock Judges Scorecard</span>
            </button>
          </form>

          <p className="text-[10px] sm:text-[11px] text-zinc-400 font-mono">
            Authorized by NOVERA &rsquo;26 Organizing Committee &bull; AIESEC in CINEC
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-transparent text-white overflow-x-hidden">
      {/* Haute Couture Fashion Runway Stage Animation */}
      <RunwayStageBackground />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 relative z-10">
      {/* 🔴 LIVE ADMIN SURVEILLANCE HUD (FROSTED CRIMSON GLASS LOOK) */}
      <div className="p-4 sm:p-5 rounded-3xl bg-red-950/30 backdrop-blur-2xl border border-red-500/30 text-white relative overflow-hidden shadow-[0_0_25px_rgba(239,68,68,0.2)]">
        {/* Animated Laser Scanner Sweep across glass surface */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/25 to-transparent w-1/3 animate-scan-sweep pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-red-950/80 border border-red-500/80 shrink-0 shadow-[0_0_20px_rgba(239,68,68,0.5)]">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-ping absolute" />
              <Radio className="w-5 h-5 text-red-400 relative z-10" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] sm:text-xs font-mono uppercase tracking-[0.25em] font-bold text-red-400 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 animate-pulse" />
                  <span>LIVE ADMIN SURVEILLANCE ACTIVE</span>
                </span>
              </div>
              <p className="text-xs text-zinc-200 mt-1 font-medium">
                The Central Organizing Committee &amp; Master Admin are actively monitoring your scorecard in real-time.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 text-xs font-semibold tracking-wide">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              <span>LIVE MONITORED</span>
            </span>
          </div>
        </div>
      </div>

      {/* 👑 TOP HEADER CARD WITH LUXURY FROSTED GLASS & PROGRESS METER */}
      <div className="p-6 sm:p-8 rounded-3xl bg-black/40 backdrop-blur-2xl border border-white/15 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden transition-all duration-300 hover:shadow-2xl">
        <div className="flex items-center gap-4 text-center sm:text-left w-full sm:w-auto">
          <div className="relative w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0 border border-novera-gold/40 shadow-lg">
            <Award className="w-7 h-7 text-novera-gold animate-float" />
            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#070605] animate-pulse" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-novera-gold">
              <Sparkles className="w-3.5 h-3.5 text-novera-gold animate-spin" style={{ animationDuration: '6s' }} />
              <span>Official Runway Judges &bull; Seat Verified</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white">
              {activeJudge.name}
            </h1>
            <p className="text-xs text-zinc-300 mt-0.5">
              {activeJudge.title} &bull; Model Performance &amp; Runway Evaluation
            </p>
          </div>
        </div>

        {/* Right Status Controls with Progress Bar */}
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-between md:justify-end">
          <div className="px-4 py-2.5 rounded-2xl bg-white/5 border border-white/15 backdrop-blur-md text-xs space-y-1.5 shadow-sm">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-zinc-300 font-medium">Evaluation:</span>
              <span className="font-mono font-bold text-novera-gold">
                {scoredCount} / {currentCategoryCandidates.length} ({progressPercent}%)
              </span>
            </div>
            <div className="w-32 sm:w-40 h-2 rounded-full bg-white/10 overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-amber-600 via-novera-gold to-amber-200 rounded-full transition-all duration-700 shadow-sm"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-semibold text-rose-300 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 backdrop-blur-md transition-all shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* 🔘 CATEGORY TOGGLE (MODERN FROSTED GLASS PILL) */}
      <div className="flex justify-center px-2 my-2">
        <div className="grid grid-cols-2 gap-2 w-full max-w-xl p-1.5 rounded-full bg-black/50 backdrop-blur-xl border border-white/15 shadow-inner">
          <button
            onClick={() => setSelectedCategory('boy')}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-full text-xs sm:text-sm font-bold tracking-wider uppercase whitespace-nowrap transition-all duration-200 ${
              selectedCategory === 'boy'
                ? 'bg-gradient-to-r from-novera-gold to-amber-500 text-black shadow-lg font-extrabold'
                : 'text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Crown className={`w-3.5 h-3.5 shrink-0 ${selectedCategory === 'boy' ? 'text-black' : 'text-novera-gold'}`} />
            <span>Male (Boys)</span>
          </button>

          <button
            onClick={() => setSelectedCategory('girl')}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-full text-xs sm:text-sm font-bold tracking-wider uppercase whitespace-nowrap transition-all duration-200 ${
              selectedCategory === 'girl'
                ? 'bg-gradient-to-r from-novera-gold to-amber-500 text-black shadow-lg font-extrabold'
                : 'text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Crown className={`w-3.5 h-3.5 shrink-0 ${selectedCategory === 'girl' ? 'text-black' : 'text-novera-gold'}`} />
            <span>Female (Girls)</span>
          </button>
        </div>
      </div>

      {/* 🔍 QUICK SEARCH & RUNWAY CANDIDATE QUICK-JUMP BAR */}
      <div className="bg-black/40 backdrop-blur-xl border border-white/15 rounded-3xl p-3 sm:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Quick search by candidate # (e.g. 01) or model name..."
              className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-white/5 border border-white/15 text-xs sm:text-sm text-white placeholder-zinc-500 outline-none focus:border-novera-gold focus:bg-white/10 transition-all font-mono"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Chips: All / Unscored / Scored */}
          <div className="flex items-center gap-1.5 shrink-0 bg-white/5 p-1 rounded-2xl border border-white/10">
            <button
              type="button"
              onClick={() => setScoreFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                scoreFilter === 'all'
                  ? 'bg-novera-gold text-black shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              All ({currentCategoryCandidates.length})
            </button>
            <button
              type="button"
              onClick={() => setScoreFilter('unscored')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                scoreFilter === 'unscored'
                  ? 'bg-amber-400 text-black shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Pending ({currentCategoryCandidates.length - scoredCount})
            </button>
            <button
              type="button"
              onClick={() => setScoreFilter('scored')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                scoreFilter === 'scored'
                  ? 'bg-emerald-500 text-black shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Scored ({scoredCount})
            </button>
          </div>
        </div>

        {/* ⚡ Quick Runway Number Ribbon (Click any number to immediately open scoring for that model) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-thin">
          <span className="text-[10px] font-mono uppercase tracking-wider text-novera-gold font-bold shrink-0 mr-1 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-novera-gold" />
            <span>Ramp Jumper:</span>
          </span>
          {currentCategoryCandidates.map((candidate) => {
            const isScored = !!getScoreForCandidate(candidate.id);
            return (
              <button
                key={candidate.id}
                type="button"
                onClick={() => openScoringModal(candidate)}
                className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold shrink-0 transition-all border ${
                  isScored
                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 hover:border-emerald-400 shadow-sm'
                    : 'bg-white/5 border-white/15 text-zinc-200 hover:bg-novera-gold hover:text-black hover:border-novera-gold'
                }`}
                title={`Open scorecard for #${candidate.candidateNumber} ${candidate.name}`}
              >
                {candidate.candidateNumber}
                {isScored && ' ✓'}
              </button>
            );
          })}
        </div>
      </div>

      {/* 📸 CANDIDATE GRID WITH FROSTED GLASS CARDS & HOVER EFFECTS */}
      {filteredCandidates.length === 0 ? (
        <div className="text-center py-12 bg-black/40 rounded-3xl border border-white/10 p-6 space-y-2">
          <p className="text-zinc-300 text-sm">No models found matching &ldquo;{searchQuery}&rdquo;</p>
          <button
            type="button"
            onClick={() => { setSearchQuery(''); setScoreFilter('all'); }}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-novera-gold border border-novera-gold/30"
          >
            Clear Search &amp; Show All Models
          </button>
        </div>
      ) : (
        <div key={`${selectedCategory}_${scoreFilter}`} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {filteredCandidates.map((candidate) => {
            const score = getScoreForCandidate(candidate.id);
            const isScored = !!score;

            return (
              <div
                key={candidate.id}
                className={`group rounded-3xl p-5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-2 ${
                  isScored
                    ? 'bg-emerald-950/20 backdrop-blur-xl border border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.15)] text-white'
                    : 'bg-black/40 backdrop-blur-xl border border-white/15 hover:border-novera-gold/60 hover:shadow-2xl text-white'
                }`}
              >
                <div>
                  {/* Image Card with Glass Badges and Hover Zoom */}
                  <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden mb-4 bg-black/40 shadow-inner">
                    <Image
                      src={candidate.imageUrl}
                      alt={candidate.name}
                      fill
                      className="object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
                      sizes="(max-width: 768px) 100vw, 25vw"
                    />

                    {/* Dark Vignette Overlay on Bottom */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

                    {/* Candidate No Glass Badge */}
                    <div className="absolute top-3 left-3 px-3 py-1.5 rounded-xl bg-black/75 border-2 border-novera-gold/60 backdrop-blur-md text-novera-gold font-mono text-sm font-extrabold tracking-wider shadow-lg">
                      {candidate.candidateNumber}
                    </div>

                    {/* Scored Status Glass Badge */}
                    {isScored && (
                      <div className="absolute top-3 right-3 px-2.5 py-1 rounded-xl bg-emerald-600/90 text-white text-[10px] font-bold flex items-center gap-1 shadow-lg backdrop-blur-md border border-emerald-300/40 animate-in zoom-in-75 duration-200">
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-200" />
                        <span>{score.totalModel}/100</span>
                      </div>
                    )}

                    {/* Name Overlay on Photo */}
                    <div className="absolute bottom-3 left-3 right-3">
                      <h3 className="font-serif text-lg font-bold text-white drop-shadow-md truncate">
                        {candidate.name}
                      </h3>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-300 line-clamp-2 mb-4 font-normal">
                    {candidate.bio || 'Official Runway Contender representing elegance, poise, and personality.'}
                  </p>

                  {/* Score Summary Box with Frosted Emerald Glass */}
                  {isScored && (
                    <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-[11px] space-y-1.5 mb-4 shadow-sm text-white">
                      <div className="flex justify-between text-emerald-300 font-bold">
                        <span className="flex items-center gap-1">
                          <Crown className="w-3 h-3 text-emerald-400" />
                          <span>Top Model:</span>
                        </span>
                        <span className="font-mono text-emerald-200">{score.totalModel}/100</span>
                      </div>
                      <div className="flex justify-between text-zinc-300">
                        <span>Best Personality:</span>
                        <span className="font-mono text-white">{score.personalityScore}/50</span>
                      </div>
                      <div className="flex justify-between text-zinc-300">
                        <span>Stage Presence:</span>
                        <span className="font-mono text-white">{score.stagePresenceScore}/30</span>
                      </div>
                      <div className="flex justify-between text-zinc-300">
                        <span>Most Photogenic:</span>
                        <span className="font-mono text-white">{score.photogenicScore}/40</span>
                      </div>
                      <div className="flex justify-between text-amber-300 font-bold border-t border-white/10 pt-1 mt-1">
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-400" />
                          <span>Student Design:</span>
                        </span>
                        <span className="font-mono text-amber-200">{score.totalDesign ?? 0}/100</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Button with Specular Shine */}
                <button
                  onClick={() => openScoringModal(candidate)}
                  className={`w-full py-3 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all relative overflow-hidden group/btn shadow-md ${
                    isScored
                      ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md'
                      : 'bg-gradient-to-r from-[#d4af37] via-[#f3e5ab] to-[#aa7c11] text-black font-extrabold hover:brightness-110 shadow-lg'
                  }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 pointer-events-none" />
                  <Sliders className="w-3.5 h-3.5 group-hover/btn:rotate-45 transition-transform" />
                  <span>{isScored ? 'Update Marks' : 'Evaluate & Score'}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* 🚀 ULTRA-MODERN GLASS SCORING MODAL DRAWER */}
      {scoringCandidate && (() => {
        const criteriaList = [
          {
            id: 'walking',
            title: '1. Walking & Runway Gait',
            subtitle: 'Ramp walk rhythm, pace & smooth cadence',
            max: 20,
            val: walking,
            set: setWalking,
            presets: [
              { label: 'Fair (12)', val: 12 },
              { label: 'Good (15)', val: 15 },
              { label: 'Great (18)', val: 18 },
              { label: 'Top (20)', val: 20 },
            ],
          },
          {
            id: 'confidence',
            title: '2. Confidence & Attitude',
            subtitle: 'Eye focus, fearlessness & character',
            max: 20,
            val: confidence,
            set: setConfidence,
            presets: [
              { label: 'Fair (12)', val: 12 },
              { label: 'Good (15)', val: 15 },
              { label: 'Great (18)', val: 18 },
              { label: 'Top (20)', val: 20 },
            ],
          },
          {
            id: 'stage',
            title: '3. Stage Presence & Impact',
            subtitle: 'Crowd connection & runway aura',
            max: 20,
            val: stage,
            set: setStage,
            presets: [
              { label: 'Fair (12)', val: 12 },
              { label: 'Good (15)', val: 15 },
              { label: 'Great (18)', val: 18 },
              { label: 'Top (20)', val: 20 },
            ],
          },
          {
            id: 'posture',
            title: '4. Posture & Poise',
            subtitle: 'Head position, spine alignment & symmetry',
            max: 15,
            val: posture,
            set: setPosture,
            presets: [
              { label: 'Fair (9)', val: 9 },
              { label: 'Good (12)', val: 12 },
              { label: 'Great (14)', val: 14 },
              { label: 'Top (15)', val: 15 },
            ],
          },
          {
            id: 'poses',
            title: '5. Poses & Runway Turns',
            subtitle: 'Runway halts, 360° pivot & garment showcase',
            max: 15,
            val: poses,
            set: setPoses,
            presets: [
              { label: 'Fair (9)', val: 9 },
              { label: 'Good (12)', val: 12 },
              { label: 'Great (14)', val: 14 },
              { label: 'Top (15)', val: 15 },
            ],
          },
          {
            id: 'face',
            title: '6. Facial Expression & Eye Contact',
            subtitle: 'Camera-ready look & expression control',
            max: 10,
            val: face,
            set: setFace,
            presets: [
              { label: 'Fair (6)', val: 6 },
              { label: 'Good (8)', val: 8 },
              { label: 'Great (9)', val: 9 },
              { label: 'Top (10)', val: 10 },
            ],
          },
        ];

        const designCriteriaList = [
          {
            id: 'designCreativity',
            title: '1. Creativity & Originality',
            subtitle: 'Fresh concept and unique ideas',
            max: 30,
            val: designCreativity,
            set: setDesignCreativity,
            presets: [
              { label: 'Fair (18)', val: 18 },
              { label: 'Good (22)', val: 22 },
              { label: 'Great (26)', val: 26 },
              { label: 'Top (30)', val: 30 },
            ],
          },
          {
            id: 'designCraftsmanship',
            title: '2. Craftsmanship & Finish',
            subtitle: 'Stitching, fabric handling and detailing',
            max: 25,
            val: designCraftsmanship,
            set: setDesignCraftsmanship,
            presets: [
              { label: 'Fair (15)', val: 15 },
              { label: 'Good (19)', val: 19 },
              { label: 'Great (22)', val: 22 },
              { label: 'Top (25)', val: 25 },
            ],
          },
          {
            id: 'designTheme',
            title: '3. Theme Relevance',
            subtitle: 'How well the design fits the event theme',
            max: 20,
            val: designTheme,
            set: setDesignTheme,
            presets: [
              { label: 'Fair (12)', val: 12 },
              { label: 'Good (15)', val: 15 },
              { label: 'Great (18)', val: 18 },
              { label: 'Top (20)', val: 20 },
            ],
          },
          {
            id: 'designFit',
            title: '4. Fit & Styling',
            subtitle: 'How the outfit sits on the model and works in motion',
            max: 15,
            val: designFit,
            set: setDesignFit,
            presets: [
              { label: 'Fair (9)', val: 9 },
              { label: 'Good (12)', val: 12 },
              { label: 'Great (14)', val: 14 },
              { label: 'Top (15)', val: 15 },
            ],
          },
          {
            id: 'designImpact',
            title: '5. Overall Impact',
            subtitle: 'Visual effect when shown on stage',
            max: 10,
            val: designImpact,
            set: setDesignImpact,
            presets: [
              { label: 'Fair (6)', val: 6 },
              { label: 'Good (8)', val: 8 },
              { label: 'Great (9)', val: 9 },
              { label: 'Top (10)', val: 10 },
            ],
          },
        ];

        return (
          <div
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200 relative"
            onClick={() => setScoringCandidate(null)}
          >
            {/* 🌟 Cinematic Fashion Runway Stage Video Animation in Scorecard Backdrop */}
            <RunwayStageBackground contained className="opacity-95" />

            <div
              className="max-w-xl w-full bg-[#0d0b09]/95 backdrop-blur-3xl rounded-3xl border border-novera-gold/40 shadow-[0_0_80px_rgba(0,0,0,0.95)] relative z-10 animate-in zoom-in-95 duration-200 max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden text-white"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 📌 PERMANENT HEADER (NEVER SCROLLS OUT OF VIEW - 100% VISIBLE WITH SAFE PADDING) */}
              <div className="bg-[#14110d] border-b border-white/15 px-4 sm:px-6 py-3.5 flex items-center justify-between shrink-0 shadow-md">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-12 h-12 rounded-2xl overflow-hidden shrink-0 shadow-md border-2 border-novera-gold/60">
                    <Image
                      src={scoringCandidate.imageUrl}
                      alt={scoringCandidate.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-mono uppercase tracking-widest text-novera-gold font-bold truncate">
                      #{scoringCandidate.candidateNumber} &bull; {scoringCandidate.category === 'boy' ? 'Male Model' : 'Female Model'}
                    </div>
                    <h3 className="font-serif text-lg sm:text-xl font-bold text-white truncate">
                      {scoringCandidate.name}
                    </h3>
                  </div>
                </div>

                {/* 🔴 PROMINENT, ALWAYS-VISIBLE CLOSE BUTTON */}
                <button
                  type="button"
                  onClick={() => setScoringCandidate(null)}
                  className="px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-zinc-200 hover:text-white border border-white/20 flex items-center gap-1.5 text-xs font-bold transition-all shadow-md shrink-0 cursor-pointer"
                  title="Close Scorecard"
                >
                  <X className="w-4 h-4 text-amber-300" />
                  <span>Close</span>
                </button>
              </div>

              {/* 🎚️ DUAL SCORECARD CATEGORY SWITCHER (MODEL RUNWAY vs STUDENT DESIGN) */}
              <div className="bg-[#181410] border-b border-white/10 px-4 sm:px-6 py-2.5 shrink-0">
                <div className="grid grid-cols-2 p-1 rounded-2xl bg-black/60 border border-white/15 gap-1.5 shadow-inner">
                  <button
                    type="button"
                    onClick={() => setScorecardTab('model')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      scorecardTab === 'model'
                        ? 'bg-gradient-to-r from-novera-gold via-amber-300 to-amber-500 text-black font-extrabold shadow-md'
                        : 'text-zinc-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>👠 Model Runway</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      scorecardTab === 'model' ? 'bg-black/30 text-black' : 'bg-white/10 text-amber-300'
                    }`}>
                      {totalModel}/100
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScorecardTab('design')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      scorecardTab === 'design'
                        ? 'bg-gradient-to-r from-novera-gold via-amber-300 to-amber-500 text-black font-extrabold shadow-md'
                        : 'text-zinc-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>👗 Student Design</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      scorecardTab === 'design' ? 'bg-black/30 text-black' : 'bg-white/10 text-amber-300'
                    }`}>
                      {totalDesign}/100
                    </span>
                  </button>
                </div>
              </div>

              {/* 📜 SCROLLABLE BODY CONTENT */}
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-grow overscroll-contain">
                {scorecardTab === 'model' ? (
                  <>
                    {/* Master Model Total Score Display */}
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-black/80 to-amber-500/10 border-2 border-novera-gold/60 shadow-[0_0_25px_rgba(203,167,95,0.2)] flex items-center justify-between gap-4">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-novera-gold font-bold block mb-0.5">
                          Official Model Scorecard
                        </span>
                        <div className="flex items-baseline gap-2">
                          <span className="font-serif text-3xl sm:text-4xl font-extrabold text-white">
                            {totalModel}
                          </span>
                          <span className="text-zinc-400 font-mono text-xs sm:text-sm">/ 100 Total Marks</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                          totalModel >= 90
                            ? 'bg-amber-400/20 text-amber-300 border-amber-400/50 shadow-[0_0_15px_rgba(251,191,36,0.3)]'
                            : totalModel >= 80
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                            : totalModel >= 70
                            ? 'bg-sky-500/20 text-sky-300 border-sky-500/50'
                            : 'bg-zinc-800 text-zinc-300 border-white/20'
                        }`}>
                          {totalModel >= 90 ? '★ Outstanding' : totalModel >= 80 ? '★ Excellent' : totalModel >= 70 ? '★ Very Good' : 'Good'}
                        </span>
                        <span className="text-[10px] text-zinc-400 block mt-1">Sum of 6 model criteria below</span>
                      </div>
                    </div>

                    {/* ⚡ ONE-TOUCH QUICK SCORE PROFILES (MODEL) */}
                    <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-novera-gold font-bold flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5 text-amber-400" />
                          <span>One-Touch Model Presets:</span>
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono">Fine-tune with &plus;/&minus; below</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
                        <button
                          type="button"
                          onClick={() => applyPresetProfile('outstanding')}
                          className={`px-2 py-2 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center cursor-pointer ${
                            totalModel >= 90
                              ? 'bg-gradient-to-r from-novera-gold to-amber-400 text-black border-amber-300 shadow-md font-extrabold'
                              : 'bg-white/5 hover:bg-white/15 text-zinc-200 border-white/15'
                          }`}
                        >
                          <span className="text-xs">★ 94 Marks</span>
                          <span className="text-[10px] font-normal opacity-80">Outstanding</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPresetProfile('excellent')}
                          className={`px-2 py-2 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center cursor-pointer ${
                            totalModel >= 80 && totalModel < 90
                              ? 'bg-gradient-to-r from-novera-gold to-amber-400 text-black border-amber-300 shadow-md font-extrabold'
                              : 'bg-white/5 hover:bg-white/15 text-zinc-200 border-white/15'
                          }`}
                        >
                          <span className="text-xs">★ 84 Marks</span>
                          <span className="text-[10px] font-normal opacity-80">Excellent</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPresetProfile('veryGood')}
                          className={`px-2 py-2 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center cursor-pointer ${
                            totalModel >= 70 && totalModel < 80
                              ? 'bg-gradient-to-r from-novera-gold to-amber-400 text-black border-amber-300 shadow-md font-extrabold'
                              : 'bg-white/5 hover:bg-white/15 text-zinc-200 border-white/15'
                          }`}
                        >
                          <span className="text-xs">★ 74 Marks</span>
                          <span className="text-[10px] font-normal opacity-80">Very Good</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPresetProfile('fair')}
                          className={`px-2 py-2 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center cursor-pointer ${
                            totalModel < 70
                              ? 'bg-gradient-to-r from-novera-gold to-amber-400 text-black border-amber-300 shadow-md font-extrabold'
                              : 'bg-white/5 hover:bg-white/15 text-zinc-200 border-white/15'
                          }`}
                        >
                          <span className="text-xs">60 Marks</span>
                          <span className="text-[10px] font-normal opacity-80">Fair Standard</span>
                        </button>
                      </div>
                    </div>

                    {/* 6 Official Model Criteria Cards */}
                    <div className="space-y-3 pt-1">
                      {criteriaList.map((crit) => (
                        <div
                          key={crit.id}
                          className="p-3 sm:p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-novera-gold/40 transition-colors space-y-2.5"
                        >
                          <div className="flex justify-between items-center text-xs">
                            <div>
                              <span className="font-bold text-white text-xs sm:text-sm block">
                                {crit.title}
                              </span>
                              <span className="text-[10px] sm:text-[11px] text-zinc-400">
                                {crit.subtitle}
                              </span>
                            </div>
                            <div className="font-mono font-bold text-xs sm:text-sm text-novera-gold px-2.5 py-0.5 rounded-full bg-novera-gold/15 border border-novera-gold/40 shrink-0">
                              {crit.val} <span className="text-zinc-400 text-[10px] sm:text-xs font-normal">/ {crit.max}</span>
                            </div>
                          </div>

                          {/* Touch Stepper + Range Slider */}
                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={() => crit.set(Math.max(0, crit.val - 1))}
                              className="w-10 h-10 sm:w-9 sm:h-9 rounded-xl bg-white/10 hover:bg-white/20 active:scale-90 text-white font-bold text-lg flex items-center justify-center border border-white/20 shrink-0 select-none shadow-sm cursor-pointer"
                              title="Decrease 1 mark"
                            >
                              &minus;
                            </button>
                            <input
                              type="range"
                              min="0"
                              max={crit.max}
                              value={crit.val}
                              onChange={(e) => crit.set(Number(e.target.value))}
                              className="w-full glass-slider cursor-pointer h-2"
                            />
                            <button
                              type="button"
                              onClick={() => crit.set(Math.min(crit.max, crit.val + 1))}
                              className="w-10 h-10 sm:w-9 sm:h-9 rounded-xl bg-white/10 hover:bg-white/20 active:scale-90 text-white font-bold text-lg flex items-center justify-center border border-white/20 shrink-0 select-none shadow-sm cursor-pointer"
                              title="Increase 1 mark"
                            >
                              +
                            </button>
                          </div>

                          {/* 4 Quick Presets */}
                          <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                            {crit.presets.map((preset) => (
                              <button
                                key={preset.val}
                                type="button"
                                onClick={() => crit.set(preset.val)}
                                className={`py-1.5 rounded-xl text-xs font-semibold transition-all text-center cursor-pointer ${
                                  crit.val === preset.val
                                    ? 'bg-gradient-to-r from-novera-gold to-amber-400 text-black font-extrabold shadow-md scale-[1.02]'
                                    : 'bg-white/5 hover:bg-white/15 text-zinc-300 border border-white/10'
                                }`}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Sub-award Alignment Footnote */}
                    <div className="my-2 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-xs text-zinc-300">
                      <Sparkles className="w-4 h-4 text-novera-gold shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-white block mb-0.5">Automated Special Titles Tracking</span>
                        <span>Your markings automatically contribute to <strong>Best Personality ({personalityScore}/50)</strong>, <strong>Stage Presence ({stagePresenceScore}/30)</strong>, and <strong>Photogenic ({photogenicScore}/40)</strong>.</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Master Student Design Total Score Display */}
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-black/80 to-amber-500/10 border-2 border-novera-gold/60 shadow-[0_0_25px_rgba(203,167,95,0.2)] flex items-center justify-between gap-4">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-novera-gold font-bold block mb-0.5">
                          Design Marking Sheet (Best Design &ndash; Students)
                        </span>
                        <div className="flex items-baseline gap-2">
                          <span className="font-serif text-3xl sm:text-4xl font-extrabold text-white">
                            {totalDesign}
                          </span>
                          <span className="text-zinc-400 font-mono text-xs sm:text-sm">/ 100 Total Marks</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                          totalDesign >= 90
                            ? 'bg-amber-400/20 text-amber-300 border-amber-400/50 shadow-[0_0_15px_rgba(251,191,36,0.3)]'
                            : totalDesign >= 80
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                            : totalDesign >= 70
                            ? 'bg-sky-500/20 text-sky-300 border-sky-500/50'
                            : 'bg-zinc-800 text-zinc-300 border-white/20'
                        }`}>
                          {totalDesign >= 90 ? '★ Outstanding' : totalDesign >= 80 ? '★ Excellent' : totalDesign >= 70 ? '★ Very Good' : 'Good'}
                        </span>
                        <span className="text-[10px] text-zinc-400 block mt-1">Sum of 5 design criteria below</span>
                      </div>
                    </div>

                    {/* ⚡ ONE-TOUCH QUICK SCORE PROFILES (DESIGN) */}
                    <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-novera-gold font-bold flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5 text-amber-400" />
                          <span>One-Touch Design Presets:</span>
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono">Fine-tune with &plus;/&minus; below</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
                        <button
                          type="button"
                          onClick={() => applyDesignPresetProfile('outstanding')}
                          className={`px-2 py-2 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center cursor-pointer ${
                            totalDesign >= 90
                              ? 'bg-gradient-to-r from-novera-gold to-amber-400 text-black border-amber-300 shadow-md font-extrabold'
                              : 'bg-white/5 hover:bg-white/15 text-zinc-200 border-white/15'
                          }`}
                        >
                          <span className="text-xs">★ 92 Marks</span>
                          <span className="text-[10px] font-normal opacity-80">Outstanding</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => applyDesignPresetProfile('excellent')}
                          className={`px-2 py-2 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center cursor-pointer ${
                            totalDesign >= 80 && totalDesign < 90
                              ? 'bg-gradient-to-r from-novera-gold to-amber-400 text-black border-amber-300 shadow-md font-extrabold'
                              : 'bg-white/5 hover:bg-white/15 text-zinc-200 border-white/15'
                          }`}
                        >
                          <span className="text-xs">★ 82 Marks</span>
                          <span className="text-[10px] font-normal opacity-80">Excellent</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => applyDesignPresetProfile('veryGood')}
                          className={`px-2 py-2 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center cursor-pointer ${
                            totalDesign >= 70 && totalDesign < 80
                              ? 'bg-gradient-to-r from-novera-gold to-amber-400 text-black border-amber-300 shadow-md font-extrabold'
                              : 'bg-white/5 hover:bg-white/15 text-zinc-200 border-white/15'
                          }`}
                        >
                          <span className="text-xs">★ 72 Marks</span>
                          <span className="text-[10px] font-normal opacity-80">Very Good</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => applyDesignPresetProfile('fair')}
                          className={`px-2 py-2 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center cursor-pointer ${
                            totalDesign < 70
                              ? 'bg-gradient-to-r from-novera-gold to-amber-400 text-black border-amber-300 shadow-md font-extrabold'
                              : 'bg-white/5 hover:bg-white/15 text-zinc-200 border-white/15'
                          }`}
                        >
                          <span className="text-xs">60 Marks</span>
                          <span className="text-[10px] font-normal opacity-80">Fair Standard</span>
                        </button>
                      </div>
                    </div>

                    {/* 5 Official Student Design Criteria Cards */}
                    <div className="space-y-3 pt-1">
                      {designCriteriaList.map((crit) => (
                        <div
                          key={crit.id}
                          className="p-3 sm:p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-novera-gold/40 transition-colors space-y-2.5"
                        >
                          <div className="flex justify-between items-center text-xs">
                            <div>
                              <span className="font-bold text-white text-xs sm:text-sm block">
                                {crit.title}
                              </span>
                              <span className="text-[10px] sm:text-[11px] text-zinc-400">
                                {crit.subtitle}
                              </span>
                            </div>
                            <div className="font-mono font-bold text-xs sm:text-sm text-novera-gold px-2.5 py-0.5 rounded-full bg-novera-gold/15 border border-novera-gold/40 shrink-0">
                              {crit.val} <span className="text-zinc-400 text-[10px] sm:text-xs font-normal">/ {crit.max}</span>
                            </div>
                          </div>

                          {/* Touch Stepper + Range Slider */}
                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={() => crit.set(Math.max(0, crit.val - 1))}
                              className="w-10 h-10 sm:w-9 sm:h-9 rounded-xl bg-white/10 hover:bg-white/20 active:scale-90 text-white font-bold text-lg flex items-center justify-center border border-white/20 shrink-0 select-none shadow-sm cursor-pointer"
                              title="Decrease 1 mark"
                            >
                              &minus;
                            </button>
                            <input
                              type="range"
                              min="0"
                              max={crit.max}
                              value={crit.val}
                              onChange={(e) => crit.set(Number(e.target.value))}
                              className="w-full glass-slider cursor-pointer h-2"
                            />
                            <button
                              type="button"
                              onClick={() => crit.set(Math.min(crit.max, crit.val + 1))}
                              className="w-10 h-10 sm:w-9 sm:h-9 rounded-xl bg-white/10 hover:bg-white/20 active:scale-90 text-white font-bold text-lg flex items-center justify-center border border-white/20 shrink-0 select-none shadow-sm cursor-pointer"
                              title="Increase 1 mark"
                            >
                              +
                            </button>
                          </div>

                          {/* 4 Quick Presets */}
                          <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                            {crit.presets.map((preset) => (
                              <button
                                key={preset.val}
                                type="button"
                                onClick={() => crit.set(preset.val)}
                                className={`py-1.5 rounded-xl text-xs font-semibold transition-all text-center cursor-pointer ${
                                  crit.val === preset.val
                                    ? 'bg-gradient-to-r from-novera-gold to-amber-400 text-black font-extrabold shadow-md scale-[1.02]'
                                    : 'bg-white/5 hover:bg-white/15 text-zinc-300 border border-white/10'
                                }`}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Official Award Alignment Footnote */}
                    <div className="my-2 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-xs text-zinc-300">
                      <Sparkles className="w-4 h-4 text-novera-gold shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-white block mb-0.5">Official Student Award Tracking</span>
                        <span>Your markings contribute directly to the <strong>Best Design (Students) Award (Max 100)</strong> tabulated in the Master Admin Vault.</span>
                      </div>
                    </div>
                  </>
                )}

                {/* Judge Notes */}
                <div className="pt-1">
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Confidential Judge Notes (Visible to Admin)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Excellent posture and striking outfit presentation..."
                    rows={2}
                    className="w-full px-3 py-2 text-xs rounded-2xl bg-white/5 border border-white/15 text-white placeholder-zinc-500 outline-none focus:border-novera-gold resize-none shadow-inner"
                  />
                </div>
              </div>

              {/* 📌 PERMANENT STICKY FOOTER (ALWAYS VISIBLE SUBMIT) */}
              <div className="sticky bottom-0 z-30 bg-[#120f0c] border-t border-white/15 px-4 sm:px-6 py-3 flex items-center gap-3 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.6)]">
                <button
                  type="button"
                  onClick={() => setScoringCandidate(null)}
                  className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-bold text-zinc-300 transition-colors shadow-sm shrink-0 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleScoreSubmit}
                  disabled={isSaving}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-[#d4af37] via-[#f3e5ab] to-[#aa7c11] text-black font-extrabold hover:brightness-110 active:scale-[0.99] text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xl disabled:opacity-50 group relative overflow-hidden cursor-pointer"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
                  <Save className="w-4 h-4 text-black" />
                  <span>{isSaving ? 'Submitting...' : `Submit Both Scores (Model: ${totalModel} • Design: ${totalDesign})`}</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 🚀 BIG DRAMATIC SUBMISSION ANIMATION OVERLAY */}
      {animationState && animationState.isOpen && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="max-w-md w-full text-center space-y-6 relative">
            <div className="absolute inset-0 bg-novera-foil/20 blur-3xl -z-10 rounded-full" />

            {animationState.step < 3 ? (
              <div className="space-y-6 animate-pulse">
                <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-red-500/30 animate-ping" />
                  <div className="w-24 h-24 rounded-full bg-red-950/80 border-2 border-red-500 flex items-center justify-center shadow-[0_0_50px_rgba(239,68,68,0.5)]">
                    <Radio className="w-12 h-12 text-red-400 animate-spin" style={{ animationDuration: '3s' }} />
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] font-mono uppercase tracking-[0.3em] text-red-400 font-bold">
                    {animationState.step === 1 ? 'ENCRYPTING SCORECARD...' : 'TRANSMITTING TELEMETRY TO CENTRAL ADMIN...'}
                  </span>
                  <h3 className="font-serif text-2xl font-bold text-white tracking-tight">
                    Logging Score for {animationState.candidateName}
                  </h3>
                  <div className="text-xs text-zinc-400 font-mono">
                    Official Sign-off: {animationState.judgeName}
                  </div>
                </div>

                <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden border border-zinc-700">
                  <div
                    className={`h-full bg-gradient-to-r from-red-600 to-amber-500 transition-all duration-700 ${
                      animationState.step === 1 ? 'w-2/5' : 'w-4/5'
                    }`}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-in zoom-in-75 duration-300">
                <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-novera-foil/30 animate-ping" />
                  <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-novera-foil via-amber-200 to-novera-foil p-1 shadow-[0_0_60px_rgba(203,167,95,0.7)]">
                    <div className="w-full h-full rounded-full bg-novera-ink flex flex-col items-center justify-center text-novera-gold border border-novera-gold/40">
                      <Check className="w-12 h-12 text-emerald-400 stroke-[3]" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono uppercase tracking-widest font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>VERIFIED &bull; SEALED IN ADMIN VAULT</span>
                  </div>

                  <h3 className="font-serif text-3xl font-bold text-white tracking-tight">
                    {animationState.score} <span className="text-lg text-novera-gold font-sans font-normal">/ 100</span>
                  </h3>

                  <p className="text-xs text-zinc-300 max-w-sm mx-auto">
                    Score submitted for <strong className="text-white">{animationState.candidateName}</strong> by{' '}
                    <strong className="text-novera-gold">{animationState.judgeName}</strong>.
                  </p>
                </div>

                <div className="pt-2">
                  <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-widest">
                    &bull; Recorded in Live Master Ledger &bull;
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
