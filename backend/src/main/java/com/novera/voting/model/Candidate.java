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
    private String designerName;
    private Boolean hasBestDesignEntry;

    public Candidate() {}

    public Candidate(String id, String candidateNumber, String name, String category, Integer age, String bio, String imageUrl, int votes) {
        this(id, candidateNumber, name, category, age, bio, imageUrl, votes, null, false);
    }

    public Candidate(String id, String candidateNumber, String name, String category, Integer age, String bio, String imageUrl, int votes, String designerName, Boolean hasBestDesignEntry) {
        this.id = id;
        this.candidateNumber = candidateNumber;
        this.name = name;
        this.category = category;
        this.age = age;
        this.bio = bio;
        this.imageUrl = imageUrl;
        this.votes = votes;
        this.designerName = designerName;
        this.hasBestDesignEntry = hasBestDesignEntry;
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

    public String getDesignerName() { return designerName; }
    public void setDesignerName(String designerName) { this.designerName = designerName; }

    public Boolean getHasBestDesignEntry() { return hasBestDesignEntry; }
    public void setHasBestDesignEntry(Boolean hasBestDesignEntry) { this.hasBestDesignEntry = hasBestDesignEntry; }

    public synchronized int incrementVotes() {
        this.votes++;
        return this.votes;
    }
}

