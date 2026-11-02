package com.novera.voting.model;

public class VoteSubmission {
    private String voterId;
    private String boyCandidateId;
    private String girlCandidateId;

    public VoteSubmission() {}

    public VoteSubmission(String voterId, String boyCandidateId, String girlCandidateId) {
        this.voterId = voterId;
        this.boyCandidateId = boyCandidateId;
        this.girlCandidateId = girlCandidateId;
    }

    public String getVoterId() { return voterId; }
    public void setVoterId(String voterId) { this.voterId = voterId; }

    public String getBoyCandidateId() { return boyCandidateId; }
    public void setBoyCandidateId(String boyCandidateId) { this.boyCandidateId = boyCandidateId; }

    public String getGirlCandidateId() { return girlCandidateId; }
    public void setGirlCandidateId(String girlCandidateId) { this.girlCandidateId = girlCandidateId; }
}

