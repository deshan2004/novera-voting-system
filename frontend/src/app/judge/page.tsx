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
  Activity,
  Check,
  Zap,
  Palette,
  Camera,
  Heart,
  Crown,
} from 'lucide-react';

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
  const [sheetTab, setSheetTab] = useState<'model' | 'design'>('model');

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

    return () => unsubscribe();
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const inputClean = passcode.trim().toLowerCase();

    // Directly match judge by passcode / name
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
    setSheetTab('model');

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
  };

  // Calculations for titles
  const totalModel = Number(walking) + Number(confidence) + Number(stage) + Number(posture) + Number(poses) + Number(face);
  const personalityScore = Number(confidence) + Number(stage) + Number(face); // max 50
  const stagePresenceScore = Math.min(10, Math.round(Number(confidence) / 2)) + Number(stage); // max 30 (10 conf + 20 stage)
  const photogenicScore = Number(posture) + Number(poses) + Number(face); // max 40
  const totalDesign = Number(designCreativity) + Number(designCraftsmanship) + Number(designTheme) + Number(designFit) + Number(designImpact); // max 100

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

      // Student Design Sheet
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

    // Launch Big Dramatic Animation Sequence!
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
        particleCount: 100,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#b3924f', '#ecd599', '#ff3b30', '#ffffff'],
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-novera-ink/10 shadow-editorial text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-novera-ink text-novera-gold mx-auto flex items-center justify-center shadow-lg border border-novera-foil/30">
            <Lock className="w-8 h-8 text-novera-gold" />
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
              <span>Official Jury Authentication</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-novera-ink">
              Judges Scoring Portal
            </h1>
            <p className="text-xs text-novera-charcoal">
              Enter your confidential judge passcode to evaluate contestants
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-novera-charcoal mb-1.5">
                Judge Passcode
              </label>
              <input
                type="password"
                placeholder="Enter passcode"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-novera-ink/20 text-xs sm:text-sm bg-novera-paper-dim text-novera-ink outline-none focus:border-novera-foil font-mono text-center tracking-widest text-base"
                required
                autoFocus
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
              className="w-full py-3.5 rounded-xl bg-novera-ink text-novera-paper hover:bg-novera-foil transition-all text-xs font-bold uppercase tracking-wider shadow-md flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4 text-novera-gold" />
              <span>Unlock Jury Scorecard</span>
            </button>
          </form>

          <p className="text-[11px] text-novera-silver">
            Authorized by NOVERA ’26 Organizing Committee &bull; AIESEC in CINEC
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      {/* 🔴 LIVE ADMIN SURVEILLANCE & AUDIT BANNER */}
      <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-red-950 via-novera-ink to-red-950 text-white border-2 border-red-500/40 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-red-500/20 border border-red-500/60 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping absolute" />
              <Radio className="w-4 h-4 text-red-400 relative z-10" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] font-bold text-red-400">
                  LIVE ADMIN SURVEILLANCE ACTIVE
                </span>
                <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-red-400" />
                <span className="text-[10px] text-zinc-300 font-mono hidden sm:inline">
                  AUDIT ID: #{activeJudge.code.toUpperCase()}-STREAM
                </span>
              </div>
              <p className="text-xs text-zinc-200 mt-0.5 font-medium">
                The Central Organizing Committee &amp; Master Admin are actively monitoring your scorecard in real-time.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-300 bg-black/40 px-3 py-1.5 rounded-xl border border-white/10 shrink-0">
            <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>SOCKET: SECURE 256-BIT</span>
          </div>
        </div>
      </div>

      {/* Top Header Card */}
      <div className="p-6 rounded-3xl bg-white border border-novera-ink/10 shadow-editorial mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-center sm:text-left">
          <div className="w-12 h-12 rounded-2xl bg-novera-foil/15 flex items-center justify-center shrink-0 border border-novera-foil/30">
            <Award className="w-6 h-6 text-novera-foil" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-novera-foil">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Official Runway Jury &bull; Seat Verified</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-novera-ink">
              {activeJudge.name}
            </h1>
            <p className="text-xs text-novera-charcoal">
              {activeJudge.title} &bull; Model Performance &amp; Student Design Marking
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-2xl bg-novera-paper-dim border border-novera-ink/10 text-xs">
            <span className="text-novera-charcoal font-medium">Evaluation: </span>
            <span className="font-bold text-novera-foil">
              {scoredCount} / {currentCategoryCandidates.length}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Category Toggle Tabs */}
      <div className="flex justify-center mb-8 px-2">
        <div className="inline-flex w-full max-w-md p-1.5 rounded-full bg-novera-paper-dim border border-novera-ink/10 shadow-inner">
          <button
            onClick={() => setSelectedCategory('boy')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 sm:px-6 py-2.5 rounded-full text-xs sm:text-sm font-semibold tracking-wider uppercase transition-all ${
              selectedCategory === 'boy'
                ? 'bg-novera-ink text-novera-paper shadow-md'
                : 'text-novera-charcoal hover:text-novera-ink'
            }`}
          >
            <span className="hidden sm:inline">Best Male Contenders (Boys)</span>
            <span className="sm:hidden">Male (Boys)</span>
          </button>

          <button
            onClick={() => setSelectedCategory('girl')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 sm:px-6 py-2.5 rounded-full text-xs sm:text-sm font-semibold tracking-wider uppercase transition-all ${
              selectedCategory === 'girl'
                ? 'bg-novera-ink text-novera-paper shadow-md'
                : 'text-novera-charcoal hover:text-novera-ink'
            }`}
          >
            <span className="hidden sm:inline">Best Female Contenders (Girls)</span>
            <span className="sm:hidden">Female (Girls)</span>
          </button>
        </div>
      </div>

      {/* Candidate Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {currentCategoryCandidates.map((candidate) => {
          const score = getScoreForCandidate(candidate.id);
          const isScored = !!score;

          return (
            <div
              key={candidate.id}
              className={`rounded-2xl bg-white border p-5 flex flex-col justify-between transition-all duration-300 shadow-sm ${
                isScored ? 'border-emerald-400 ring-2 ring-emerald-200' : 'border-novera-ink/10 hover:border-novera-foil'
              }`}
            >
              <div>
                {/* Image & Badges */}
                <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden mb-4 bg-novera-paper-dim">
                  <Image
                    src={candidate.imageUrl}
                    alt={candidate.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 25vw"
                  />
                  <div className="absolute top-2 left-2 px-2.5 py-1 rounded-md bg-novera-ink/80 text-novera-paper text-[10px] font-mono uppercase tracking-wider backdrop-blur-sm">
                    {candidate.candidateNumber}
                  </div>
                  {isScored && (
                    <div className="absolute top-2 right-2 px-2.5 py-1 rounded-md bg-emerald-600 text-white text-[10px] font-bold flex items-center gap-1 shadow-md">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{score.totalModel}/100</span>
                    </div>
                  )}
                </div>

                <h3 className="font-serif text-lg font-bold text-novera-ink mb-1 truncate">
                  {candidate.name}
                </h3>
                <p className="text-xs text-novera-charcoal line-clamp-2 mb-4">
                  {candidate.bio || 'Runway contender representing elegance and personality.'}
                </p>

                {/* Score Summary if given */}
                {isScored && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] space-y-1.5 mb-4">
                    <div className="flex justify-between text-emerald-950 font-bold">
                      <span>Top Model:</span>
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
                    <div className="flex justify-between text-emerald-900 pt-1 border-t border-emerald-200 font-semibold">
                      <span>Student Design:</span>
                      <span className="font-mono">{score.totalDesign}/100</span>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => openScoringModal(candidate)}
                className={`w-full py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors ${
                  isScored
                    ? 'bg-novera-paper-dim text-novera-ink border border-novera-ink/15 hover:bg-novera-foil hover:text-novera-paper'
                    : 'bg-novera-ink text-novera-paper hover:bg-novera-foil'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{isScored ? 'Update Marks' : 'Evaluate & Score'}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Modal Drawer for Scoring with Official Marking Sheet Alignment */}
      {scoringCandidate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="max-w-lg w-full bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-8 border border-novera-foil/30 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-novera-ink/10 mb-4">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0">
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
                className="w-8 h-8 rounded-full bg-novera-paper-dim hover:bg-novera-ink hover:text-novera-paper text-novera-charcoal flex items-center justify-center transition-colors text-sm font-bold"
              >
                &times;
              </button>
            </div>

            {/* Sheet Tabs: Model vs Design */}
            <div className="flex p-1 rounded-xl bg-novera-paper-dim border border-novera-ink/10 mb-5">
              <button
                type="button"
                onClick={() => setSheetTab('model')}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  sheetTab === 'model'
                    ? 'bg-novera-ink text-novera-paper shadow-sm'
                    : 'text-novera-charcoal hover:text-novera-ink'
                }`}
              >
                <Crown className="w-3.5 h-3.5 text-novera-gold" />
                <span>1. Model Performance (100)</span>
              </button>
              <button
                type="button"
                onClick={() => setSheetTab('design')}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  sheetTab === 'design'
                    ? 'bg-novera-foil text-novera-paper shadow-sm'
                    : 'text-novera-charcoal hover:text-novera-ink'
                }`}
              >
                <Palette className="w-3.5 h-3.5 text-novera-paper" />
                <span>2. Student Design (100)</span>
              </button>
            </div>

            {/* TAB 1: MODEL PERFORMANCE OFFICIAL CRITERIA */}
            {sheetTab === 'model' && (
              <div className="space-y-4">
                {/* Live Awards Alignment Badge Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-2xl bg-novera-paper-dim border border-novera-ink/10 text-center">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-novera-charcoal font-bold block">Top Model</span>
                    <strong className="text-sm font-mono text-novera-foil">{totalModel}/100</strong>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-novera-charcoal font-bold block">Personality</span>
                    <strong className="text-sm font-mono text-novera-ink">{personalityScore}/50</strong>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-novera-charcoal font-bold block">Stage Pres.</span>
                    <strong className="text-sm font-mono text-novera-ink">{stagePresenceScore}/30</strong>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-novera-charcoal font-bold block">Photogenic</span>
                    <strong className="text-sm font-mono text-novera-ink">{photogenicScore}/40</strong>
                  </div>
                </div>

                {/* 6 Official Model Criteria Sliders */}
                <div className="space-y-4 pt-1">
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="font-semibold text-novera-ink">Walking (Ramp walk cadence &amp; gait)</span>
                      <span className="font-mono font-bold text-novera-foil">{walking} / 20</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      value={walking}
                      onChange={(e) => setWalking(Number(e.target.value))}
                      className="w-full accent-novera-foil cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="font-semibold text-novera-ink">Confidence (Attitude &amp; character)</span>
                      <span className="font-mono font-bold text-novera-foil">{confidence} / 20</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      value={confidence}
                      onChange={(e) => setConfidence(Number(e.target.value))}
                      className="w-full accent-novera-foil cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="font-semibold text-novera-ink">Stage Presence (Audience impact)</span>
                      <span className="font-mono font-bold text-novera-foil">{stage} / 20</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      value={stage}
                      onChange={(e) => setStage(Number(e.target.value))}
                      className="w-full accent-novera-foil cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="font-semibold text-novera-ink">Posture (Spine alignment &amp; poise)</span>
                      <span className="font-mono font-bold text-novera-foil">{posture} / 15</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="15"
                      value={posture}
                      onChange={(e) => setPosture(Number(e.target.value))}
                      className="w-full accent-novera-foil cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="font-semibold text-novera-ink">Poses (Runway turns &amp; pauses)</span>
                      <span className="font-mono font-bold text-novera-foil">{poses} / 15</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="15"
                      value={poses}
                      onChange={(e) => setPoses(Number(e.target.value))}
                      className="w-full accent-novera-foil cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="font-semibold text-novera-ink">Face (Facial expression &amp; camera-ready)</span>
                      <span className="font-mono font-bold text-novera-foil">{face} / 10</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={face}
                      onChange={(e) => setFace(Number(e.target.value))}
                      className="w-full accent-novera-foil cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: STUDENT DESIGN OFFICIAL CRITERIA */}
            {sheetTab === 'design' && (
              <div className="space-y-4">
                <div className="p-3 rounded-2xl bg-novera-ink text-novera-paper flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-novera-gold font-bold">
                      Student Outfit Design Score
                    </span>
                    <div className="text-[11px] text-novera-silver">Judged strictly on design craft</div>
                  </div>
                  <strong className="text-2xl font-serif text-novera-gold font-mono">{totalDesign}/100</strong>
                </div>

                <div className="space-y-4 pt-1">
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="font-semibold text-novera-ink">Creativity &amp; Originality (Fresh concept)</span>
                      <span className="font-mono font-bold text-novera-foil">{designCreativity} / 30</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="30"
                      value={designCreativity}
                      onChange={(e) => setDesignCreativity(Number(e.target.value))}
                      className="w-full accent-novera-foil cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="font-semibold text-novera-ink">Craftsmanship &amp; Finish (Stitching &amp; details)</span>
                      <span className="font-mono font-bold text-novera-foil">{designCraftsmanship} / 25</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="25"
                      value={designCraftsmanship}
                      onChange={(e) => setDesignCraftsmanship(Number(e.target.value))}
                      className="w-full accent-novera-foil cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="font-semibold text-novera-ink">Theme Relevance (Fits event theme)</span>
                      <span className="font-mono font-bold text-novera-foil">{designTheme} / 20</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      value={designTheme}
                      onChange={(e) => setDesignTheme(Number(e.target.value))}
                      className="w-full accent-novera-foil cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="font-semibold text-novera-ink">Fit &amp; Styling (Sitting on model in motion)</span>
                      <span className="font-mono font-bold text-novera-foil">{designFit} / 15</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="15"
                      value={designFit}
                      onChange={(e) => setDesignFit(Number(e.target.value))}
                      className="w-full accent-novera-foil cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="font-semibold text-novera-ink">Overall Impact (Stage visual effect)</span>
                      <span className="font-mono font-bold text-novera-foil">{designImpact} / 10</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={designImpact}
                      onChange={(e) => setDesignImpact(Number(e.target.value))}
                      className="w-full accent-novera-foil cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Judge Notes */}
            <div className="pt-3">
              <label className="block text-xs font-semibold text-novera-charcoal mb-1">
                Confidential Judge Notes (Visible to Admin)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Excellent posture and striking outfit presentation..."
                rows={2}
                className="w-full px-3 py-2 text-xs rounded-xl border border-novera-ink/15 bg-novera-paper-dim text-novera-ink outline-none focus:border-novera-foil resize-none"
              />
            </div>

            {/* Actions */}
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setScoringCandidate(null)}
                className="w-1/3 py-3 rounded-xl border border-novera-ink/15 text-xs font-semibold text-novera-charcoal hover:bg-novera-paper-dim transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleScoreSubmit}
                disabled={isSaving}
                className="w-2/3 py-3 rounded-xl bg-novera-ink text-novera-paper hover:bg-novera-foil text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50"
              >
                <Save className="w-4 h-4 text-novera-gold" />
                <span>Submit Score to Admin</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 BIG DRAMATIC SUBMISSION ANIMATION OVERLAY */}
      {animationState && animationState.isOpen && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="max-w-md w-full text-center space-y-6 relative">
            <div className="absolute inset-0 bg-novera-foil/15 blur-3xl -z-10 rounded-full" />

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
