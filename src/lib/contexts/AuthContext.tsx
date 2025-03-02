"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { User } from "firebase/auth";
import { auth } from "../firebase/firebase";

export const AuthContext = createContext<{
  user: User | null;
  loading: boolean;
}>({
  user: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  useEffect(() => {
    console.log("Setting up auth state listener");
    
    // Check if we have a user in auth
    const checkCurrentUser = async () => {
      try {
        console.log("Checking current user");
        const currentUser = auth.currentUser;
        console.log("Current user from auth:", currentUser ? currentUser.email : "No user");
        
        if (currentUser) {
          setUser(currentUser);
        }
      } catch (error) {
        console.error("Error checking current user:", error);
      } finally {
        setInitialCheckDone(true);
      }
    };
    
    checkCurrentUser();
    
    // Set up the auth state listener
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("Auth state changed:", user ? `User signed in: ${user.email}` : "No user");
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Set loading to false once initial check is done
  useEffect(() => {
    if (initialCheckDone) {
      setLoading(false);
    }
  }, [initialCheckDone]);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => useContext(AuthContext);
