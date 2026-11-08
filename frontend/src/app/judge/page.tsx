'use client';

import { useState, useEffect, useMemo } from 'react';
import { Candidate, GenderCategory, JudgeScore } from '@/lib/types';
import { fetchCandidates, saveJudgeScore, getLocalJudgeScores, subscribeToJudgeScores } from '@/lib/api';
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
  Info,
  Search,
  Minus,
  Plus,
  Star,
  SlidersHorizontal,
  Palette,
  Footprints,
  Flame,
  Shirt,
  Lightbulb,
  Scissors,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import RunwayStageBackground from '@/app/components/RunwayStageBackground';
import { playLuxuryChime } from '@/lib/audio';

const OFFICIAL_JUDGES = [
  { id: 'judge_mayuri', name: 'Judge Mayuri', title: "Official Runway Judge · NOVERA '26", code: 'mayuri' },
  { id: 'judge_kalpani', name: 'Judge Kalpani', title: "Official Runway Judge · NOVERA '26", code: 'kalpani' },
  { id: 'judge_piyumi', name: 'Judge Piyumi', title: "Official Runway Judge · NOVERA '26", code: 'piyumi' },
  { id: 'judge_kalwani', name: 'Judge Kalwani', title: "Official Runway Judge · NOVERA '26", code: 'kalwani' },
  { id: 'judge_devdunu', name: 'Judge Devdunu', title: "Official Runway Judge · NOVERA '26", code: 'devdunu' },
  { id: 'judge_erusha', name: 'Judge Erusha', title: "Official Runway Judge · NOVERA '26", code: 'erusha' },
  { id: 'judge_sachith', name: 'Judge Sachith', title: "Official Runway Judge · NOVERA '26", code: 'sachith' },
  { id: 'judge_dulmi', name: 'Judge Dulmi', title: "Official Runway Judge · NOVERA '26", code: 'dulmi' },
];

