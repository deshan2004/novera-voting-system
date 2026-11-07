package com.novera.voting.model;

public class Candidate {
    private String id;
    private String candidateNumber;
    private String name;
    private String category; // "boy" or "girl"
    private Integer age;
    private String bio;
    private String imageUrl;
    private int votes;

    public Candidate() {}

    public Candidate(String id, String candidateNumber, String name, String category, Integer age, String bio, String imageUrl, int votes) {
        this.id = id;
        this.candidateNumber = candidateNumber;
        this.name = name;
        this.category = category;
        this.age = age;
        this.bio = bio;
        this.imageUrl = imageUrl;
        this.votes = votes;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getCandidateNumber() { return candidateNumber; }
    public void setCandidateNumber(String candidateNumber) { this.candidateNumber = candidateNumber; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public Integer getAge() { return age; }
    public void setAge(Integer age) { this.age = age; }

    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public int getVotes() { return votes; }
    public void setVotes(int votes) { this.votes = votes; }

    public synchronized int incrementVotes() {
        this.votes++;
        return this.votes;
    }
}

