# NOVERA ’26 — Runway Voting System
### AIESEC in CINEC &bull; Modeling &amp; Personality Development Workshop

An elegant, real-time voting platform built with **Next.js (TypeScript)**, **Spring Boot (Java 21)**, and **Firebase (Firestore)**. Designed specifically for fashion shows, runway competitions, and pageants.

---

## 🌟 Key Highlights & Requirements Met

1. **Stage QR Code Presentation Display (`/qr`)**:
   - High-contrast, scannable QR code formatted for stage projectors, TV monitors, or event kiosks.
   - Points attendees straight to the mobile voting ballot (`/vote`).
   - One-click Fullscreen Stage Mode, live URL copy, and network IP customization for local Wi-Fi phones.

2. **Strict Separate Boy & Girl Voting (`/vote`)**:
   - Attendees vote separately for **Best Male Model (Boy)** and **Best Female Model (Girl)**.
   - **Enforced Single-Vote Integrity**: Each attendee is strictly restricted to **one vote for one boy and one vote for one girl**.
   - Voter session fingerprinting stored in browser tokens + validated server-side by Spring Boot and synced to Firebase.
   - Once a vote is cast for a category, that category is permanently locked for that voter with a verified badge.

3. **Admin Leaderboard & Live Bar Charts (`/admin`)**:
   - Real-time interactive bar charts powered by **Recharts**, visually comparing vote counts and percentage shares for all male and female contenders.
   - Highlight cards for the leading **King of the Runway** and **Queen of the Runway**.
   - Live administrative controls:
     - Toggle voting state (Open / Paused).
     - Simulate demo votes to test animations.
     - Reset all votes for the official live event.

---

## 📁 Architecture Overview

```
voting system/
├── frontend/                     # Next.js 14 + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx          # Editorial Home / Portal
│   │   │   ├── qr/page.tsx       # Big Screen / Projector QR Code Display
│   │   │   ├── vote/page.tsx     # Voter Ballot (1 Boy + 1 Girl Enforcement)
│   │   │   ├── admin/page.tsx    # Live Leaderboard with Recharts Bar Charts
│   │   │   ├── layout.tsx        # Branded Navigation & Editorial Footer
│   │   │   └── globals.css       # NOVERA Editorial Fashion Theme Styles
│   │   └── lib/
│   │       ├── api.ts            # Voting logic & API client (Spring Boot + Firebase)
│   │       ├── firebase.ts       # Firebase SDK initialization
│   │       ├── types.ts          # TypeScript interfaces (Candidate, VoterStatus)
│   │       └── candidates-data.ts# Initial seed contenders
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── package.json
│
└── backend/                      # Spring Boot 3 + Java 21 REST API
    ├── pom.xml                   # Maven dependencies (Web, Validation, Firebase Admin)
    └── src/main/java/com/novera/voting/
        ├── VotingApplication.java
        ├── controller/
        │   ├── VoteController.java      # /api/votes/submit, /api/votes/leaderboard
        │   ├── CandidateController.java # /api/candidates
        │   └── AdminController.java     # /api/admin/reset
        ├── model/
        │   ├── Candidate.java
        │   ├── VoteSubmission.java
        │   ├── VoterStatus.java
        │   └── VoteResponse.java
        ├── service/
        │   ├── VotingService.java       # Atomic 1-boy & 1-girl validation logic
        │   └── FirebaseService.java     # Firebase Admin SDK & Firestore integration
        └── config/
            └── CorsConfig.java          # Full cross-origin access for Next.js
```

---

## 🚀 Getting Started

### 1. Running the Next.js Frontend

```bash
cd frontend
npm run dev
```

The frontend will run at:
- **Home Portal**: [http://localhost:3000](http://localhost:3000)
- **Stage QR Code Screen**: [http://localhost:3000/qr](http://localhost:3000/qr)
- **Mobile Voter Ballot**: [http://localhost:3000/vote](http://localhost:3000/vote)
- **Admin Leaderboard & Bar Chart**: [http://localhost:3000/admin](http://localhost:3000/admin)

> **Tip for Phone Testing**: When running on local Wi-Fi, open `http://<your-computer-ip>:3000/qr` and enter `http://<your-computer-ip>:3000` in the Network Origin box. Any phone on the same Wi-Fi can scan the QR code and vote immediately!

---

### 2. Running the Spring Boot Backend

Ensure Java 21 is installed:

```bash
cd backend
mvn spring-boot:run
```

The backend server starts on port `8080` with REST endpoints:
- `GET /api/candidates` — List all boy and girl candidates.
- `POST /api/votes/submit` — Submit a vote with 1-boy, 1-girl atomic verification.
- `GET /api/votes/status/{voterId}` — Check voter's current ballot status.
- `GET /api/votes/leaderboard` — Get real-time vote tallies.
- `POST /api/admin/reset` — Reset all votes to 0.

---

### 3. Connecting Firebase (Optional / Real-time Sync)

The application includes an **instant zero-config fallback** (works right out of the box with local storage and in-memory Spring Boot state).

To enable Firebase Firestore for multi-device live sync:
1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a project (e.g. `novera-voting`).
2. Enable **Firestore Database** in test/production mode.
3. In **Project Settings** > **General** > **Your apps**, create a Web App and copy the config into `frontend/.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=novera-voting.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=novera-voting
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=novera-voting.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=1:...
```

4. For Spring Boot, download your `serviceAccountKey.json` from **Project Settings** > **Service accounts** and place it in `backend/src/main/resources/serviceAccountKey.json`.