export default function JudgePortalPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [passcode, setPasscode] = useState<string>('');
  const [passcodeError, setPasscodeError] = useState<string>('');
  const [selectedJudgeId, setSelectedJudgeId] = useState<string>('judge_piyumi');
  const [welcomeAnimation, setWelcomeAnimation] = useState<{
    judgeName: string;
    judgeTitle: string;
    step: number;
  } | null>(null);

  type JudgeCategoryView = 'all' | 'girl' | 'boy' | 'design';
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<JudgeCategoryView>('all');
  const [judgeScores, setJudgeScores] = useState<JudgeScore[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [scoreFilter, setScoreFilter] = useState<'all' | 'unscored' | 'scored'>('all');

  // Active scoring candidate
  const [scoringCandidate, setScoringCandidate] = useState<Candidate | null>(null);
  const [inspectCandidate, setInspectCandidate] = useState<Candidate | null>(null);
  const [scorecardTab, setScorecardTab] = useState<'model' | 'design'>('model');

  // 1. Model Official Runway Criteria (Max 100) - Default 0
  const [walking, setWalking] = useState<number>(0); // max 20
  const [confidence, setConfidence] = useState<number>(0); // max 20
  const [stage, setStage] = useState<number>(0); // max 20
  const [posture, setPosture] = useState<number>(0); // max 15
  const [poses, setPoses] = useState<number>(0); // max 15
  const [face, setFace] = useState<number>(0); // max 10

  // 2. Student Design Official Criteria (Max 100) - Default 0
  const [designCreativity, setDesignCreativity] = useState<number>(0); // max 30
  const [designCraftsmanship, setDesignCraftsmanship] = useState<number>(0); // max 25
  const [designTheme, setDesignTheme] = useState<number>(0); // max 20
  const [designFit, setDesignFit] = useState<number>(0); // max 15
  const [designImpact, setDesignImpact] = useState<number>(0); // max 10

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

    const judgeToLogin = matchedJudge || (inputClean === 'judge2026' || inputClean === 'novera' ? OFFICIAL_JUDGES[0] : null);

    if (judgeToLogin) {
      playLuxuryChime();
      setPasscodeError('');
      setSelectedJudgeId(judgeToLogin.id);
      sessionStorage.setItem('novera_judge_auth', 'true');
      sessionStorage.setItem('novera_judge_id', judgeToLogin.id);
      localStorage.setItem('novera_active_judge', JSON.stringify(judgeToLogin));

      // Trigger high-prestige welcome and authentication transition sequence
      setWelcomeAnimation({
        judgeName: judgeToLogin.name,
        judgeTitle: judgeToLogin.title,
        step: 1,
      });

      // Step 2: Welcome Speech & Briefing after 600ms
      setTimeout(() => {
        setWelcomeAnimation((cur) => (cur ? { ...cur, step: 2 } : null));
      }, 600);

      // Step 3: Complete Telemetry Calibration after 1400ms (Ready for judge to start)
      setTimeout(() => {
        setWelcomeAnimation((cur) => (cur ? { ...cur, step: 3 } : null));
      }, 1400);
    } else {
      setPasscodeError('Invalid Judge Passcode. Please enter your authorized name.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('novera_judge_auth');
  };

  const activeJudge = OFFICIAL_JUDGES.find((j) => j.id === selectedJudgeId) || OFFICIAL_JUDGES[0];

  const openScoringModal = (candidate: Candidate, preferredTab?: 'model' | 'design') => {
    setScoringCandidate(candidate);

    const existing = judgeScores.find(
      (s) => s.judgeId === selectedJudgeId && s.candidateId === candidate.id
    );

    if (existing) {
      setWalking(existing.walking ?? 0);
      setConfidence(existing.confidence ?? 0);
      setStage(existing.stage ?? 0);
      setPosture(existing.posture ?? 0);
      setPoses(existing.poses ?? 0);
      setFace(existing.face ?? 0);

      setDesignCreativity(existing.designCreativity ?? 0);
      setDesignCraftsmanship(existing.designCraftsmanship ?? 0);
      setDesignTheme(existing.designTheme ?? 0);
      setDesignFit(existing.designFit ?? 0);
      setDesignImpact(existing.designImpact ?? 0);

      setNotes(existing.notes || '');
    } else {
      setWalking(0);
      setConfidence(0);
      setStage(0);
      setPosture(0);
      setPoses(0);
      setFace(0);

      setDesignCreativity(0);
      setDesignCraftsmanship(0);
      setDesignTheme(0);
      setDesignFit(0);
      setDesignImpact(0);

      setNotes('');
    }

    if (preferredTab) {
      setScorecardTab(preferredTab);
    } else if (selectedCategory === 'design' && candidate.hasBestDesignEntry) {
      setScorecardTab('design');
    } else {
      setScorecardTab('model');
    }
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

  const currentCategoryCandidates = useMemo(() => {
    if (selectedCategory === 'all') return candidates;
    if (selectedCategory === 'girl') return candidates.filter((c) => c.category === 'girl');
    if (selectedCategory === 'boy') return candidates.filter((c) => c.category === 'boy');
    if (selectedCategory === 'design') return candidates.filter((c) => c.hasBestDesignEntry);
    return candidates;
  }, [candidates, selectedCategory]);

  const getScoreForCandidate = (candidateId: string) => {
    return judgeScores.find((s) => s.judgeId === selectedJudgeId && s.candidateId === candidateId);
  };

  const isCandidateEvaluated = (c: Candidate) => {
    const s = getScoreForCandidate(c.id);
    if (!s) return false;
    if (selectedCategory === 'design') {
      return (s.totalDesign ?? 0) > 0;
    }
    return (s.totalModel ?? 0) > 0 || (s.totalDesign ?? 0) > 0;
  };

  const scoredCount = currentCategoryCandidates.filter(isCandidateEvaluated).length;
  const progressPercent = currentCategoryCandidates.length > 0 ? Math.round((scoredCount / currentCategoryCandidates.length) * 100) : 0;

  const filteredCandidates = useMemo(() => {
    return currentCategoryCandidates.filter((c) => {
      const isScored = isCandidateEvaluated(c);
      if (scoreFilter === 'unscored' && isScored) return false;
      if (scoreFilter === 'scored' && !isScored) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const numClean = c.candidateNumber ? c.candidateNumber.toLowerCase() : '';
      const nameClean = c.name.toLowerCase();
      const designerClean = (c.designerName || '').toLowerCase();
      return numClean.includes(q) || nameClean.includes(q) || designerClean.includes(q);
    });
  }, [currentCategoryCandidates, scoreFilter, searchQuery, judgeScores, selectedJudgeId, selectedCategory]);

  const applyPresetProfile = (tier: 'outstanding' | 'excellent' | 'veryGood' | 'fair' | 'zero') => {
    if (tier === 'zero') {
      setWalking(0);
      setConfidence(0);
      setStage(0);
      setPosture(0);
      setPoses(0);
      setFace(0);
    } else if (tier === 'outstanding') {
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

  const applyDesignPresetProfile = (tier: 'outstanding' | 'excellent' | 'veryGood' | 'fair' | 'zero') => {
    if (tier === 'zero') {
      setDesignCreativity(0);
      setDesignCraftsmanship(0);
      setDesignTheme(0);
      setDesignFit(0);
      setDesignImpact(0);
    } else if (tier === 'outstanding') {
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

        {/* 🌟 LUXURY CINEMATIC JUDGE WELCOME & AUTHENTICATION OVERLAY */}
        {welcomeAnimation && (
          <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-4 select-none animate-in fade-in duration-300">
            <RunwayStageBackground contained className="opacity-90 pointer-events-none" />

            <div className="max-w-lg w-full text-center space-y-6 relative p-6 sm:p-8 rounded-3xl bg-black/70 border border-novera-gold/40 shadow-[0_0_100px_rgba(212,175,55,0.4)] backdrop-blur-2xl animate-in zoom-in-95 duration-300">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-novera-gold to-transparent animate-scan-sweep" />

              {/* Step 1: Biometric Scanning Crest */}
              {welcomeAnimation.step === 1 && (
                <div className="space-y-5 animate-in zoom-in-90 duration-300">
                  <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-2 border-novera-gold/30 animate-ping" />
                    <div className="absolute -inset-2 rounded-full border border-amber-400/40 animate-spin" style={{ animationDuration: '4s' }} />
                    <div className="w-20 h-20 rounded-full bg-amber-950/80 border-2 border-novera-gold flex items-center justify-center shadow-[0_0_40px_rgba(212,175,55,0.5)]">
                      <ShieldCheck className="w-10 h-10 text-amber-300 animate-pulse" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[11px] font-mono uppercase tracking-[0.3em] text-novera-gold font-bold block animate-pulse">
                      AUTHENTICATING OFFICIAL CREDENTIALS...
                    </span>
                    <h3 className="font-serif text-xl sm:text-2xl font-bold text-white tracking-wide">
                      NOVERA &rsquo;26 Security Verification
                    </h3>
                    <div className="text-xs text-zinc-400 font-mono">
                      Establishing encrypted runway connection
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2 & 3: Official Welcome Speech & Talk */}
              {welcomeAnimation.step >= 2 && (
                <div className="space-y-5 animate-in zoom-in-95 duration-400">
                  {/* Verified Crown Badge */}
                  <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                    <div className="absolute inset-0 rounded-2xl bg-novera-gold/30 blur-2xl animate-pulse" />
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#f3e5c8] via-[#d4af37] to-[#997a29] text-black flex items-center justify-center shadow-[0_0_35px_rgba(212,175,55,0.55)] border border-[#ffe5a3]">
                      <Crown className="w-9 h-9 text-black drop-shadow" />
                    </div>
                  </div>

                  {/* Prestige Greeting */}
                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-novera-gold/15 border border-novera-gold/40 text-[11px] font-mono font-bold text-[#f3e5c8] uppercase tracking-widest shadow-sm">
                      <CheckCircle2 className="w-3.5 h-3.5 text-novera-gold" />
                      <span>Credentials Verified &bull; Access Granted</span>
                    </div>
                    <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-[#f3e5c8] to-novera-gold tracking-tight pt-1">
                      Welcome, {welcomeAnimation.judgeName}!
                    </h2>
                    <p className="text-xs text-novera-gold font-mono tracking-wider font-semibold">
                      {welcomeAnimation.judgeTitle}
                    </p>
                  </div>

                  {/* Elegant Talk / Voice Message Box */}
                  <div className="p-4 rounded-2xl bg-black/50 border border-novera-gold/30 text-left space-y-2 shadow-inner">
                    <div className="flex items-center gap-2 text-xs font-bold text-novera-gold uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5 text-novera-gold" />
                      <span>Official Judiciary Briefing</span>
                    </div>
                    <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed font-serif italic">
                      &ldquo;Honored Judge, your seat on the official NOVERA &rsquo;26 runway adjudication panel is confirmed. Your confidential terminal is primed to mark Model Runway and Student Design with absolute excellence.&rdquo;
                    </p>
                    <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                      <span>Official Scoring System</span>
                      <span className="text-novera-gold font-bold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-novera-gold animate-pulse inline-block" />
                        <span>Online • Live Telemetry</span>
                      </span>
                    </div>
                  </div>

                  {/* Calibration Progress Bar */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                      <span>{welcomeAnimation.step === 3 ? 'Calibration Complete \u2022 System Ready' : 'Calibrating Telemetry Link...'}</span>
                      <span className="text-novera-gold font-bold">{welcomeAnimation.step === 3 ? '100% · READY' : '78%'}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-novera-foil via-novera-gold to-[#f3e5c8] transition-all duration-700 rounded-full"
                        style={{ width: welcomeAnimation.step === 3 ? '100%' : '78%' }}
                      />
                    </div>
                  </div>

                  {/* 🚀 MANUAL "START / ENTER SCORING" CTA BUTTON */}
                  <div className="pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <button
                      type="button"
                      onClick={() => {
                        setWelcomeAnimation(null);
                        setIsAuthenticated(true);
                      }}
                      className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#d4af37] via-[#f3e5c8] to-[#b3924f] text-black font-serif font-black text-sm sm:text-base tracking-wider uppercase shadow-[0_0_35px_rgba(212,175,55,0.5)] border border-[#ffe5a3] hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 group"
                    >
                      <span>ENTER SCORING PORTAL</span>
                      <Sparkles className="w-4 h-4 text-black group-hover:rotate-12 transition-transform" />
                    </button>
                    <p className="text-[10px] text-zinc-400 font-mono mt-2">
                      Review briefing above and click button when ready to begin
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

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

      {/* 🔘 CATEGORY TOGGLE (MODERN FROSTED GLASS PILL WITH BEST DESIGN FILTER) */}
      <div className="flex justify-center px-2 my-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 w-full max-w-3xl p-1.5 rounded-2xl sm:rounded-full bg-black/50 backdrop-blur-xl border border-white/15 shadow-inner">
          <button
            type="button"
            onClick={() => setSelectedCategory('girl')}
            className={`flex items-center justify-center gap-1.5 py-2.5 sm:py-3 px-3 rounded-xl sm:rounded-full text-xs sm:text-sm font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer ${
              selectedCategory === 'girl'
                ? 'bg-gradient-to-r from-novera-gold to-amber-500 text-black shadow-lg font-extrabold'
                : 'text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Crown className={`w-3.5 h-3.5 shrink-0 ${selectedCategory === 'girl' ? 'text-black' : 'text-novera-gold'}`} />
            <span>Girls ({candidates.filter((c) => c.category === 'girl').length || 16})</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory('boy')}
            className={`flex items-center justify-center gap-1.5 py-2.5 sm:py-3 px-3 rounded-xl sm:rounded-full text-xs sm:text-sm font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer ${
              selectedCategory === 'boy'
                ? 'bg-gradient-to-r from-novera-gold to-amber-500 text-black shadow-lg font-extrabold'
                : 'text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Crown className={`w-3.5 h-3.5 shrink-0 ${selectedCategory === 'boy' ? 'text-black' : 'text-novera-gold'}`} />
            <span>Boys ({candidates.filter((c) => c.category === 'boy').length || 8})</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory('design')}
            className={`flex items-center justify-center gap-1.5 py-2.5 sm:py-3 px-3 rounded-xl sm:rounded-full text-xs sm:text-sm font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer ${
              selectedCategory === 'design'
                ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400 text-black shadow-lg font-black'
                : 'text-purple-300 hover:text-white hover:bg-purple-950/40 border border-purple-500/30'
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 shrink-0 ${selectedCategory === 'design' ? 'text-black' : 'text-purple-400 animate-pulse'}`} />
            <span>Best Design ({candidates.filter((c) => c.hasBestDesignEntry).length || 17})</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`flex items-center justify-center gap-1.5 py-2.5 sm:py-3 px-3 rounded-xl sm:rounded-full text-xs sm:text-sm font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-gradient-to-r from-novera-gold to-amber-500 text-black shadow-lg font-extrabold'
                : 'text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Crown className={`w-3.5 h-3.5 shrink-0 ${selectedCategory === 'all' ? 'text-black' : 'text-novera-gold'}`} />
            <span>All ({candidates.length || 24})</span>
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
              placeholder="Search by candidate #, model name, or student designer name..."
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
                <div className="space-y-4">
                  {/* Top Bar: Number & Category Badge (Click number to view details) */}
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setInspectCandidate(candidate)}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-novera-gold/25 to-amber-500/20 border-2 border-novera-gold/70 text-novera-gold font-mono text-base font-black tracking-wider whitespace-nowrap shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                      title="Click to view full specifications & details"
                    >
                      <span>{candidate.candidateNumber}</span>
                      <Info className="w-3.5 h-3.5 opacity-60" />
                    </button>
                    <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-300 font-semibold px-2.5 py-1 rounded-full bg-white/5 border border-white/10 whitespace-nowrap">
                      {candidate.category === 'boy' ? 'Male Model' : 'Female Model'}
                    </span>
                  </div>

                  {/* Model Name - Full, Crystal Clear, Clickable to view details */}
                  <button
                    type="button"
                    onClick={() => setInspectCandidate(candidate)}
                    className="w-full text-left min-h-[3.5rem] flex flex-col justify-center group/name cursor-pointer p-1.5 -m-1.5 rounded-2xl hover:bg-white/5 active:scale-[0.99] transition-all"
                    title={`Click to view model profile & details for ${candidate.name}`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-200/60 font-semibold block">
                        Official Contender
                      </span>
                      <span className="text-[10px] font-mono text-novera-gold opacity-80 group-hover/name:opacity-100 group-hover/name:underline transition-all flex items-center gap-1">
                        View Details &rarr;
                      </span>
                    </div>
                    <h3 className="font-serif text-xl sm:text-2xl font-black text-white group-hover/name:text-amber-200 transition-colors leading-tight break-words">
                      {candidate.name}
                    </h3>
                  </button>

                  {/* 🎨 Student Designer Registration Tag */}
                  {candidate.hasBestDesignEntry && candidate.designerName ? (
                    <div className="p-2.5 rounded-2xl bg-gradient-to-r from-purple-950/70 to-pink-950/50 border border-purple-500/40 text-purple-200 shadow-sm flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0 animate-pulse" />
                        <span className="text-[10px] font-mono uppercase tracking-wider text-purple-300/80">Designer:</span>
                        <strong className="text-xs font-bold text-white truncate">{candidate.designerName}</strong>
                      </div>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 uppercase tracking-wider shrink-0 border border-purple-500/40 font-bold">
                        Best Design
                      </span>
                    </div>
                  ) : (
                    <div className="px-2.5 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 text-zinc-500 text-[10px] font-mono flex items-center justify-between">
                      <span>Runway Model Only</span>
                      <span className="text-zinc-600">No Student Design</span>
                    </div>
                  )}

                  {/* Scored Status / Summary */}
                  {isScored ? (
                    <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-[11px] space-y-1.5 shadow-sm text-white">
                      <div className="flex justify-between items-center text-emerald-300 font-bold">
                        <span className="flex items-center gap-1.5">
                          <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Model Runway Score:</span>
                        </span>
                        <span className="font-mono text-emerald-200 text-sm font-extrabold">{score.totalModel}/100</span>
                      </div>
                      <div className="flex justify-between items-center text-amber-300 font-bold border-t border-white/10 pt-1.5">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>Student Design Score:</span>
                        </span>
                        <span className="font-mono text-amber-200 text-sm font-extrabold">{score.totalDesign ?? 0}/100</span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-2.5 px-3 rounded-xl bg-white/5 border border-white/10 text-center">
                      <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider font-semibold">
                        Awaiting Evaluation
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                {selectedCategory === 'design' ? (
                  <button
                    onClick={() => openScoringModal(candidate, 'design')}
                    className={`w-full py-3 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all relative overflow-hidden group/btn shadow-md ${
                      score && (score.totalDesign ?? 0) > 0
                        ? 'bg-purple-900/40 hover:bg-purple-900/60 text-purple-200 border border-purple-400/50 backdrop-blur-md'
                        : 'bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400 text-black font-black hover:brightness-110 shadow-lg'
                    }`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 pointer-events-none" />
                    <Sparkles className="w-3.5 h-3.5 group-hover/btn:rotate-45 transition-transform" />
                    <span>{score && (score.totalDesign ?? 0) > 0 ? `Update Design (${score.totalDesign}/100)` : 'Evaluate Student Design'}</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openScoringModal(candidate, 'model')}
                      className={`flex-1 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all relative overflow-hidden group/btn shadow-md ${
                        isScored
                          ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md'
                          : 'bg-gradient-to-r from-[#d4af37] via-[#f3e5ab] to-[#aa7c11] text-black font-extrabold hover:brightness-110 shadow-lg'
                      }`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 pointer-events-none" />
                      <Sliders className="w-3.5 h-3.5 group-hover/btn:rotate-45 transition-transform" />
                      <span>{isScored ? 'Update Model' : 'Score Model'}</span>
                    </button>
                    {candidate.hasBestDesignEntry && (
                      <button
                        onClick={() => openScoringModal(candidate, 'design')}
                        className={`px-3 py-3 rounded-2xl text-xs font-bold transition-all border shrink-0 flex items-center gap-1.5 cursor-pointer ${
                          score && (score.totalDesign ?? 0) > 0
                            ? 'bg-purple-950/60 border-purple-500/50 text-purple-300 hover:border-purple-400 shadow-sm'
                            : 'bg-purple-600/25 hover:bg-purple-600/40 border-purple-500/50 text-purple-200'
                        }`}
                        title={`Score Student Design for Designer ${candidate.designerName}`}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                        <span className="hidden sm:inline">Design</span>
                      </button>
                    )}
                  </div>
                )}
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
            icon: Footprints,
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
            icon: Flame,
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
            icon: Sparkles,
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
            icon: Compass,
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
            icon: Shirt,
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
            icon: Eye,
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
            icon: Lightbulb,
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
            icon: Scissors,
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
            icon: Layers,
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
            icon: Shirt,
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
            icon: Sparkles,
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
            className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
            onClick={() => setScoringCandidate(null)}
          >
            {/* 🌟 Cinematic Fashion Runway Stage Video Animation in Scorecard Backdrop */}
            <RunwayStageBackground contained className="opacity-90 pointer-events-none" />

            <div
              className="max-w-2xl w-full bg-[#0d0b09]/98 backdrop-blur-3xl rounded-2xl sm:rounded-3xl border border-novera-gold/40 shadow-[0_0_80px_rgba(0,0,0,0.95)] relative z-10 animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden text-white my-auto max-h-[92dvh] sm:max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 📌 COMPACT 1-LINE HEADER (Candidate + Category Tabs + Close) */}
              <div className="bg-[#14110d] border-b border-white/15 px-2.5 sm:px-5 py-2 sm:py-2.5 flex items-center justify-between gap-1.5 sm:gap-2 shrink-0 z-20">
                {/* Candidate Info (Clickable to view full photo & editorial details) */}
                <button
                  type="button"
                  onClick={() => setInspectCandidate(scoringCandidate)}
                  className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1 text-left group cursor-pointer hover:opacity-95 transition-all"
                  title="Click on model photo or name to view details & bio"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-novera-gold/30 to-amber-900/40 border-2 border-novera-gold text-novera-gold font-mono font-extrabold text-xs sm:text-sm flex items-center justify-center shadow-md shrink-0">
                    {scoringCandidate.candidateNumber}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[9px] sm:text-[10px] font-mono uppercase tracking-widest text-novera-gold font-bold truncate leading-tight flex items-center gap-1.5 flex-wrap">
                      <span>#{scoringCandidate.candidateNumber} &bull; {scoringCandidate.category === 'boy' ? 'Male' : 'Female'}</span>
                      {scoringCandidate.hasBestDesignEntry && scoringCandidate.designerName && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-purple-500/30 text-purple-200 font-mono font-bold border border-purple-400/40">
                          🎨 Designer: {scoringCandidate.designerName}
                        </span>
                      )}
                    </div>
                    <h3 className="font-serif text-xs sm:text-base font-bold text-white truncate leading-tight group-hover:text-amber-200 transition-colors">
                      {scoringCandidate.name}
                    </h3>
                  </div>
                </button>

                {/* Centered Category Switcher Tabs */}
                <div className="flex items-center p-0.5 rounded-xl bg-black/60 border border-white/15 gap-0.5 sm:gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setScorecardTab('model')}
                    className={`py-1 px-2 sm:px-2.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1 sm:gap-1.5 cursor-pointer ${
                      scorecardTab === 'model'
                        ? 'bg-gradient-to-r from-novera-gold to-amber-400 text-black font-extrabold shadow-sm'
                        : 'text-zinc-300 hover:text-white'
                    }`}
                  >
                    <Crown className="w-3 h-3" />
                    <span>Model</span>
                    <span className={`px-1 sm:px-1.5 py-0.2 rounded-full text-[9px] sm:text-[10px] font-mono font-bold ${
                      scorecardTab === 'model' ? 'bg-black/30 text-black' : 'bg-white/10 text-amber-300'
                    }`}>
                      {totalModel}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (scoringCandidate.hasBestDesignEntry) {
                        setScorecardTab('design');
                      }
                    }}
                    className={`py-1 px-2 sm:px-2.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1 sm:gap-1.5 cursor-pointer ${
                      !scoringCandidate.hasBestDesignEntry
                        ? 'opacity-40 cursor-not-allowed text-zinc-500'
                        : scorecardTab === 'design'
                        ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400 text-black font-extrabold shadow-sm'
                        : 'text-purple-300 hover:text-white'
                    }`}
                    title={
                      scoringCandidate.hasBestDesignEntry
                        ? `Evaluate Student Design for Designer ${scoringCandidate.designerName}`
                        : 'Not registered for Best Design'
                    }
                  >
                    <Palette className="w-3 h-3" />
                    <span>Design</span>
                    {scoringCandidate.hasBestDesignEntry ? (
                      <span className={`px-1 sm:px-1.5 py-0.2 rounded-full text-[9px] sm:text-[10px] font-mono font-bold ${
                        scorecardTab === 'design' ? 'bg-black/30 text-black' : 'bg-purple-950/80 text-purple-200 border border-purple-500/30'
                      }`}>
                        {totalDesign}
                      </span>
                    ) : (
                      <span className="text-[8px] font-mono text-zinc-500">(N/A)</span>
                    )}
                  </button>
                </div>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setScoringCandidate(null)}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/10 hover:bg-rose-500/20 active:scale-95 text-zinc-300 hover:text-rose-200 border border-white/20 flex items-center justify-center transition-all cursor-pointer shrink-0 ml-0.5"
                  title="Close Scorecard"
                >
                  <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>

              {/* ⚡ ONE-TOUCH INSTANT PRESETS BAR (SCORE ALL CRITERIA IN 1 TAP) */}
              <div className="bg-[#181410] border-b border-white/10 px-2.5 sm:px-5 py-1.5 sm:py-2 flex items-center justify-between gap-1.5 sm:gap-2 shrink-0 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <span className="font-mono text-[11px] sm:text-xs uppercase tracking-wider text-novera-gold font-bold">
                    Total:
                  </span>
                  <span className="font-serif text-lg sm:text-2xl font-extrabold text-white">
                    {scorecardTab === 'model' ? totalModel : totalDesign}
                  </span>
                  <span className="text-zinc-400 font-mono text-[10px] sm:text-xs">/ 100</span>
                  <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider border ${
                    (scorecardTab === 'model' ? totalModel : totalDesign) >= 90
                      ? 'bg-amber-400/20 text-amber-300 border-amber-400/50'
                      : (scorecardTab === 'model' ? totalModel : totalDesign) >= 80
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                      : (scorecardTab === 'model' ? totalModel : totalDesign) >= 70
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/50'
                      : (scorecardTab === 'model' ? totalModel : totalDesign) > 0
                      ? 'bg-zinc-800 text-zinc-300 border-white/20'
                      : 'bg-zinc-900 text-zinc-500 border-white/10'
                  }`}>
                    {(scorecardTab === 'model' ? totalModel : totalDesign) >= 90 ? '★ Outstanding' : (scorecardTab === 'model' ? totalModel : totalDesign) >= 80 ? '★ Excellent' : (scorecardTab === 'model' ? totalModel : totalDesign) >= 70 ? '★ Very Good' : (scorecardTab === 'model' ? totalModel : totalDesign) > 0 ? 'Good' : 'Unscored'}
                  </span>
                </div>

                {/* 1-Touch Fast Preset Buttons */}
                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                  <span className="text-[10px] font-mono text-zinc-400 hidden sm:inline">1-Touch:</span>
                  <button
                    type="button"
                    onClick={() => (scorecardTab === 'model' ? applyPresetProfile('outstanding') : applyDesignPresetProfile('outstanding'))}
                    className="px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold bg-amber-400/20 text-amber-300 hover:bg-amber-400/30 border border-amber-400/40 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                    title="Quick preset 90+"
                  >
                    ★ 94
                  </button>
                  <button
                    type="button"
                    onClick={() => (scorecardTab === 'model' ? applyPresetProfile('excellent') : applyDesignPresetProfile('excellent'))}
                    className="px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold bg-amber-400/20 text-amber-300 hover:bg-amber-400/30 border border-amber-400/40 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                    title="Quick preset 80+"
                  >
                    ★ 84
                  </button>
                  <button
                    type="button"
                    onClick={() => (scorecardTab === 'model' ? applyPresetProfile('veryGood') : applyDesignPresetProfile('veryGood'))}
                    className="px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold bg-amber-400/20 text-amber-300 hover:bg-amber-400/30 border border-amber-400/40 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                    title="Quick preset 70+"
                  >
                    ★ 74
                  </button>
                  <button
                    type="button"
                    onClick={() => (scorecardTab === 'model' ? applyPresetProfile('fair') : applyDesignPresetProfile('fair'))}
                    className="px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold bg-white/10 text-zinc-300 hover:bg-white/20 border border-white/20 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                    title="Quick preset 60"
                  >
                    60
                  </button>
                  <button
                    type="button"
                    onClick={() => (scorecardTab === 'model' ? applyPresetProfile('zero') : applyDesignPresetProfile('zero'))}
                    className="px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/30 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                    title="Reset to 0"
                  >
                    Clear (0)
                  </button>
                </div>
              </div>

              {/* 📜 ULTRA-COMPACT CRITERIA ROWS (NO SCROLL REQUIRED) */}
              <div className="flex-1 min-h-0 overflow-y-auto novera-scrollbar p-2 sm:p-4 space-y-2 overscroll-contain">
                {(scorecardTab === 'model' ? criteriaList : designCriteriaList).map((crit) => {
                  const IconComponent = crit.icon;
                  return (
                    <div
                      key={crit.id}
                      className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-white/[0.04] border border-white/10 hover:border-novera-gold/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-3"
                    >
                      {/* Title & Max */}
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                          <IconComponent className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-300" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between sm:justify-start gap-1.5">
                            <span className="font-bold text-white text-xs sm:text-sm truncate">{crit.title}</span>
                            <span className="text-[10px] sm:text-xs font-mono text-novera-gold shrink-0 font-bold sm:font-normal sm:text-zinc-400">/ {crit.max}</span>
                          </div>
                          <span className="text-[10px] text-zinc-400 block truncate hidden sm:block">{crit.subtitle}</span>
                        </div>
                      </div>

                      {/* Fast Pill Buttons + Stepper */}
                      <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 shrink-0 w-full sm:w-auto">
                        {/* Quick Presets Pills */}
                        <div className="flex items-center gap-1">
                          {crit.presets.map((preset) => (
                            <button
                              key={preset.val}
                              type="button"
                              onClick={() => crit.set(preset.val)}
                              className={`px-2 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                                crit.val === preset.val
                                  ? 'bg-gradient-to-r from-novera-gold to-amber-400 text-black shadow-sm font-extrabold border border-amber-200'
                                  : 'bg-white/5 hover:bg-white/15 text-zinc-300 border border-white/10'
                              }`}
                            >
                              {preset.val}
                            </button>
                          ))}
                        </div>

                        {/* Stepper [-] [Value] [+] */}
                        <div className="flex items-center gap-1 pl-1.5 border-l border-white/15">
                          <button
                            type="button"
                            onClick={() => crit.set(Math.max(0, crit.val - 1))}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/10 hover:bg-white/20 active:scale-90 text-white flex items-center justify-center border border-white/20 transition-transform cursor-pointer"
                            title="Decrease 1"
                          >
                            <Minus className="w-3 h-3 text-zinc-200" strokeWidth={2.5} />
                          </button>
                          <div className="w-7 sm:w-8 text-center font-serif text-sm sm:text-base font-extrabold text-novera-gold">
                            {crit.val}
                          </div>
                          <button
                            type="button"
                            onClick={() => crit.set(Math.min(crit.max, crit.val + 1))}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/10 hover:bg-white/20 active:scale-90 text-white flex items-center justify-center border border-white/20 transition-transform cursor-pointer"
                            title="Increase 1"
                          >
                            <Plus className="w-3 h-3 text-zinc-200" strokeWidth={2.5} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Confidential Judge Notes - Compact */}
                <div className="pt-1">
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Confidential judge remarks (optional)..."
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-white/5 border border-white/15 text-white placeholder-zinc-500 outline-none focus:border-novera-gold shadow-inner"
                  />
                </div>
              </div>

              {/* 📌 COMPACT FOOTER (CANCEL & INSTANT SUBMIT) */}
              <div className="bg-[#120f0c] border-t border-white/15 px-3 sm:px-5 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-2.5 shrink-0 z-20 pb-safe">
                <button
                  type="button"
                  onClick={() => setScoringCandidate(null)}
                  className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-bold text-zinc-300 transition-colors cursor-pointer shrink-0"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleScoreSubmit}
                  disabled={isSaving}
                  className="flex-1 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#f3e5ab] to-[#aa7c11] text-black font-extrabold hover:brightness-110 active:scale-[0.99] text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-1.5 sm:gap-2 transition-all shadow-xl disabled:opacity-50 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-black shrink-0" strokeWidth={2.5} />
                  <span className="truncate">
                    {isSaving
                      ? 'Submitting...'
                      : `Submit Scores (M: ${totalModel} • D: ${totalDesign})`}
                  </span>
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

      {/* ================= MODEL PROFILE DETAILS MODAL (ACCESSIBLE VIA PHOTO CLICK) ================= */}
      {inspectCandidate && (
        <div
          className="fixed inset-0 z-[10000] bg-black/85 backdrop-blur-xl overflow-y-auto p-3 sm:p-6"
          onClick={() => setInspectCandidate(null)}
        >
          <RunwayStageBackground contained className="opacity-80 pointer-events-none" />
          <div className="min-h-full flex items-center justify-center py-2 sm:py-4">
            <div
              className="relative z-10 w-full max-w-md bg-[#0d0b08]/98 border border-novera-gold/50 rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_0_70px_rgba(0,0,0,0.95),0_0_35px_rgba(203,167,95,0.3)] text-white animate-in zoom-in-95 duration-200 flex flex-col max-h-[92dvh] sm:max-h-[calc(100dvh-2rem)] shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Container (No photo - Name & Number only) */}
              <div className="relative w-full p-5 sm:p-6 bg-gradient-to-b from-[#1c160c] to-[#0d0b08] border-b border-novera-gold/30 shrink-0">
                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setInspectCandidate(null)}
                  className="absolute top-4 right-4 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all z-10 shadow-lg cursor-pointer"
                  title="Close Profile View"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Badges */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-3 py-1 rounded-full bg-novera-gold text-black font-mono font-extrabold text-xs shadow-md whitespace-nowrap">
                    {inspectCandidate.candidateNumber}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-white font-mono text-[10px] uppercase tracking-wider font-semibold whitespace-nowrap">
                    {inspectCandidate.category === 'boy' ? 'Male Model' : 'Female Model'}
                  </span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-amber-200/80 block font-bold">
                    Official Contender Profile
                  </span>
                  <h3 className="font-serif text-xl sm:text-2xl font-black text-white drop-shadow-md break-words">
                    {inspectCandidate.name}
                  </h3>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-6 space-y-3.5 sm:space-y-4 overflow-y-auto pb-safe">
                {/* Bio & Runway Editorial Statement */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-novera-gold font-bold block">
                    Runway Bio &amp; Editorial Profile
                  </span>
                  <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed italic font-serif">
                    &ldquo;{inspectCandidate.bio || 'Official Runway Contender representing elegance, poise, and high fashion.'}&rdquo;
                  </p>
                </div>

                {/* 🎨 Student Designer Registration */}
                {inspectCandidate.hasBestDesignEntry && inspectCandidate.designerName ? (
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/60 to-pink-950/40 border border-purple-500/40 space-y-1">
                    <div className="flex items-center gap-1.5 text-purple-300 text-[10px] font-mono uppercase tracking-wider font-bold">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                      <span>Best Design (Students) Entry</span>
                    </div>
                    <div className="flex items-center justify-between text-xs sm:text-sm pt-0.5">
                      <span className="text-zinc-300">Student Designer:</span>
                      <strong className="font-serif text-white text-sm sm:text-base font-bold text-amber-200">
                        {inspectCandidate.designerName}
                      </strong>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-[11px] text-zinc-400 font-mono text-center">
                    Competing in Model Runway Categories Only
                  </div>
                )}

                {/* Specifications Grid */}
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                    <span className="text-[10px] text-zinc-400 font-mono uppercase block">Age / Category</span>
                    <strong className="text-white font-serif text-sm block pt-0.5">
                      {inspectCandidate.age || 22} Years &bull; {inspectCandidate.category === 'boy' ? 'Male' : 'Female'}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                    <span className="text-[10px] text-zinc-400 font-mono uppercase block">Event</span>
                    <strong className="text-novera-gold font-serif text-sm block pt-0.5">
                      NOVERA &rsquo;26 Runway
                    </strong>
                  </div>
                </div>

                {/* Action Button: Return to Scorecard or Open Scorecard */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (!scoringCandidate || scoringCandidate.id !== inspectCandidate.id) {
                        openScoringModal(inspectCandidate);
                      }
                      setInspectCandidate(null);
                    }}
                    className="w-full py-3 rounded-xl font-bold uppercase tracking-wider text-xs sm:text-sm bg-gradient-to-r from-novera-gold to-amber-500 text-black shadow-lg hover:brightness-110 active:scale-95 flex items-center justify-center gap-2 font-extrabold transition-all cursor-pointer"
                  >
                    <Crown className="w-4 h-4 text-black" />
                    <span>
                      {scoringCandidate?.id === inspectCandidate.id
                        ? 'Return to Scoring Scorecard'
                        : `Open Scorecard for #${inspectCandidate.candidateNumber}`}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
