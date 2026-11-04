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

  // 1. Model Runway Criteria (Max 100 -> Top Model title)
  walking: number; // Max 20
  confidence: number; // Max 20
  stage: number; // Max 20
  posture: number; // Max 15
  poses: number; // Max 15
  face: number; // Max 10
  totalModel: number; // Max 100

  // Computed Sub-Award Scores
  personalityScore: number; // Max 50 (Confidence 20 + Stage 20 + Face 10)
  stagePresenceScore: number; // Max 30 (Confidence 10 + Stage 20)
  photogenicScore: number; // Max 40 (Posture 15 + Poses 15 + Face 10)

  // 2. Student Design Criteria (Optional/Deprecated)
  designCreativity?: number;
  designCraftsmanship?: number;
  designTheme?: number;
  designFit?: number;
  designImpact?: number;
  totalDesign?: number;

  notes?: string;
  updatedAt: number;
}

export interface CandidateAwardRankings {
  candidate: Candidate;
  judgeCount: number;
  topModelAvg: number; // /100
  personalityAvg: number; // /50
  stagePresenceAvg: number; // /30
  photogenicAvg: number; // /40
  designAvg?: number; // /100
  scores: JudgeScore[];
}


