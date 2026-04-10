import { db } from "./firebase";
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  serverTimestamp,
  query,
  orderBy
} from "firebase/firestore";

const COLLECTION_NAME = "problems";

export const subscribeToProblems = (callback) => {
  const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const problems = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(problems);
  });
};

export const addProblem = async (problemData) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...problemData,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding problem:", error);
    throw error;
  }
};

export const updateProblem = async (id, problemData) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, { ...problemData });
  } catch (error) {
    console.error("Error updating problem:", error);
    throw error;
  }
};

export const deleteProblem = async (id) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting problem:", error);
    throw error;
  }
};
