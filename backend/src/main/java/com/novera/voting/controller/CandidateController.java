package com.novera.voting.controller;

import com.novera.voting.model.Candidate;
import com.novera.voting.service.VotingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/candidates")
@CrossOrigin(origins = "*")
public class CandidateController {

    private final VotingService votingService;

    public CandidateController(VotingService votingService) {
        this.votingService = votingService;
    }

    @GetMapping
    public ResponseEntity<List<Candidate>> getCandidates(@RequestParam(required = false) String category) {
        if (category != null && !category.trim().isEmpty()) {
            return ResponseEntity.ok(votingService.getCandidatesByCategory(category));
        }
        return ResponseEntity.ok(votingService.getAllCandidates());
    }

    @PostMapping
    public ResponseEntity<Candidate> createCandidate(@RequestBody Candidate candidate) {
        votingService.addCandidate(candidate);
        return ResponseEntity.ok(candidate);
    }
}

