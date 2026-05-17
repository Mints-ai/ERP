import { 
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, 
  query, where, orderBy, limit, onSnapshot, serverTimestamp,
  DocumentReference, QueryConstraint
} from "firebase/firestore";
import { db } from "./firebase";

// Generic get document
export async function getDocument<T>(collectionName: string, docId: string): Promise<T | null> {
  const docRef = doc(db, collectionName, docId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as T;
}

// Generic get collection with filters
export async function getCollection<T>(
  collectionName: string, 
  constraints: QueryConstraint[] = []
): Promise<T[]> {
  const q = query(collection(db, collectionName), ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as T[];
}

// Real-time listener
export function subscribeToCollection<T>(
  collectionName: string,
  constraints: QueryConstraint[],
  callback: (data: T[]) => void
) {
  const q = query(collection(db, collectionName), ...constraints);
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as T[];
    callback(data);
  });
}

// Add document with auto-ID
export async function addDocument(collectionName: string, data: object) {
  return addDoc(collection(db, collectionName), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// Update document
export async function updateDocument(collectionName: string, docId: string, data: object) {
  const ref = doc(db, collectionName, docId);
  return updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
}

// Audit log helper
export async function writeAuditLog(actorId: string, action: string, targetCollection: string, targetId: string, metadata = {}) {
  await addDoc(collection(db, "auditLog"), {
    actorId, action, targetCollection, targetId, metadata,
    createdAt: serverTimestamp()
  });
}
