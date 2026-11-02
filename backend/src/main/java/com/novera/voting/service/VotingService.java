package com.novera.voting.service;

import com.novera.voting.model.Candidate;
import com.novera.voting.model.VoteResponse;
import com.novera.voting.model.VoteSubmission;
import com.novera.voting.model.VoterStatus;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class VotingService {

    private final Map<String, Candidate> candidates = new ConcurrentHashMap<>();
    private final Map<String, VoterStatus> voterRegistry = new ConcurrentHashMap<>();
    private final FirebaseService firebaseService;

    public VotingService(FirebaseService firebaseService) {
        this.firebaseService = firebaseService;
        initSeedCandidates();
    }

    private void initSeedCandidates() {
        // Boys
        addCandidate(new Candidate("boy-1", "M-01", "Kavindu Senaratne", "boy", 22,
                "Runway specialist, blending street avant-garde with high tailoring.",
                "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80", 0));
        addCandidate(new Candidate("boy-2", "M-02", "Tariq Al-Mansoor", "boy", 23,
                "Editorial print model with poise and contemporary minimalism.",
                "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80", 0));
        addCandidate(new Candidate("boy-3", "M-03", "Liam Chen", "boy", 21,
                "Athletic silhouette, passionate about sustainable resort wear.",
                "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=800&q=80", 0));
        addCandidate(new Candidate("boy-4", "M-04", "Dilshan Perera", "boy", 24,
                "Classic formal posture with sharp cinematic presence.",
                "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=800&q=80", 0));

        // Girls
        addCandidate(new Candidate("girl-1", "F-01", "Aanya Fernando", "girl", 21,
                "Haute couture runway walker, championing ethical Sri Lankan fabrics.",
                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80", 0));
        addCandidate(new Candidate("girl-2", "F-02", "Elena Rostova", "girl", 22,
                "High-concept couture muse with expressive editorial poses.",
                "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80", 0));
        addCandidate(new Candidate("girl-3", "F-03", "Senuri Jayawardena", "girl", 20,
                "Glamour and fluidity, combining traditional grace with modern runway.",
                "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80", 0));
        addCandidate(new Candidate("girl-4", "F-04", "Maya De Silva", "girl", 23,
                "Bold and confident statement walk, fashion styling enthusiast.",
                "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80", 0));
    }

    public synchronized void addCandidate(Candidate candidate) {
        candidates.put(candidate.getId(), candidate);
    }

    public List<Candidate> getAllCandidates() {
        return new ArrayList<>(candidates.values());
    }

    public List<Candidate> getCandidatesByCategory(String category) {
        return candidates.values().stream()
                .filter(c -> category.equalsIgnoreCase(c.getCategory()))
                .toList();
    }

    public VoterStatus getVoterStatus(String voterId) {
        return voterRegistry.computeIfAbsent(voterId, VoterStatus::new);
    }

    /**
     * Strict Ballot Verification:
     * - Only 1 Boy vote per voter
     * - Only 1 Girl vote per voter
     */
    public synchronized VoteResponse processVote(VoteSubmission submission) {
        String voterId = submission.getVoterId();
        if (voterId == null || voterId.trim().isEmpty()) {
            return new VoteResponse(false, "Voter identity token is missing.", null);
        }

        VoterStatus status = voterRegistry.computeIfAbsent(voterId, VoterStatus::new);

        // Check Boy Vote Constraint
        if (submission.getBoyCandidateId() != null) {
            if (status.isHasVotedBoy()) {
                return new VoteResponse(false, "You have already voted for a Best Male Model (Boy). Only one vote allowed.", status);
            }
            Candidate boy = candidates.get(submission.getBoyCandidateId());
            if (boy == null || !"boy".equalsIgnoreCase(boy.getCategory())) {
                return new VoteResponse(false, "Invalid male candidate selected.", status);
            }
            boy.setVotes(boy.getVotes() + 1);
            status.setHasVotedBoy(true);
            status.setBoyVotedFor(boy.getId());
            firebaseService.syncCandidateVote(boy.getId(), boy.getVotes());
        }

        // Check Girl Vote Constraint
        if (submission.getGirlCandidateId() != null) {
            if (status.isHasVotedGirl()) {
                return new VoteResponse(false, "You have already voted for a Best Female Model (Girl). Only one vote allowed.", status);
            }
            Candidate girl = candidates.get(submission.getGirlCandidateId());
            if (girl == null || !"girl".equalsIgnoreCase(girl.getCategory())) {
                return new VoteResponse(false, "Invalid female candidate selected.", status);
            }
            girl.setVotes(girl.getVotes() + 1);
            status.setHasVotedGirl(true);
            status.setGirlVotedFor(girl.getId());
            firebaseService.syncCandidateVote(girl.getId(), girl.getVotes());
        }

        status.setVotedAt(System.currentTimeMillis());
        firebaseService.syncVoterStatus(status);

        return new VoteResponse(true, "Your vote has been verified and recorded on the NOVERA '26 ledger.", status);
    }

    public synchronized void resetAllVotes() {
        for (Candidate c : candidates.values()) {
            c.setVotes(0);
        }
        voterRegistry.clear();
        firebaseService.resetAllInFirestore();
    }
}

