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
        status: "idle",
        startedAt: null,
        endedAt: null,
        totalProblems: 0,
      });
    }
  } catch (error) {
    console.error("Error ensuring contest config:", error);
    // Don't throw — this is a startup check, not a user action
  }
};

/**
 * Starts the contest by setting status to "active" and recording the start time.
 */
export const startContest = async (durationMinutes = 60) => {
  try {
    const docRef = doc(db, CONTEST_COLLECTION, CONTEST_DOC);
    const now = Date.now();
    const endsAt = now + durationMinutes * 60 * 1000;
    
    await updateDoc(docRef, {
      status: "active",
      startedAt: serverTimestamp(),
      endsAt: endsAt,
      durationMinutes: durationMinutes
    });
  } catch (error) {
    console.error("Error starting contest:", error);
    throw error;
  }
};

/**
 * Ends the contest by setting status to "ended" and recording the end time.
 */
export const endContest = async () => {
  try {
    const docRef = doc(db, CONTEST_COLLECTION, CONTEST_DOC);
    await updateDoc(docRef, {
      status: "ended",
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
      status: "idle",
      startedAt: null,
      endedAt: null,
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
        callback({ status: "idle", startedAt: null, endedAt: null, totalProblems: 0 });
      }
    },
    (error) => {
      console.error("Error listening to contest config:", error);
      callback({ status: "idle", startedAt: null, endedAt: null, totalProblems: 0 });
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
