'use client';

import { useState, useEffect } from 'react';
import { Candidate, VoterStatus, GenderCategory } from '@/lib/types';
import {
  fetchCandidates,
  getOrCreateVoterId,
  getLocalVoterStatus,
  submitVote,
  subscribeToCandidates,
} from '@/lib/api';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  Lock,
  Vote,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Award,
  ChevronRight,
  Info,
  RefreshCw,
} from 'lucide-react';
import Image from 'next/image';

export default function VotePage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<GenderCategory>('boy');
  const [voterStatus, setVoterStatus] = useState<VoterStatus | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const voterId = getOrCreateVoterId();
    const status = getLocalVoterStatus(voterId);
    setVoterStatus(status);

    // Initial fetch
    fetchCandidates().then((list) => {
      setCandidates(list);
    });

    // Real-time Firebase Firestore subscription
    const unsubscribeFirebase = subscribeToCandidates((list) => {
      setCandidates(list);
    });

    const handleSync = () => {
      const refreshed = getLocalVoterStatus(voterId);
      setVoterStatus(refreshed);
      fetchCandidates().then(setCandidates);
    };

    window.addEventListener('novera_vote_updated', handleSync);
    return () => {
      unsubscribeFirebase();
      window.removeEventListener('novera_vote_updated', handleSync);
    };
  }, []);

  const boys = candidates.filter((c) => c.category === 'boy');
  const girls = candidates.filter((c) => c.category === 'girl');

  const hasVotedCurrentCategory =
    selectedCategory === 'boy'
      ? voterStatus?.hasVotedBoy
      : voterStatus?.hasVotedGirl;

  const currentVotedForId =
    selectedCategory === 'boy'
      ? voterStatus?.boyVotedFor
      : voterStatus?.girlVotedFor;

  const handleVoteConfirm = async () => {
    if (!selectedCandidate || !voterStatus) return;

    setIsSubmitting(true);
    setFeedback(null);

    const submission = {
      voterId: voterStatus.voterId,
      boyCandidateId: selectedCandidate.category === 'boy' ? selectedCandidate.id : undefined,
      girlCandidateId: selectedCandidate.category === 'girl' ? selectedCandidate.id : undefined,
    };

    const result = await submitVote(submission);
    setIsSubmitting(false);

    if (result.success) {
      setVoterStatus(result.voterStatus);
      setFeedback({ type: 'success', message: result.message });
      setSelectedCandidate(null);

      // Trigger celebratory confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#b3924f', '#0b0b0b', '#eed9a8'],
      });

      // Automatically suggest switching to the other category if not yet voted!
      if (selectedCandidate.category === 'boy' && !result.voterStatus.hasVotedGirl) {
        setTimeout(() => setSelectedCategory('girl'), 1800);
      } else if (selectedCandidate.category === 'girl' && !result.voterStatus.hasVotedBoy) {
        setTimeout(() => setSelectedCategory('boy'), 1800);
      }
    } else {
      setFeedback({ type: 'error', message: result.message });
    }
  };

  const getCandidateById = (id?: string) => candidates.find((c) => c.id === id);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Top Banner / Heading */}
      <div className="text-center max-w-2xl mx-auto mb-8 space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-novera-foil/15 border border-novera-foil/30 text-xs uppercase tracking-widest font-semibold text-novera-foil">
          <Sparkles className="w-3.5 h-3.5 text-novera-gold" />
          <span>Stage Ballot &bull; 1 Boy + 1 Girl</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-novera-ink">
          Official Runway Ballot
        </h1>
        <p className="text-sm text-novera-charcoal leading-relaxed">
          Select your favorite contenders below. Each attendee is strictly permitted{' '}
          <strong className="text-novera-ink">one vote for Best Male Model</strong> and{' '}
          <strong className="text-novera-ink">one vote for Best Female Model</strong>.
        </p>
      </div>

      {/* Voter Status Tracker Card */}
      <div className="mb-8 p-4 sm:p-6 rounded-2xl bg-white border border-novera-ink/10 shadow-editorial">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-novera-paper-dim flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-novera-foil" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-novera-silver font-semibold">Your Ballot Status</div>
              <div className="text-xs font-mono text-novera-charcoal">
                ID: {voterStatus?.voterId ? voterStatus.voterId.substring(0, 16) + '...' : 'Generating...'}
              </div>
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-center">
            {/* Boy Status */}
            <div
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium border ${
                voterStatus?.hasVotedBoy
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              {voterStatus?.hasVotedBoy ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Boy: Voted ({getCandidateById(voterStatus.boyVotedFor)?.name || 'Cast'})</span>
                </>
              ) : (
                <>
                  <Vote className="w-3.5 h-3.5 text-amber-600" />
                  <span>Boy: Pending</span>
                </>
              )}
            </div>

            {/* Girl Status */}
            <div
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium border ${
                voterStatus?.hasVotedGirl
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              {voterStatus?.hasVotedGirl ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Girl: Voted ({getCandidateById(voterStatus.girlVotedFor)?.name || 'Cast'})</span>
                </>
              ) : (
                <>
                  <Vote className="w-3.5 h-3.5 text-amber-600" />
                  <span>Girl: Pending</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`mb-8 p-4 rounded-xl flex items-start gap-3 text-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border border-rose-300 text-rose-900'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-grow font-medium">{feedback.message}</div>
        </div>
      )}

      {/* Category Toggle Tabs (Boy / Girl) */}
      <div className="flex justify-center mb-10">
        <div className="inline-flex p-1.5 rounded-full bg-novera-paper-dim border border-novera-ink/10 shadow-inner">
          <button
            onClick={() => {
              setSelectedCategory('boy');
              setSelectedCandidate(null);
            }}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-xs sm:text-sm font-semibold tracking-wider uppercase transition-all ${
              selectedCategory === 'boy'
                ? 'bg-novera-ink text-novera-paper shadow-md'
                : 'text-novera-charcoal hover:text-novera-ink'
            }`}
          >
            <span>Best Male Model (Boy)</span>
            {voterStatus?.hasVotedBoy && (
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            )}
          </button>

          <button
            onClick={() => {
              setSelectedCategory('girl');
              setSelectedCandidate(null);
            }}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-xs sm:text-sm font-semibold tracking-wider uppercase transition-all ${
              selectedCategory === 'girl'
                ? 'bg-novera-ink text-novera-paper shadow-md'
                : 'text-novera-charcoal hover:text-novera-ink'
            }`}
          >
            <span>Best Female Model (Girl)</span>
            {voterStatus?.hasVotedGirl && (
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            )}
          </button>
        </div>
      </div>

      {/* Category Notice */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-novera-ink">
            {selectedCategory === 'boy' ? 'Contenders — Best Male Model' : 'Contenders — Best Female Model'}
          </h2>
          <p className="text-xs text-novera-charcoal">
            {hasVotedCurrentCategory
              ? 'You have already finalized your vote for this category. One vote per attendee enforced.'
              : 'Tap on a contender card to select and confirm your vote.'}
          </p>
        </div>
        {hasVotedCurrentCategory && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
            <Lock className="w-3.5 h-3.5" />
            <span>Category Finalized</span>
          </div>
        )}
      </div>

      {/* Candidate Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {(selectedCategory === 'boy' ? boys : girls).map((candidate) => {
          const isVotedForThis = currentVotedForId === candidate.id;
          const isSelected = selectedCandidate?.id === candidate.id;
          const isCategoryLocked = hasVotedCurrentCategory;

          return (
            <div
              key={candidate.id}
              onClick={() => {
                if (!isCategoryLocked) {
                  setSelectedCandidate(candidate);
                }
              }}
              className={`group relative rounded-2xl overflow-hidden bg-white border transition-all duration-300 flex flex-col justify-between ${
                isVotedForThis
                  ? 'border-emerald-500 ring-2 ring-emerald-400 shadow-luxury'
                  : isSelected
                  ? 'border-novera-foil ring-2 ring-novera-foil shadow-luxury scale-[1.02]'
                  : isCategoryLocked
                  ? 'border-novera-ink/10 opacity-60 cursor-not-allowed'
                  : 'border-novera-ink/10 hover:border-novera-foil/60 hover:shadow-editorial cursor-pointer'
              }`}
            >
              {/* Photo & Number Badge */}
              <div className="relative aspect-[3/4] w-full bg-novera-paper-dim overflow-hidden">
                <img
                  src={candidate.imageUrl}
                  alt={candidate.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />

                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-novera-ink/80 backdrop-blur-md text-novera-paper font-mono text-xs font-bold tracking-wider">
                  {candidate.candidateNumber}
                </div>

                {isVotedForThis && (
                  <div className="absolute inset-0 bg-emerald-950/60 backdrop-blur-[2px] flex flex-col items-center justify-center text-white p-4 text-center">
                    <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-2 animate-bounce" />
                    <span className="font-serif text-lg font-bold">Your Official Vote</span>
                    <span className="text-[11px] tracking-wider uppercase text-emerald-200">Locked in ballot</span>
                  </div>
                )}
              </div>

              {/* Bio & Details */}
              <div className="p-5 flex-grow flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-lg font-bold text-novera-ink group-hover:text-novera-foil transition-colors">
                      {candidate.name}
                    </h3>
                    {candidate.age && (
                      <span className="text-xs text-novera-silver font-medium">Age {candidate.age}</span>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-novera-charcoal line-clamp-3 leading-relaxed">
                    {candidate.bio}
                  </p>
                </div>

                {/* Vote Action Button */}
                <div className="pt-2 border-t border-novera-ink/5">
                  {isVotedForThis ? (
                    <div className="w-full py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider text-center flex items-center justify-center gap-1.5 border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Vote Recorded</span>
                    </div>
                  ) : isCategoryLocked ? (
                    <div className="w-full py-2 rounded-xl bg-gray-100 text-gray-500 text-xs font-semibold uppercase tracking-wider text-center flex items-center justify-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Ballot Closed</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCandidate(candidate);
                      }}
                      className={`w-full py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                        isSelected
                          ? 'bg-novera-foil text-novera-paper shadow-md'
                          : 'bg-novera-paper-dim text-novera-ink hover:bg-novera-ink hover:text-novera-paper'
                      }`}
                    >
                      <Vote className="w-4 h-4" />
                      <span>{isSelected ? 'Selected' : 'Select Contender'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmation Drawer / Modal when a candidate is selected */}
      {selectedCandidate && !hasVotedCurrentCategory && (
        <div className="fixed inset-0 z-50 bg-novera-ink/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border-2 border-novera-foil/30 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-novera-ink/10">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-novera-foil" />
                <span className="font-serif text-lg font-bold text-novera-ink">Confirm Your Vote</span>
              </div>
              <button
                onClick={() => setSelectedCandidate(null)}
                className="text-xs uppercase tracking-wider text-novera-silver hover:text-novera-ink"
              >
                Cancel
              </button>
            </div>

            <div className="py-6 flex items-center gap-4">
              <img
                src={selectedCandidate.imageUrl}
                alt={selectedCandidate.name}
                className="w-20 h-24 object-cover rounded-xl shadow-md border border-novera-foil/30"
              />
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-novera-paper-dim text-novera-charcoal">
                  {selectedCandidate.candidateNumber}
                </span>
                <h4 className="font-serif text-xl font-bold text-novera-ink">{selectedCandidate.name}</h4>
                <p className="text-xs text-novera-foil font-semibold uppercase tracking-wider">
                  Category: {selectedCandidate.category === 'boy' ? 'Best Male Model' : 'Best Female Model'}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2 mb-6">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
              <span>
                <strong>Important:</strong> You can only vote for ONE {selectedCandidate.category === 'boy' ? 'Boy' : 'Girl'}. Once confirmed, your selection cannot be changed.
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedCandidate(null)}
                className="flex-1 py-3 rounded-full border border-novera-ink/20 text-xs font-semibold uppercase tracking-wider text-novera-charcoal hover:bg-novera-paper-dim transition-colors"
              >
                Go Back
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleVoteConfirm}
                className="flex-1 py-3 rounded-full bg-novera-foil text-novera-paper hover:bg-novera-ink text-xs font-semibold uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm Vote</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completion Banner when both categories are voted */}
      {voterStatus?.hasVotedBoy && voterStatus?.hasVotedGirl && (
        <div className="mt-12 p-8 rounded-3xl bg-novera-ink text-novera-paper text-center space-y-4 border border-novera-foil/40 shadow-luxury">
          <div className="w-14 h-14 rounded-full bg-novera-foil/20 border border-novera-foil flex items-center justify-center mx-auto">
            <Award className="w-8 h-8 text-novera-gold" />
          </div>
          <h3 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight">
            Thank You &bull; Your Full Ballot is Cast!
          </h3>
          <p className="text-xs sm:text-sm text-novera-paper-dim max-w-lg mx-auto">
            Both your Best Male Model and Best Female Model choices have been securely preserved. You can watch the real-time leaderboard unfold in the Admin page.
          </p>
          <div className="pt-2">
            <a
              href="/admin"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-novera-foil text-novera-paper text-xs font-bold uppercase tracking-wider hover:bg-white hover:text-novera-ink transition-all"
            >
              <span>View Live Bar Chart Leaderboard</span>
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

