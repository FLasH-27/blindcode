import { db } from "./firebase";
import { 
  collection, 
  doc, 
  addDoc, 
  setDoc,
  getDoc,
  getDocs,
  updateDoc, 
  onSnapshot, 
  serverTimestamp,
  increment,
  arrayUnion,
  deleteDoc
} from "firebase/firestore";

const PARTICIPANTS_COLLECTION = "participants";
const PROBLEMS_COLLECTION = "problems";
const CONTEST_DOC = "config";

export const getParticipant = async (participantId) => {
  try {
    const docRef = doc(db, PARTICIPANTS_COLLECTION, participantId);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() };
    }
    return null;
  } catch (error) {
    console.error("Error getting participant:", error);
    throw error;
  }
};

export const createOrResumeParticipant = async (rollId, name) => {
  try {
    // 0. Get active session ID from contest config
    const configSnap = await getDoc(doc(db, "contest", CONTEST_DOC));
    const sessionId = configSnap.exists() ? (configSnap.data().sessionId || "default") : "default";

    // Create a deterministic participant ID for this session & rollId
    const participantDocId = `${sessionId}_${rollId}`;
    
    // Check if resuming an existing participant
    const docRef = doc(db, PARTICIPANTS_COLLECTION, participantDocId);
    const existingSnap = await getDoc(docRef);
    if (existingSnap.exists()) {
      await updateDoc(docRef, { name: name.trim() });
      return participantDocId;
    }

    // Create new participant — problemId is null until admin starts contest
    await setDoc(docRef, {
      name: name.trim(),
      rollId,
      problemId: null,
      code: "",
      language: "python",
      lastSavedAt: null,
      joinedAt: serverTimestamp(),
      tabSwitchCount: 0,
      tabSwitchLog: [],
      sessionId: sessionId
    });

    return participantDocId;
  } catch (error) {
    console.error("Error creating participant:", error);
    throw error;
  }
};

/**
 * Called when admin starts the contest.
 * Distributes all available problems evenly across lobby participants
 * using round-robin (fair distribution by index).
 */
export const assignProblemsToParticipants = async (sessionId) => {
  try {
    // 1. Get the active round from contest config
    const configSnap = await getDoc(doc(db, "contest", CONTEST_DOC));
    const activeRound = configSnap.exists() ? (configSnap.data().round || 1) : 1;

    // 2. Fetch all participants in this session
    const participantsSnap = await getDocs(collection(db, PARTICIPANTS_COLLECTION));
    const sessionParticipants = participantsSnap.docs
      .filter(d => d.data().sessionId === sessionId)
      .map(d => ({ id: d.id, ...d.data() }));

    if (sessionParticipants.length === 0) return;

    // 3. Fetch problems filtered by the active round
    const problemsSnap = await getDocs(collection(db, PROBLEMS_COLLECTION));
    const problemIds = problemsSnap.docs
      .filter(d => (d.data().round || 1) === activeRound)
      .map(d => d.id);

    if (problemIds.length === 0) {
      console.warn(`No problems found for Round ${activeRound}. Skipping assignment.`);
      return;
    }

    // 4. Round-robin assignment: participant[i] gets problem[i % total_problems]
    const updates = sessionParticipants.map((participant, index) => {
      const assignedProblemId = problemIds[index % problemIds.length];
      return updateDoc(doc(db, PARTICIPANTS_COLLECTION, participant.id), {
        problemId: assignedProblemId
      });
    });

    await Promise.all(updates);
    console.log(`Assigned Round ${activeRound} problems to ${sessionParticipants.length} participants (${problemIds.length} unique problems).`);
  } catch (error) {
    console.error("Error assigning problems to participants:", error);
    throw error;
  }
};

export const updateCode = async (participantId, code) => {
  try {
    const docRef = doc(db, PARTICIPANTS_COLLECTION, participantId);
    await updateDoc(docRef, {
      code,
      lastSavedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating code:", error);
    throw error;
  }
};

export const updateLanguage = async (participantId, language) => {
  try {
    const docRef = doc(db, PARTICIPANTS_COLLECTION, participantId);
    await updateDoc(docRef, { language });
  } catch (error) {
    console.error("Error updating language:", error);
    throw error;
  }
};

export const deleteParticipant = async (participantId) => {
  try {
    const docRef = doc(db, PARTICIPANTS_COLLECTION, participantId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting participant:", error);
    throw error;
  }
};

export const saveEvaluation = async (participantId, evaluationData) => {
  try {
    const docRef = doc(db, PARTICIPANTS_COLLECTION, participantId);
    await updateDoc(docRef, {
      evaluation: evaluationData
    });
  } catch (error) {
    console.error("Error saving evaluation:", error);
    throw error;
  }
};

/**
 * Admin manually approves a participant's score to appear on the leaderboard.
 * Toggles leaderboardVisible between true/false.
 * If `sessionId` is provided and the participant has no sessionId set, it also
 * stamps the correct session so old/legacy participants appear in the right bucket.
 */
export const addToLeaderboard = async (participantId, visible = true, sessionId = null) => {
  try {
    const docRef = doc(db, PARTICIPANTS_COLLECTION, participantId);
    const update = { leaderboardVisible: visible };
    // Stamp sessionId only if provided — fixes legacy participants with null sessionId
    if (sessionId) update.sessionId = sessionId;
    await updateDoc(docRef, update);
  } catch (error) {
    console.error("Error updating leaderboard visibility:", error);
    throw error;
  }
};

export const submitContestEarly = async (participantId) => {
  try {
    const docRef = doc(db, PARTICIPANTS_COLLECTION, participantId);
    await updateDoc(docRef, {
      submittedAt: serverTimestamp()
    });

    // Trigger auto-evaluation in the background (fire-and-forget)
    // The leaderboard will update automatically once the evaluation is saved
    fetch("/api/auto-evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId }),
    }).catch((err) => {
      console.error("Auto-evaluation request failed:", err);
    });
  } catch (error) {
    console.error("Error submitting contest early:", error);
    throw error;
  }
};

export const logTabSwitch = async (participantId) => {
  try {
    const docRef = doc(db, PARTICIPANTS_COLLECTION, participantId);
    await updateDoc(docRef, {
      tabSwitchCount: increment(1),
      tabSwitchLog: arrayUnion(Date.now())
    });
  } catch (error) {
    console.error("Error logging tab switch:", error);
  }
};

export const listenToContest = (callback) => {
  const docRef = doc(db, "contest", CONTEST_DOC);
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data());
    } else {
      callback({ status: "idle" }); // Default
    }
  });
};

export const getParticipantByName = async (name) => {
  try {
    const querySnapshot = await getDocs(collection(db, PARTICIPANTS_COLLECTION));
    const lowerName = name.trim().toLowerCase();
    const existingDoc = querySnapshot.docs.find(d => d.data().name?.trim().toLowerCase() === lowerName);
    if (existingDoc) {
      return { id: existingDoc.id, ...existingDoc.data() };
    }
    return null;
  } catch (error) {
    console.error("Error getting participant by name:", error);
    throw error;
  }
};

export const getProblem = async (problemId) => {
    try {
      const docRef = doc(db, PROBLEMS_COLLECTION, problemId);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return { id: snapshot.id, ...snapshot.data() };
      }
      return null;
    } catch (error) {
      console.error("Error getting problem:", error);
      throw error;
    }
};
