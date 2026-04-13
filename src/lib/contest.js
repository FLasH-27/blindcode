import { db } from "./firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";

const CONTEST_COLLECTION = "contest";
const CONTEST_DOC = "config";
const PARTICIPANTS_COLLECTION = "participants";

/**
 * Ensures the /contest/config document exists in Firestore.
 * If not, creates it with default values.
 * Should be called on app startup.
 */
export const ensureContestConfig = async () => {
  try {
    const docRef = doc(db, CONTEST_COLLECTION, CONTEST_DOC);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) {
      await setDoc(docRef, {
        phase: "idle",
        startedAt: null,
        endedAt: null,
        totalProblems: 0,
        sessionId: "default",
      });
    }
  } catch (error) {
    console.error("Error ensuring contest config:", error);
    // Don't throw — this is a startup check, not a user action
  }
};

/**
 * Opens the joining window logic
 */
export const openJoiningWindow = async (durationMinutes = 10) => {
  try {
    const docRef = doc(db, CONTEST_COLLECTION, CONTEST_DOC);
    const now = Date.now();
    const endsAt = now + durationMinutes * 60 * 1000;
    const sessionId = now.toString(); // Lock in sessionId at joining time
    
    await updateDoc(docRef, {
      phase: "joining",
      joiningStartedAt: serverTimestamp(),
      joiningEndsAt: endsAt,
      joiningWindowMinutes: durationMinutes,
      sessionId: sessionId // Set here so lobby participants belong to this session
    });
  } catch (error) {
    console.error("Error opening joining window:", error);
    throw error;
  }
};

/**
 * Extend the joining window
 */
export const extendJoiningWindow = async (additionalMinutes = 5) => {
  try {
    const docRef = doc(db, CONTEST_COLLECTION, CONTEST_DOC);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.joiningEndsAt) {
            const newEndsAt = data.joiningEndsAt + (additionalMinutes * 60 * 1000);
            await updateDoc(docRef, {
                joiningEndsAt: newEndsAt
            });
        }
    }
  } catch (error) {
    console.error("Error extending joining window:", error);
    throw error;
  }
};

/**
 * Starts the contest by setting phase to "active" and recording the start time.
 */
export const startContest = async (durationMinutes = 60) => {
  try {
    const docRef = doc(db, CONTEST_COLLECTION, CONTEST_DOC);
    const now = Date.now();
    const endsAt = now + durationMinutes * 60 * 1000;

    // Reuse the sessionId set when the joining window was opened
    const configSnap = await getDoc(docRef);
    const sessionId = (configSnap.exists() && configSnap.data().sessionId)
      ? configSnap.data().sessionId
      : now.toString();
    
    await updateDoc(docRef, {
      phase: "active",
      startedAt: serverTimestamp(),
      endsAt: endsAt,
      durationMinutes: durationMinutes,
      sessionId: sessionId
    });

    // Distribute problems evenly across all lobby participants
    const { assignProblemsToParticipants } = await import("./participants");
    await assignProblemsToParticipants(sessionId);
  } catch (error) {
    console.error("Error starting contest:", error);
    throw error;
  }
};

/**
 * Ends the contest by setting phase to "ended" and recording the end time.
 */
export const endContest = async () => {
  try {
    const docRef = doc(db, CONTEST_COLLECTION, CONTEST_DOC);
    await updateDoc(docRef, {
      phase: "ended",
      endedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error ending contest:", error);
    throw error;
  }
};

/**
 * Resets the contest to idle state. Does NOT delete participant data.
 */
export const resetContest = async () => {
  try {
    const docRef = doc(db, CONTEST_COLLECTION, CONTEST_DOC);
    await updateDoc(docRef, {
      phase: "idle",
      startedAt: null,
      endedAt: null,
      joiningStartedAt: null,
      joiningEndsAt: null,
      joiningWindowMinutes: null
    });
  } catch (error) {
    console.error("Error resetting contest:", error);
    throw error;
  }
};

/**
 * Real-time listener on the /contest/config document.
 * @param {Function} callback - receives the config data object
 * @returns {Function} unsubscribe function
 */
export const listenToContestConfig = (callback) => {
  const docRef = doc(db, CONTEST_COLLECTION, CONTEST_DOC);
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data());
      } else {
        callback({ phase: "idle", startedAt: null, endedAt: null, totalProblems: 0, sessionId: "default" });
      }
    },
    (error) => {
      console.error("Error listening to contest config:", error);
      callback({ phase: "idle", startedAt: null, endedAt: null, totalProblems: 0, sessionId: "default" });
    }
  );
};

/**
 * Real-time listener on the /participants collection.
 * Returns all participants sorted by joinedAt ascending.
 * @param {Function} callback - receives array of participant objects
 * @returns {Function} unsubscribe function
 */
export const listenToParticipants = (callback) => {
  const q = query(
    collection(db, PARTICIPANTS_COLLECTION),
    orderBy("joinedAt", "asc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const participants = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      callback(participants);
    },
    (error) => {
      console.error("Error listening to participants:", error);
      callback([]);
    }
  );
};
