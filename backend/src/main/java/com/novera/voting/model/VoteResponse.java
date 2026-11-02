package com.novera.voting.model;

public class VoteResponse {
    private boolean success;
    private String message;
    private VoterStatus voterStatus;

    public VoteResponse() {}

    public VoteResponse(boolean success, String message, VoterStatus voterStatus) {
        this.success = success;
        this.message = message;
        this.voterStatus = voterStatus;
    }

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public VoterStatus getVoterStatus() { return voterStatus; }
    public void setVoterStatus(VoterStatus voterStatus) { this.voterStatus = voterStatus; }
}

