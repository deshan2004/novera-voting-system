export type GenderCategory = 'boy' | 'girl';

export interface Candidate {
  id: string;
  candidateNumber: string; // e.g. "M-01", "F-01"
  name: string;
  category: GenderCategory;
  age?: number;
  bio?: string;
  imageUrl: string;
  votes: number;
}

export interface VoteSubmission {
  voterId: string;
  boyCandidateId?: string;
  girlCandidateId?: string;
  timestamp?: number;
}

export interface VoterStatus {
  voterId: string;
  hasVotedBoy: boolean;
  hasVotedGirl: boolean;
  boyVotedFor?: string;
  girlVotedFor?: string;
  votedAt?: number;
}

export interface LeaderboardStats {
  totalVotes: number;
  boyVotes: number;
  girlVotes: number;
  boys: Candidate[];
  girls: Candidate[];
  votingStatus: 'ACTIVE' | 'PAUSED' | 'CONCLUDED';
}

export interface JudgeScore {
  id: string; // `${judgeId}_${candidateId}`
  judgeId: string;
  judgeName: string;
  candidateId: string;
  candidateCategory: GenderCategory;
  runwayWalk: number; // 0 - 30 (Walk, Posture & Poise)
  styling: number; // 0 - 30 (Styling, Outfit & Visual Appeal)
  personality: number; // 0 - 40 (Confidence & Runway Presence)
  total: number; // 0 - 100
  notes?: string;
  updatedAt: number;
}

export interface CandidateJudgeStats {
  candidate: Candidate;
  scores: JudgeScore[];
  averageScore: number;
  totalScore: number;
  judgeCount: number;
}


