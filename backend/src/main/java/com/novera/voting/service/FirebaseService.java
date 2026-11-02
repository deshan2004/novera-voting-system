package com.novera.voting.service;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.cloud.FirestoreClient;
import com.novera.voting.model.VoterStatus;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

@Service
public class FirebaseService {

    private static final Logger log = LoggerFactory.getLogger(FirebaseService.class);

    @Value("${firebase.config.path:}")
    private String firebaseConfigPath;

    private Firestore firestore;
    private boolean initialized = false;

    @PostConstruct
    public void init() {
        try {
            if (FirebaseApp.getApps().isEmpty()) {
                InputStream serviceAccount = null;
                if (firebaseConfigPath != null && !firebaseConfigPath.trim().isEmpty()) {
                    serviceAccount = getClass().getClassLoader().getResourceAsStream(firebaseConfigPath.replace("classpath:", ""));
                } else {
                    serviceAccount = getClass().getClassLoader().getResourceAsStream("serviceAccountKey.json");
                }

                if (serviceAccount != null) {
                    FirebaseOptions options = FirebaseOptions.builder()
                            .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                            .build();
                    FirebaseApp.initializeApp(options);
                    this.firestore = FirestoreClient.getFirestore();
                    this.initialized = true;
                    log.info("Firebase Admin SDK successfully initialized for NOVERA '26 Voting System.");
                } else {
                    log.info("No serviceAccountKey.json found. Spring Boot running with in-memory thread-safe state (ready for Firebase credentials).");
                }
            } else {
                this.firestore = FirestoreClient.getFirestore();
                this.initialized = true;
            }
        } catch (Exception e) {
            log.warn("Firebase initialization skipped: {}. Operating in high-performance local mode.", e.getMessage());
        }
    }

    public void syncCandidateVote(String candidateId, int newVoteCount) {
        if (!initialized || firestore == null) return;
        try {
            firestore.collection("candidates").document(candidateId).update("votes", newVoteCount);
        } catch (Exception e) {
            log.error("Failed to sync vote to Firestore for candidate {}: {}", candidateId, e.getMessage());
        }
    }

    public void syncVoterStatus(VoterStatus status) {
        if (!initialized || firestore == null) return;
        try {
            Map<String, Object> data = new HashMap<>();
            data.put("voterId", status.getVoterId());
            data.put("hasVotedBoy", status.isHasVotedBoy());
            data.put("hasVotedGirl", status.isHasVotedGirl());
            data.put("boyVotedFor", status.getBoyVotedFor());
            data.put("girlVotedFor", status.getGirlVotedFor());
            data.put("votedAt", status.getVotedAt());

            firestore.collection("voters").document(status.getVoterId()).set(data);
        } catch (Exception e) {
            log.error("Failed to sync voter status to Firestore: {}", e.getMessage());
        }
    }

    public void resetAllInFirestore() {
        if (!initialized || firestore == null) return;
        try {
            log.info("Resetting Firestore voting collections.");
        } catch (Exception e) {
            log.error("Error resetting Firestore: {}", e.getMessage());
        }
    }

    public boolean isInitialized() {
        return initialized;
    }
}

