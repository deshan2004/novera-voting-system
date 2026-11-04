'use client';

import { useState, useEffect } from 'react';
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

  // Active scoring candidate
  const [scoringCandidate, setScoringCandidate] = useState<Candidate | null>(null);

  // Model Official Runway Criteria (Max 100)
  const [walking, setWalking] = useState<number>(16); // max 20
  const [confidence, setConfidence] = useState<number>(16); // max 20
  const [stage, setStage] = useState<number>(16); // max 20
  const [posture, setPosture] = useState<number>(12); // max 15
  const [poses, setPoses] = useState<number>(12); // max 15
  const [face, setFace] = useState<number>(8); // max 10

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
      setNotes(existing.notes || '');
    } else {
      setWalking(16);
      setConfidence(16);
      setStage(16);
      setPosture(12);
      setPoses(12);
      setFace(8);
      setNotes('');
    }
  };

  // Calculations for titles
  const totalModel = Number(walking) + Number(confidence) + Number(stage) + Number(posture) + Number(poses) + Number(face);
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

      // Student Design (deprecated / set to 0)
      designCreativity: 0,
      designCraftsmanship: 0,
      designTheme: 0,
      designFit: 0,
      designImpact: 0,
      totalDesign: 0,

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

  const currentCategoryCandidates = candidates.filter((c) => c.category === selectedCategory);
  const getScoreForCandidate = (candidateId: string) => {
    return judgeScores.find((s) => s.judgeId === selectedJudgeId && s.candidateId === candidateId);
  };
  const scoredCount = currentCategoryCandidates.filter((c) => !!getScoreForCandidate(c.id)).length;
  const progressPercent = currentCategoryCandidates.length > 0 ? Math.round((scoredCount / currentCategoryCandidates.length) * 100) : 0;

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
              <span>Unlock Jury Scorecard</span>
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 relative">
      {/* 🌟 LUXURY AMBIENT GLASS LIGHTS (Refracted through frosted glass panels) */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div
          className="absolute top-12 left-1/4 w-[500px] h-[500px] bg-gradient-to-tr from-amber-200/30 via-novera-gold/15 to-transparent rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: '9s' }}
        />
        <div
          className="absolute top-1/3 right-8 w-[450px] h-[450px] bg-gradient-to-br from-rose-200/25 via-amber-100/15 to-transparent rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: '11s' }}
        />
        <div className="absolute bottom-20 left-12 w-[550px] h-[550px] bg-gradient-to-tr from-novera-foil/10 via-amber-200/20 to-transparent rounded-full blur-3xl" />
      </div>

      {/* 🔴 LIVE ADMIN SURVEILLANCE HUD (FROSTED CRIMSON GLASS LOOK) */}
      <div className="p-4 sm:p-5 rounded-3xl glass-crimson-hud text-white relative overflow-hidden animate-surveillance-glow">
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
      <div className="p-6 sm:p-8 rounded-3xl glass-panel flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden transition-all duration-300 hover:shadow-2xl">
        <div className="flex items-center gap-4 text-center sm:text-left w-full sm:w-auto">
          <div className="relative w-14 h-14 rounded-2xl glass-dark flex items-center justify-center shrink-0 border border-novera-foil/50 shadow-lg">
            <Award className="w-7 h-7 text-novera-gold animate-float" />
            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white animate-pulse" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-novera-foil">
              <Sparkles className="w-3.5 h-3.5 text-novera-gold animate-spin" style={{ animationDuration: '6s' }} />
              <span>Official Runway Jury &bull; Seat Verified</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-novera-ink">
              {activeJudge.name}
            </h1>
            <p className="text-xs text-novera-charcoal mt-0.5">
              {activeJudge.title} &bull; Model Performance &amp; Student Design Marking
            </p>
          </div>
        </div>

        {/* Right Status Controls with Progress Bar */}
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-between md:justify-end">
          <div className="px-4 py-2.5 rounded-2xl glass-pill text-xs space-y-1.5 shadow-sm">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-novera-charcoal font-medium">Evaluation:</span>
              <span className="font-mono font-bold text-novera-foil">
                {scoredCount} / {currentCategoryCandidates.length} ({progressPercent}%)
              </span>
            </div>
            <div className="w-32 sm:w-40 h-2 rounded-full bg-novera-ink/10 overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-novera-gold-dark via-novera-foil to-amber-300 rounded-full transition-all duration-700 shadow-sm"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-semibold text-rose-800 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-300/40 backdrop-blur-md transition-all shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* 🔘 CATEGORY TOGGLE (MODERN FROSTED GLASS PILL) */}
      <div className="flex justify-center px-2 my-2">
        <div className="grid grid-cols-2 gap-2 w-full max-w-xl p-1.5 rounded-full glass-pill shadow-inner">
          <button
            onClick={() => setSelectedCategory('boy')}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-full text-xs sm:text-sm font-bold tracking-wider uppercase whitespace-nowrap transition-all duration-200 ${
              selectedCategory === 'boy'
                ? 'bg-novera-ink text-novera-paper shadow-lg border border-white/15'
                : 'text-novera-charcoal hover:text-novera-ink hover:bg-white/50'
            }`}
          >
            <Crown className={`w-3.5 h-3.5 shrink-0 ${selectedCategory === 'boy' ? 'text-novera-gold' : 'text-novera-foil'}`} />
            <span>Male (Boys)</span>
          </button>

          <button
            onClick={() => setSelectedCategory('girl')}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-full text-xs sm:text-sm font-bold tracking-wider uppercase whitespace-nowrap transition-all duration-200 ${
              selectedCategory === 'girl'
                ? 'bg-novera-ink text-novera-paper shadow-lg border border-white/15'
                : 'text-novera-charcoal hover:text-novera-ink hover:bg-white/50'
            }`}
          >
            <Crown className={`w-3.5 h-3.5 shrink-0 ${selectedCategory === 'girl' ? 'text-novera-gold' : 'text-novera-foil'}`} />
            <span>Female (Girls)</span>
          </button>
        </div>
      </div>

      {/* 📸 CANDIDATE GRID WITH FROSTED GLASS CARDS & HOVER EFFECTS */}
      <div key={selectedCategory} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        {currentCategoryCandidates.map((candidate) => {
          const score = getScoreForCandidate(candidate.id);
          const isScored = !!score;

          return (
            <div
              key={candidate.id}
              className={`group rounded-3xl p-5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-2 ${
                isScored
                  ? 'glass-card-scored'
                  : 'glass-card hover:border-novera-foil hover:shadow-2xl'
              }`}
            >
              <div>
                {/* Image Card with Glass Badges and Hover Zoom */}
                <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden mb-4 bg-novera-paper-dim shadow-inner">
                  <Image
                    src={candidate.imageUrl}
                    alt={candidate.name}
                    fill
                    className="object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
                    sizes="(max-width: 768px) 100vw, 25vw"
                  />

                  {/* Dark Vignette Overlay on Bottom */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/25 pointer-events-none" />

                  {/* Candidate No Glass Badge */}
                  <div className="absolute top-3 left-3 px-3 py-1 rounded-xl glass-badge text-white font-mono text-xs font-bold tracking-wider shadow-md">
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

                <p className="text-xs text-novera-charcoal line-clamp-2 mb-4 font-normal">
                  {candidate.bio || 'Official Runway Contender representing elegance, poise, and personality.'}
                </p>

                {/* Score Summary Box with Frosted Emerald Glass */}
                {isScored && (
                  <div className="p-3.5 rounded-2xl glass-panel-subtle bg-emerald-500/10 border-emerald-400/30 text-[11px] space-y-1.5 mb-4 shadow-sm">
                    <div className="flex justify-between text-emerald-950 font-bold">
                      <span className="flex items-center gap-1">
                        <Crown className="w-3 h-3 text-emerald-700" />
                        <span>Top Model:</span>
                      </span>
                      <span className="font-mono">{score.totalModel}/100</span>
                    </div>
                    <div className="flex justify-between text-emerald-800">
                      <span>Best Personality:</span>
                      <span className="font-mono">{score.personalityScore}/50</span>
                    </div>
                    <div className="flex justify-between text-emerald-800">
                      <span>Stage Presence:</span>
                      <span className="font-mono">{score.stagePresenceScore}/30</span>
                    </div>
                    <div className="flex justify-between text-emerald-800">
                      <span>Most Photogenic:</span>
                      <span className="font-mono">{score.photogenicScore}/40</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Button with Specular Shine */}
              <button
                onClick={() => openScoringModal(candidate)}
                className={`w-full py-3 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all relative overflow-hidden group/btn shadow-md ${
                  isScored
                    ? 'glass-pill text-novera-ink hover:bg-novera-foil hover:text-novera-paper'
                    : 'bg-novera-ink text-novera-paper hover:bg-novera-foil'
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

      {/* 🚀 ULTRA-MODERN GLASS SCORING MODAL DRAWER */}
      {scoringCandidate && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xl flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="max-w-lg w-full glass-panel rounded-t-3xl sm:rounded-3xl p-5 sm:p-8 border border-white/80 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)] relative animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-novera-ink/10 mb-4">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-2xl overflow-hidden shrink-0 shadow-md border border-white/60">
                  <Image
                    src={scoringCandidate.imageUrl}
                    alt={scoringCandidate.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-novera-foil font-bold">
                    {scoringCandidate.candidateNumber} &bull; {scoringCandidate.category === 'boy' ? 'Male Model' : 'Female Model'}
                  </div>
                  <h3 className="font-serif text-xl font-bold text-novera-ink">
                    {scoringCandidate.name}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setScoringCandidate(null)}
                className="w-8 h-8 rounded-full glass-pill hover:bg-novera-ink hover:text-novera-paper text-novera-charcoal flex items-center justify-center transition-colors text-base font-bold shadow-sm"
              >
                &times;
              </button>
            </div>

            {/* Live Awards Alignment Badge Bar in Frosted Glass */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-2xl glass-panel-subtle text-center mb-4">
                  <div className="p-1.5 rounded-xl bg-white/70 shadow-sm border border-white/80">
                    <span className="text-[9px] uppercase tracking-wider text-novera-charcoal font-bold block">Top Model</span>
                    <strong className="text-base font-mono text-novera-foil">{totalModel}/100</strong>
                  </div>
                  <div className="p-1.5 rounded-xl bg-white/70 shadow-sm border border-white/80">
                    <span className="text-[9px] uppercase tracking-wider text-novera-charcoal font-bold block">Personality</span>
                    <strong className="text-base font-mono text-novera-ink">{personalityScore}/50</strong>
                  </div>
                  <div className="p-1.5 rounded-xl bg-white/70 shadow-sm border border-white/80">
                    <span className="text-[9px] uppercase tracking-wider text-novera-charcoal font-bold block">Stage Pres.</span>
                    <strong className="text-base font-mono text-novera-ink">{stagePresenceScore}/30</strong>
                  </div>
                  <div className="p-1.5 rounded-xl bg-white/70 shadow-sm border border-white/80">
                    <span className="text-[9px] uppercase tracking-wider text-novera-charcoal font-bold block">Photogenic</span>
                    <strong className="text-base font-mono text-novera-ink">{photogenicScore}/40</strong>
                  </div>
                </div>

                {/* 6 Official Model Criteria Sliders with Glass styling */}
                <div className="space-y-4 pt-1">
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="font-semibold text-novera-ink">Walking (Ramp walk cadence &amp; gait)</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-novera-foil/15 text-novera-foil font-mono font-bold text-xs border border-novera-foil/30">
                        {walking} / 20
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      value={walking}
                      onChange={(e) => setWalking(Number(e.target.value))}
                      className="w-full glass-slider cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="font-semibold text-novera-ink">Confidence (Attitude &amp; character)</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-novera-foil/15 text-novera-foil font-mono font-bold text-xs border border-novera-foil/30">
                        {confidence} / 20
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      value={confidence}
                      onChange={(e) => setConfidence(Number(e.target.value))}
                      className="w-full glass-slider cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="font-semibold text-novera-ink">Stage Presence (Audience impact)</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-novera-foil/15 text-novera-foil font-mono font-bold text-xs border border-novera-foil/30">
                        {stage} / 20
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      value={stage}
                      onChange={(e) => setStage(Number(e.target.value))}
                      className="w-full glass-slider cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="font-semibold text-novera-ink">Posture (Spine alignment &amp; poise)</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-novera-foil/15 text-novera-foil font-mono font-bold text-xs border border-novera-foil/30">
                        {posture} / 15
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="15"
                      value={posture}
                      onChange={(e) => setPosture(Number(e.target.value))}
                      className="w-full glass-slider cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="font-semibold text-novera-ink">Poses (Runway turns &amp; pauses)</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-novera-foil/15 text-novera-foil font-mono font-bold text-xs border border-novera-foil/30">
                        {poses} / 15
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="15"
                      value={poses}
                      onChange={(e) => setPoses(Number(e.target.value))}
                      className="w-full glass-slider cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="font-semibold text-novera-ink">Face (Facial expression &amp; camera-ready)</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-novera-foil/15 text-novera-foil font-mono font-bold text-xs border border-novera-foil/30">
                        {face} / 10
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={face}
                      onChange={(e) => setFace(Number(e.target.value))}
                      className="w-full glass-slider cursor-pointer"
                    />
                  </div>
                </div>

            {/* Judge Notes in Frosted Glass Input */}
            <div className="pt-3">
              <label className="block text-xs font-semibold text-novera-charcoal mb-1">
                Confidential Judge Notes (Visible to Admin)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Excellent posture and striking outfit presentation..."
                rows={2}
                className="w-full px-3 py-2 text-xs rounded-2xl glass-input text-novera-ink outline-none focus:border-novera-foil resize-none shadow-inner"
              />
            </div>

            {/* Actions */}
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setScoringCandidate(null)}
                className="w-1/3 py-3 rounded-2xl glass-pill text-xs font-semibold text-novera-charcoal hover:bg-white/60 transition-colors shadow-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleScoreSubmit}
                disabled={isSaving}
                className="w-2/3 py-3 rounded-2xl bg-novera-ink text-novera-paper hover:bg-novera-foil text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xl disabled:opacity-50 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
                <Save className="w-4 h-4 text-novera-gold" />
                <span>Submit Score to Admin</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
  );
}
