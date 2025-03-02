"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, getRedirectResult } from "firebase/auth";
import { User } from "firebase/auth";
import { auth } from "../firebase/firebase";

export const AuthContext = createContext<{
  user: User | null;
  loading: boolean;
  authError: Error | null;
}>({
  user: null,
  loading: true,
  authError: null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<Error | null>(null);
  const [redirectHandled, setRedirectHandled] = useState(false);

  useEffect(() => {
    // Handle redirect result when the app loads
    const handleRedirectResult = async () => {
      try {
        console.log("Checking for redirect result...");
        setLoading(true);
        const result = await getRedirectResult(auth);
        
        if (result) {
          console.log("Redirect sign-in successful");
          // User is signed in
          // No need to setUser here as onAuthStateChanged will handle it
        }
        
        setRedirectHandled(true);
      } catch (error) {
        console.error("Error handling redirect result:", error);
        setAuthError(error);
      } finally {
        setLoading(false);
      }
    };
    
    // Handle redirect result first
    handleRedirectResult();
    
    // Then set up the auth state listener
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("Auth state changed:", user ? "User signed in" : "No user");
      setUser(user);
      if (redirectHandled) {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, [redirectHandled]);

  return (
    <AuthContext.Provider value={{ user, loading, authError }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => useContext(AuthContext);
