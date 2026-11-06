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
        // Boys (M-01 to M-10)
        addCandidate(new Candidate("boy-1", "M-01", "Kavindu Senaratne", "boy", 22,
                "Runway specialist, blending street avant-garde with high tailoring.",
                "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80", 0));
        addCandidate(new Candidate("boy-2", "M-02", "Dilshan Perera", "boy", 23,
                "Classic formal posture with sharp cinematic presence.",
                "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80", 0));
        addCandidate(new Candidate("boy-3", "M-03", "Thisara Bandara", "boy", 21,
                "Athletic silhouette, passionate about sustainable resort wear.",
                "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=800&q=80", 0));
        addCandidate(new Candidate("boy-4", "M-04", "Chamath Jayasuriya", "boy", 24,
                "High-fashion editorial muse, striking confident gaze and strut.",
                "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=800&q=80", 0));
        addCandidate(new Candidate("boy-5", "M-05", "Oshada Weerasinghe", "boy", 22,
                "Clean contemporary aesthetics with energetic runway pace.",
                "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80", 0));
        addCandidate(new Candidate("boy-6", "M-06", "Shenal Fernando", "boy", 23,
                "Modern luxury enthusiast with precise pivot turns and poise.",
                "https://images.unsplash.com/photo-1499996860823-5214fcc65f8f?auto=format&fit=crop&w=800&q=80", 0));
        addCandidate(new Candidate("boy-7", "M-07", "Dinuka Gunawardena", "boy", 21,
                "Expressive catwalk style, fusing traditional drape with modern cuts.",
                "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=800&q=80", 0));
        addCandidate(new Candidate("boy-8", "M-08", "Janith Wickramasinghe", "boy", 24,
                "Dynamic presence with bold high-contrast styling.",
                "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=800&q=80", 0));
        addCandidate(new Candidate("boy-9", "M-09", "Rasheen Alahakoon", "boy", 22,
                "Sculpted posture with charismatic stage aura and fluidity.",
                "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=800&q=80", 0));
        addCandidate(new Candidate("boy-10", "M-10", "Sahan Rathnayake", "boy", 23,
                "Urban minimalist, refined demeanor and commanding runway stride.",
                "https://images.unsplash.com/photo-1463453091185-61582044d556?auto=format&fit=crop&w=800&q=80", 0));

        // Girls (F-01 to F-10)
        addCandidate(new Candidate("girl-1", "F-01", "Aanya Fernando", "girl", 21,
                "Haute couture runway walker, championing ethical Sri Lankan fabrics.",
                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80", 0));
        addCandidate(new Candidate("girl-2", "F-02", "Senuri Jayawardena", "girl", 20,
                "Glamour and fluidity, combining traditional grace with modern runway.",
                "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80", 0));
        addCandidate(new Candidate("girl-3", "F-03", "Maya De Silva", "girl", 23,
                "Bold and confident statement walk, fashion styling enthusiast.",
                "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80", 0));
        addCandidate(new Candidate("girl-4", "F-04", "Tharushi Dissanayake", "girl", 22,
                "Striking runway presence, high-concept fashion silhouette.",
                "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80", 0));
        addCandidate(new Candidate("girl-5", "F-05", "Hiruni Ranasinghe", "girl", 21,
                "Graceful pacing and radiant stage energy with bespoke outfits.",
                "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=800&q=80", 0));
        addCandidate(new Candidate("girl-6", "F-06", "Chamodi Karunaratne", "girl", 22,
                "Editorial print and ramp perfection with immaculate poise.",
                "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=800&q=80", 0));
        addCandidate(new Candidate("girl-7", "F-07", "Nimasha Mendis", "girl", 24,
                "Sophisticated style, contemporary resort couture specialist.",
                "https://images.unsplash.com/photo-1514315384763-ba401779410f?auto=format&fit=crop&w=800&q=80", 0));
        addCandidate(new Candidate("girl-8", "F-08", "Rashmi Rajapaksha", "girl", 20,
                "Vibrant and versatile, effortlessly commanding runway attention.",
                "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80", 0));
        addCandidate(new Candidate("girl-9", "F-09", "Sandani Liyanage", "girl", 23,
                "Expressive poses and balanced cadence with haute couture flair.",
                "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80", 0));
        addCandidate(new Candidate("girl-10", "F-10", "Kaveesha Wijesinghe", "girl", 21,
                "Timeless elegance with modern flair and sharp runway turns.",
                "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=800&q=80", 0));
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

