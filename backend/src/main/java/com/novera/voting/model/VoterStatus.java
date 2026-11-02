package com.novera.voting.model;

public class VoterStatus {
    private String voterId;
    private boolean hasVotedBoy;
    private boolean hasVotedGirl;
    private String boyVotedFor;
    private String girlVotedFor;
    private long votedAt;

    public VoterStatus() {}

    public VoterStatus(String voterId) {
        this.voterId = voterId;
        this.hasVotedBoy = false;
        this.hasVotedGirl = false;
    }

    public String getVoterId() { return voterId; }
    public void setVoterId(String voterId) { this.voterId = voterId; }

    public boolean isHasVotedBoy() { return hasVotedBoy; }
    public void setHasVotedBoy(boolean hasVotedBoy) { this.hasVotedBoy = hasVotedBoy; }

    public boolean isHasVotedGirl() { return hasVotedGirl; }
    public void setHasVotedGirl(boolean hasVotedGirl) { this.hasVotedGirl = hasVotedGirl; }

    public String getBoyVotedFor() { return boyVotedFor; }
    public void setBoyVotedFor(String boyVotedFor) { this.boyVotedFor = boyVotedFor; }

    public String getGirlVotedFor() { return girlVotedFor; }
    public void setGirlVotedFor(String girlVotedFor) { this.girlVotedFor = girlVotedFor; }

    public long getVotedAt() { return votedAt; }
    public void setVotedAt(long votedAt) { this.votedAt = votedAt; }
}

