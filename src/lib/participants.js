import { db } from "./firebase";
import { 
  collection, 
  doc, 
  addDoc, 
  getDoc,
  getDocs,
  updateDoc, 
  onSnapshot, 
  serverTimestamp,
  query,
  increment,
  arrayUnion
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

export const createParticipant = async (name) => {
  try {
    // 1. Fetch all problems to get IDs
    const problemsQuery = query(collection(db, PROBLEMS_COLLECTION));
    const problemsSnapshot = await getDocs(problemsQuery);
    const problemIds = problemsSnapshot.docs.map(d => d.id);
    
    if (problemIds.length === 0) {
      throw new Error("No problems available to assign.");
    }

    // 2. Fetch all participants to build frequency map
    const participantsQuery = query(collection(db, PARTICIPANTS_COLLECTION));
    const participantsSnapshot = await getDocs(participantsQuery);
    
    const frequencyMap = {};
    problemIds.forEach(id => { frequencyMap[id] = 0; });
    
    participantsSnapshot.docs.forEach(d => {
      const pId = d.data().problemId;
      if (frequencyMap[pId] !== undefined) {
        frequencyMap[pId]++;
      }
    });

    // 3. Find minimum count
    let minCount = Infinity;
    Object.values(frequencyMap).forEach(count => {
      if (count < minCount) {
        minCount = count;
      }
    });

    // 4. Collect all problemIds with minimum count
    const minProblems = Object.keys(frequencyMap).filter(id => frequencyMap[id] === minCount);

    // 5. Pick randomly
    const assignedProblemId = minProblems[Math.floor(Math.random() * minProblems.length)];

    // 6. Create participant
    const docRef = await addDoc(collection(db, PARTICIPANTS_COLLECTION), {
      name: name.trim(),
      problemId: assignedProblemId,
      code: "",
      language: "javascript",
      lastSavedAt: null,
      joinedAt: serverTimestamp(),
      tabSwitchCount: 0,
      tabSwitchLog: []
    });

    return docRef.id;
  } catch (error) {
    console.error("Error creating participant:", error);
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

export const submitContestEarly = async (participantId) => {
  try {
    const docRef = doc(db, PARTICIPANTS_COLLECTION, participantId);
    await updateDoc(docRef, {
      submittedAt: serverTimestamp()
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
