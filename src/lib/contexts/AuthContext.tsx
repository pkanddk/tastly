"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, getRedirectResult } from "firebase/auth";
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

  useEffect(() => {
    console.log("Setting up auth state listener");
    
    // Check for redirect result
    const handleRedirectResult = async () => {
      try {
        console.log("Checking for redirect result");
        const result = await getRedirectResult(auth);
        if (result) {
          console.log("Redirect sign-in successful");
          // User will be set by onAuthStateChanged
        }
      } catch (error) {
        console.error("Error handling redirect result:", error);
      }
    };
    
    // Handle redirect result first
    handleRedirectResult();
    
    // Then set up auth state listener
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("Auth state changed:", user ? "User signed in" : "No user");
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => useContext(AuthContext);
