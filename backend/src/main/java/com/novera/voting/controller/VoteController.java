package com.novera.voting.controller;

import com.novera.voting.model.Candidate;
import com.novera.voting.model.VoteResponse;
import com.novera.voting.model.VoteSubmission;
import com.novera.voting.model.VoterStatus;
import com.novera.voting.service.VotingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/votes")
@CrossOrigin(origins = "*")
public class VoteController {

    private final VotingService votingService;

    public VoteController(VotingService votingService) {
        this.votingService = votingService;
    }

    @PostMapping("/submit")
    public ResponseEntity<VoteResponse> submitVote(@RequestBody VoteSubmission submission) {
        VoteResponse response = votingService.processVote(submission);
        if (response.isSuccess()) {
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.badRequest().body(response);
        }
    }

    @GetMapping("/status/{voterId}")
    public ResponseEntity<VoterStatus> getStatus(@PathVariable String voterId) {
        return ResponseEntity.ok(votingService.getVoterStatus(voterId));
    }

    @GetMapping("/leaderboard")
    public ResponseEntity<Map<String, Object>> getLeaderboard() {
        List<Candidate> all = votingService.getAllCandidates();
        List<Candidate> boys = all.stream().filter(c -> "boy".equalsIgnoreCase(c.getCategory())).toList();
        List<Candidate> girls = all.stream().filter(c -> "girl".equalsIgnoreCase(c.getCategory())).toList();

        int totalBoyVotes = boys.stream().mapToInt(Candidate::getVotes).sum();
        int totalGirlVotes = girls.stream().mapToInt(Candidate::getVotes).sum();

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalVotes", totalBoyVotes + totalGirlVotes);
        stats.put("boyVotes", totalBoyVotes);
        stats.put("girlVotes", totalGirlVotes);
        stats.put("boys", boys);
        stats.put("girls", girls);

        return ResponseEntity.ok(stats);
    }
}

