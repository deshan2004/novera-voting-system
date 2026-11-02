package com.novera.voting.controller;

import com.novera.voting.service.VotingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
public class AdminController {

    private final VotingService votingService;

    public AdminController(VotingService votingService) {
        this.votingService = votingService;
    }

    @PostMapping("/reset")
    public ResponseEntity<Map<String, Object>> resetVotes() {
        votingService.resetAllVotes();
        return ResponseEntity.ok(Map.of("success", true, "message", "All voting tallies and sessions have been reset."));
    }
}

