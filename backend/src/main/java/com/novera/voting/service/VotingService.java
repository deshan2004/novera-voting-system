package com.novera.voting.service;

import com.novera.voting.model.Candidate;
import com.novera.voting.model.VoteResponse;
import com.novera.voting.model.VoteSubmission;
import com.novera.voting.model.VoterStatus;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.CompletableFuture;
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
        // Boys (M-01 to M-08) - 2 with Student Designer entry (Sandesh & Sudarshan)
        addCandidate(new Candidate("boy-1", "M-01", "Sandesh Kawya", "boy", 21,
                "Ambitious and confident runway contender with great potential and dedication to high fashion.",
                "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80", 0, "Sithmi", true));
        addCandidate(new Candidate("boy-2", "M-02", "Shanthakumar Sudarshan", "boy", 22,
                "Classic formal posture with sharp cinematic presence and refined catwalk stride.",
                "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80", 0, "Manurie", true));
        addCandidate(new Candidate("boy-3", "M-03", "Dineth Sewmira", "boy", 23,
                "Passionate about the fashion industry and expressing contemporary style with commanding confidence.",
                "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=800&q=80", 0, null, false));
        addCandidate(new Candidate("boy-4", "M-04", "Kaveesha Dahanaka", "boy", 22,
                "Dynamic runway presence showcasing elegance, poise, and high-fashion aura.",
                "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=800&q=80", 0, null, false));
        addCandidate(new Candidate("boy-5", "M-05", "Thashi Jajakodi", "boy", 21,
                "Clean contemporary aesthetics with energetic runway pace and bold modern silhouette.",
                "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80", 0, null, false));
        addCandidate(new Candidate("boy-6", "M-06", "Chanula Wijerathna", "boy", 23,
                "Expressive catwalk style, fusing modern luxury tailoring with confident runway turns.",
                "https://images.unsplash.com/photo-1499996860823-5214fcc65f8f?auto=format&fit=crop&w=800&q=80", 0, null, false));
        addCandidate(new Candidate("boy-7", "M-07", "Chenuth Perera", "boy", 22,
                "Charismatic runway contender with sculpted posture and effortless stage presence.",
                "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=800&q=80", 0, null, false));
        addCandidate(new Candidate("boy-8", "M-08", "Dulaj Thashentha", "boy", 21,
                "Dedicated to representing NOVERA with confidence, style, and professional runway technique.",
                "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=800&q=80", 0, null, false));

        // Girls (F-01 to F-16) - All 16 registered for Best Design (Students)
        addCandidate(new Candidate("girl-1", "F-01", "Dulanjalee Anthony", "girl", 21,
                "Passionate about high fashion and expressing individuality with elegance on the runway.",
                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80", 0, "Banura Maneesha", true));
        addCandidate(new Candidate("girl-2", "F-02", "Ruwini Thisandara", "girl", 22,
                "Runway enthusiast combining poise, fluid motion, and bespoke haute couture style.",
                "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80", 0, "Pramudi", true));
        addCandidate(new Candidate("girl-3", "F-03", "Githmi Wickramarathne", "girl", 20,
                "Graceful pacing and vibrant stage energy bringing modern luxury to life.",
                "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80", 0, "Elisa", true));
        addCandidate(new Candidate("girl-4", "F-04", "Sethuli Jayasekara", "girl", 21,
                "Striking runway presence, high-concept fashion silhouette, and effortless charm.",
                "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80", 0, "Sethuli", true));
        addCandidate(new Candidate("girl-5", "F-05", "Thashini Nimnadi", "girl", 21,
                "Dedicated to runway excellence, confidence, and capturing audience attention.",
                "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=800&q=80", 0, "Disandi", true));
        addCandidate(new Candidate("girl-6", "F-06", "Lufira Maeve", "girl", 23,
                "Passionate about expressing style, gaining experience, and commanding the catwalk with grace.",
                "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=800&q=80", 0, "Lufira", true));
        addCandidate(new Candidate("girl-7", "F-07", "Mandrie Bhawana", "girl", 20,
                "Showcasing bold artistic talent, radiant stage aura, and sophisticated presence.",
                "https://images.unsplash.com/photo-1514315384763-ba401779410f?auto=format&fit=crop&w=800&q=80", 0, "Sithmi", true));
        addCandidate(new Candidate("girl-8", "F-08", "Ovindi Akarsha", "girl", 23,
                "Aspiring high fashion model with refined posture, elegant turns, and camera-ready poise.",
                "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80", 0, "Ovindi", true));
        addCandidate(new Candidate("girl-9", "F-09", "Lumbini Vihara", "girl", 21,
                "Admiring haute couture aesthetics and embodying timeless runway grace.",
                "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80", 0, "Lumbini", true));
        addCandidate(new Candidate("girl-10", "F-10", "Kavindi", "girl", 22,
                "Contemporary resort couture and editorial elegance with balanced cadence.",
                "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=800&q=80", 0, "Manuri", true));
        addCandidate(new Candidate("girl-11", "F-11", "Minthi", "girl", 21,
                "Fresh runway perspective blending modern attitude with effortless grace.",
                "https://images.unsplash.com/photo-1509967419530-da38b4704bc6?auto=format&fit=crop&w=800&q=80", 0, "Minthi", true));
        addCandidate(new Candidate("girl-12", "F-12", "Chathurya Jayani", "girl", 22,
                "Dynamic catwalk walker showcasing high-contrast styling and confident elegance.",
                "https://images.unsplash.com/photo-1492106087820-71aa1df4a77b?auto=format&fit=crop&w=800&q=80", 0, "Chathurya", true));
        addCandidate(new Candidate("girl-13", "F-13", "Januliy Randula", "girl", 24,
                "Genuine passion towards fashion, elegant silhouettes, and runway expression.",
                "https://images.unsplash.com/photo-1516726817505-f5ed825624d8?auto=format&fit=crop&w=800&q=80", 0, "Nayomi", true));
        addCandidate(new Candidate("girl-14", "F-14", "Lahasi Rasoda", "girl", 20,
                "Vibrant and versatile contender with natural rhythm and radiant poise.",
                "https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?auto=format&fit=crop&w=800&q=80", 0, "Lahasi", true));
        addCandidate(new Candidate("girl-15", "F-15", "Imalsha", "girl", 21,
                "Editorial print and catwalk perfection with immaculate poise and expressive facial emotion.",
                "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=800&q=80", 0, "Dinithi", true));
        addCandidate(new Candidate("girl-16", "F-16", "Sinali", "girl", 22,
                "Sophisticated runway walker with clean lines, striking confidence, and captivating stage presence.",
                "https://images.unsplash.com/photo-1526510706041-07ee4b85c2c7?auto=format&fit=crop&w=800&q=80", 0, "Sinali", true));
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
     * - Fine-grained per-voter synchronization ensures 100+ concurrent users vote without global queue bottlenecks.
     */
    public VoteResponse processVote(VoteSubmission submission) {
        String voterId = submission.getVoterId();
        if (voterId == null || voterId.trim().isEmpty()) {
            return new VoteResponse(false, "Voter identity token is missing.", null);
        }

        VoterStatus status = voterRegistry.computeIfAbsent(voterId, VoterStatus::new);

        // Lock only this individual voter's status to prevent double-votes, without blocking other voters
        synchronized (status) {
            // Check Boy Vote Constraint
            if (submission.getBoyCandidateId() != null) {
                if (status.isHasVotedBoy()) {
                    return new VoteResponse(false, "You have already voted for a Best Male Model (Boy). Only one vote allowed.", status);
                }
                Candidate boy = candidates.get(submission.getBoyCandidateId());
                if (boy == null || !"boy".equalsIgnoreCase(boy.getCategory())) {
                    return new VoteResponse(false, "Invalid male candidate selected.", status);
                }
                int updatedVotes = boy.incrementVotes();
                status.setHasVotedBoy(true);
                status.setBoyVotedFor(boy.getId());
                CompletableFuture.runAsync(() -> firebaseService.syncCandidateVote(boy.getId(), updatedVotes));
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
                int updatedVotes = girl.incrementVotes();
                status.setHasVotedGirl(true);
                status.setGirlVotedFor(girl.getId());
                CompletableFuture.runAsync(() -> firebaseService.syncCandidateVote(girl.getId(), updatedVotes));
            }

            status.setVotedAt(System.currentTimeMillis());
            CompletableFuture.runAsync(() -> firebaseService.syncVoterStatus(status));

            return new VoteResponse(true, "Your vote has been verified and recorded on the NOVERA '26 ledger.", status);
        }
    }

    public synchronized void resetAllVotes() {
        for (Candidate c : candidates.values()) {
            c.setVotes(0);
        }
        voterRegistry.clear();
        firebaseService.resetAllInFirestore();
    }
}

