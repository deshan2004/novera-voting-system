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

