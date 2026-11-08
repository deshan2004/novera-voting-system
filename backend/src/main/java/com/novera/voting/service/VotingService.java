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
        // 👗 FEMALE MODELS [F] (01 to 16)
        addCandidate(new Candidate("c-01", "01", "Dulanjalee Anthony", "girl", 21,
                "Passionate about high fashion and expressing individuality with elegance on the runway.",
                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80", 0, "Banura Maneesha", true));
        addCandidate(new Candidate("c-02", "02", "Ruvini Thisandara", "girl", 22,
                "Runway enthusiast combining poise, fluid motion, and bespoke haute couture style.",
                "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80", 0, "Pramudi Kawya", true));
        addCandidate(new Candidate("c-03", "03", "Githmi Wickramarathne", "girl", 20,
                "Graceful pacing and vibrant stage energy bringing modern luxury to life.",
                "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80", 0, "Elissa", true));
        addCandidate(new Candidate("c-04", "04", "Tashini Nimnadi", "girl", 21,
                "Dedicated to runway excellence, confidence, and capturing audience attention.",
                "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=800&q=80", 0, "Disandi", true));
        addCandidate(new Candidate("c-05", "05", "Sethuli Jayasekara", "girl", 21,
                "Striking runway presence, high-concept fashion silhouette, and effortless charm.",
                "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80", 0, "Disandi", true));
        addCandidate(new Candidate("c-06", "06", "Mandrie Bhawana", "girl", 20,
                "Showcasing bold artistic talent, radiant stage aura, and sophisticated presence.",
                "https://images.unsplash.com/photo-1514315384763-ba401779410f?auto=format&fit=crop&w=800&q=80", 0, "Sithmi", true));
        addCandidate(new Candidate("c-07", "07", "Ovindi Akarsha", "girl", 23,
                "Aspiring high fashion model with refined posture, elegant turns, and camera-ready poise.",
                "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80", 0, "Sithmi", true));
        addCandidate(new Candidate("c-08", "08", "Lumbini Vihara", "girl", 21,
                "Admiring haute couture aesthetics and embodying timeless runway grace.",
                "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80", 0, "Sithmi", true));
        addCandidate(new Candidate("c-09", "09", "Januly Randula", "girl", 24,
                "Genuine passion towards fashion, elegant silhouettes, and runway expression.",
                "https://images.unsplash.com/photo-1516726817505-f5ed825624d8?auto=format&fit=crop&w=800&q=80", 0, "Nayomi", true));
        addCandidate(new Candidate("c-10", "10", "Lahasi Rasoda", "girl", 20,
                "Vibrant and versatile contender with natural rhythm and radiant poise.",
                "https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?auto=format&fit=crop&w=800&q=80", 0, "Nayomi", true));
        addCandidate(new Candidate("c-11", "11", "Dinithi", "girl", 21,
                "Editorial print and catwalk perfection with immaculate poise and expressive facial emotion.",
                "https://images.unsplash.com/photo-1526510706041-07ee4b85c2c7?auto=format&fit=crop&w=800&q=80", 0, "Nayomi", true));
        addCandidate(new Candidate("c-12", "12", "Sineli", "girl", 22,
                "Sophisticated runway walker with clean lines, striking confidence, and captivating stage presence.",
                "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=800&q=80", 0, "Nayomi", true));
        addCandidate(new Candidate("c-13", "13", "Minuthi", "girl", 21,
                "Fresh runway perspective blending modern attitude with effortless grace.",
                "https://images.unsplash.com/photo-1509967419530-da38b4704bc6?auto=format&fit=crop&w=800&q=80", 0, null, false));
        addCandidate(new Candidate("c-14", "14", "Kalpani", "girl", 21,
                "Poised runway contender bringing refined grace, modern confidence, and runway elegance.",
                "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=800&q=80", 0, null, false));
        addCandidate(new Candidate("c-15", "15", "Chathurya Jayani", "girl", 22,
                "Dynamic catwalk walker showcasing high-contrast styling and confident elegance.",
                "https://images.unsplash.com/photo-1492106087820-71aa1df4a77b?auto=format&fit=crop&w=800&q=80", 0, null, false));
        addCandidate(new Candidate("c-16", "16", "Sashi", "girl", 21,
                "Charming runway contender displaying expressive catwalk poise and elegant style.",
                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80", 0, null, false));

        // 👔 MALE MODEL [M] (17 - Sandesh Kawya, Best Design Entry)
        addCandidate(new Candidate("c-17", "17", "Sandesh Kawya", "boy", 21,
                "Ambitious and confident runway contender with great potential and dedication to high fashion.",
                "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80", 0, "Sithmi", true));

        // 👑 KANDYAN SEGMENT (18 [F], 19 [M], 20 [M])
        addCandidate(new Candidate("c-18", "18", "Navini", "girl", 22,
                "Kandyan segment featured contender showcasing regal poise, classical grace, and majestic stage allure.",
                "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=800&q=80", 0, null, false));
        addCandidate(new Candidate("c-19", "19", "Surin", "boy", 23,
                "Commanding runway technique presenting high-concept heritage menswear and stately posture.",
                "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=800&q=80", 0, null, false));
        addCandidate(new Candidate("c-20", "20", "Avishka", "boy", 22,
                "Distinguished stage presence blending traditional stature with contemporary high-fashion elegance.",
                "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80", 0, null, false));

        // 👔 CASUAL / ALANKARI SEGMENT [M] (21 to 25)
        addCandidate(new Candidate("c-21", "21", "Shaluka", "boy", 22,
                "Casual & Alankari runway style contender bringing vibrant energy, charisma, and effortless poise.",
                "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80", 0, null, false));
        addCandidate(new Candidate("c-22", "22", "Dulaj Thashentha", "boy", 21,
                "Dedicated to representing NOVERA with confidence, style, and professional runway technique.",
                "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=800&q=80", 0, null, false));
        addCandidate(new Candidate("c-23", "23", "Shanthakumar Sudarshan", "boy", 22,
                "Classic formal posture with sharp cinematic presence and refined catwalk stride.",
                "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=800&q=80", 0, null, false));
        addCandidate(new Candidate("c-24", "24", "Vivishka", "boy", 21,
                "Fresh casual contemporary look with vibrant cadence and strong stage personality.",
                "https://images.unsplash.com/photo-1499996860823-5214fcc65f8f?auto=format&fit=crop&w=800&q=80", 0, null, false));
        addCandidate(new Candidate("c-25", "25", "Dushen", "boy", 22,
                "Dynamic Alankari collection contender with confident stage aura and poised runway presentation.",
                "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=800&q=80", 0, null, false));

        // 👔 BLAZER SEGMENT - RANJITH [M] (26 to 29)
        addCandidate(new Candidate("c-26", "26", "Dineth Sewmina", "boy", 23,
                "Passionate about the fashion industry and expressing contemporary style with commanding confidence.",
                "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=800&q=80", 0, null, false));
        addCandidate(new Candidate("c-27", "27", "Kaveesha Dahanaka", "boy", 22,
                "Dynamic runway presence showcasing elegance, poise, and high-fashion aura.",
                "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80", 0, null, false));
        addCandidate(new Candidate("c-28", "28", "Tashin Jayakodi", "boy", 21,
                "Clean contemporary aesthetics with energetic runway pace and bold modern silhouette.",
                "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80", 0, null, false));
        addCandidate(new Candidate("c-29", "29", "Chanuth Perera", "boy", 22,
                "Charismatic runway contender with sculpted posture and effortless stage presence.",
                "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80", 0, null, false));
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

