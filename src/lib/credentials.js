import { db } from "./firebase";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  getDocs,
  query,
  onSnapshot
} from "firebase/firestore";

const CREDENTIALS_COLLECTION = "credentials";

export const generateRandomString = (length = 6) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Generate multiple credentials at once
export const generateCredentials = async (count = 10) => {
  try {
    const promises = [];
    for (let i = 0; i < count; i++) {
      const id = generateRandomString(6);
      const password = generateRandomString(6);
      
      const docRef = doc(db, CREDENTIALS_COLLECTION, id);
      promises.push(setDoc(docRef, {
        id,
        password,
        createdAt: Date.now()
      }));
    }
    await Promise.all(promises);
  } catch (error) {
    console.error("Error generating credentials:", error);
    throw error;
  }
};

export const deleteCredential = async (id) => {
  try {
    await deleteDoc(doc(db, CREDENTIALS_COLLECTION, id));
  } catch (error) {
    console.error("Error deleting credential:", error);
    throw error;
  }
};

export const clearAllCredentials = async () => {
  try {
    const q = query(collection(db, CREDENTIALS_COLLECTION));
    const querySnapshot = await getDocs(q);
    const promises = [];
    querySnapshot.forEach((document) => {
      promises.push(deleteDoc(doc(db, CREDENTIALS_COLLECTION, document.id)));
    });
    await Promise.all(promises);
  } catch (error) {
    console.error("Error clearing credentials:", error);
    throw error;
  }
};

export const validateCredential = async (id, password) => {
  try {
    const docRef = doc(db, CREDENTIALS_COLLECTION, id);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      const data = snapshot.data();
      if (data.password === password) {
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error("Error validating credential:", error);
    throw error;
  }
};

export const listenToCredentials = (callback) => {
  const q = query(collection(db, CREDENTIALS_COLLECTION));
  return onSnapshot(
    q,
    (snapshot) => {
      const creds = snapshot.docs.map((d) => d.data());
      // Sort by creation time desc
      creds.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      callback(creds);
    },
    (error) => {
      console.error("Error listening to credentials:", error);
      callback([]);
    }
  );
};
