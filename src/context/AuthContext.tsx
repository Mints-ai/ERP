"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signOut, signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, collection, query, where, getDocs, deleteDoc } from "firebase/firestore";

interface AppUser extends User {
  role?: string;
  department?: string;
}

interface AuthContextType {
  user: AppUser | null;
  role: string | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  loginWithGoogle: async () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch additional user data from Firestore
        let userDocRef = doc(db, "employees", firebaseUser.uid);
        let userDoc = await getDoc(userDocRef);
        
        let appUser: AppUser = firebaseUser;
        
        if (!userDoc.exists() && firebaseUser.email) {
          // If not found by UID, search for manually onboarded profile by email!
          const q = query(collection(db, "employees"), where("email", "==", firebaseUser.email));
          const querySnap = await getDocs(q);
          
          if (!querySnap.empty) {
            const oldDoc = querySnap.docs[0];
            const data = oldDoc.data();
            
            // Re-key the manual profile under the user's authentic Auth UID!
            await setDoc(userDocRef, {
              ...data,
              fullName: data.fullName || firebaseUser.displayName || "Mints Team Member",
              updatedAt: new Date().toISOString()
            });
            
            // Delete the old random-ID document to avoid duplication
            if (oldDoc.id !== firebaseUser.uid) {
              await deleteDoc(doc(db, "employees", oldDoc.id));
            }
            
            // Reload the linked document
            userDoc = await getDoc(userDocRef);
          }
        }

        if (userDoc.exists()) {
          const data = userDoc.data();
          appUser = { ...firebaseUser, role: data.role, department: data.department };
        } else {
          // Auto-create user doc if it doesn't exist (defaulting to founder)
          const { generateEmployeeId } = await import("@/lib/employeeUtils");
          const generatedId = await generateEmployeeId();
          const newUserData = {
            email: firebaseUser.email,
            fullName: firebaseUser.displayName || "Mints Team Member",
            role: "founder", // Temporary: Default to founder for testing
            department: "Executive Office",
            jobTitle: "Founder & CEO",
            employeeId: generatedId,
            isActive: true,
            dateJoined: new Date(),
            createdAt: new Date().toISOString(),
          };
          await setDoc(userDocRef, newUserData);
          appUser = { ...firebaseUser, role: "founder", department: "Executive Office" };
        }
        setUser(appUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    // TEMPORARY: Removed domain restriction for testing
    // provider.setCustomParameters({ hd: "mintsglobal.ae" }); 
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
      throw error;
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, role: user?.role || null, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
