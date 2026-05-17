"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signOut, signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

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
        const userDocRef = doc(db, "employees", firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        let appUser: AppUser = firebaseUser;
        if (userDoc.exists()) {
          const data = userDoc.data();
          appUser = { ...firebaseUser, role: data.role, department: data.department };
        } else {
          // Auto-create user doc if it doesn't exist (defaulting to founder)
          const newUserData = {
            email: firebaseUser.email,
            full_name: firebaseUser.displayName,
            role: "founder", // Temporary: Default to founder for testing
            created_at: new Date().toISOString(),
          };
          await setDoc(userDocRef, newUserData);
          appUser = { ...firebaseUser, role: "employee" };
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
