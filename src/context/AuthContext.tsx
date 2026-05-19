"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signOut, signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, collection, query, where, getDocs, deleteDoc, updateDoc } from "firebase/firestore";

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
  authError: string | null;
  setAuthError: (err: string | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  loginWithGoogle: async () => {},
  logout: async () => {},
  authError: null,
  setAuthError: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Enforce super admin self-healing credentials for key admin accounts
        const emailLower = firebaseUser.email?.toLowerCase().trim() || "";
        const isSuperAdmin = emailLower === "binuarjunanand@gmail.com" || 
                             emailLower === "admin@mintsgloabal.ae" || 
                             emailLower === "admin@mintsglobal.ae";
        
        let userDocRef = doc(db, "employees", firebaseUser.uid);
        let userDoc = await getDoc(userDocRef);
        
        let appUser: AppUser = firebaseUser;
        
        if (isSuperAdmin) {
          if (!userDoc.exists()) {
            await setDoc(userDocRef, {
              fullName: firebaseUser.displayName || (emailLower.startsWith("admin") ? "System Administrator" : "Binu Arjun Anand"),
              email: emailLower,
              role: "founder",
              department: "Executive Office",
              jobTitle: "Super Admin",
              phone: "",
              isIntern: false,
              isActive: true,
              dateJoined: new Date().toISOString(),
              createdAt: new Date().toISOString()
            });
            userDoc = await getDoc(userDocRef);
          } else {
            const data = userDoc.data();
            if (data?.role !== "founder" || data?.isActive !== true) {
              await setDoc(userDocRef, {
                ...data,
                role: "founder",
                isActive: true,
                fullName: data?.fullName || (emailLower.startsWith("admin") ? "System Administrator" : "Binu Arjun Anand"),
                updatedAt: new Date().toISOString()
              }, { merge: true });
              userDoc = await getDoc(userDocRef);
            }
          }
        }
        
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
          // Verify user is active
          if (data.isActive === false) {
            setAuthError("Access Denied: Your account has been deactivated.");
            await signOut(auth);
            setUser(null);
          } else {
            appUser = { ...firebaseUser, role: data.role, department: data.department };
            setUser(appUser);

            // Fetch public IP address and record login trace asynchronously
            (async () => {
              try {
                const ipResponse = await fetch("https://api.ipify.org?format=json");
                const ipData = await ipResponse.json();
                const userIp = ipData.ip || "Unknown";

                await updateDoc(userDocRef, {
                  lastLoginIP: userIp,
                  lastLoginAt: new Date().toISOString()
                });

                // Record audit trace
                const auditRef = doc(collection(db, "auditLog"));
                await setDoc(auditRef, {
                  actorId: firebaseUser.uid,
                  action: "LOGIN",
                  targetCollection: "employees",
                  targetId: firebaseUser.uid,
                  details: `User logged in from IP address: ${userIp}`,
                  createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
                });
              } catch (ipErr) {
                console.error("Error logging sign-in IP address:", ipErr);
              }
            })();
          }
        } else {
          // BLOCK SIGN IN: Do not auto-grant founder role!
          setAuthError("Access Denied: Your email is not registered in Mints Global ERP. Please contact an administrator.");
          await signOut(auth);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    // Removed host domain constraint so employees can sign in with any standard Gmail address!
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Login failed", error);
      throw error;
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, role: user?.role || null, loading, loginWithGoogle, logout, authError, setAuthError }}>
      {children}
    </AuthContext.Provider>
  );
};


export const useAuth = () => useContext(AuthContext);
