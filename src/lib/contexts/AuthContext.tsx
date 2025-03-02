"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { User } from "firebase/auth";
import { auth } from "../firebase/firebase";
import { checkRedirectResult, handleAuthRedirect } from "../firebase/firebaseUtils";

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
    
    // First, check if we're returning from a redirect
    const handleInitialAuth = async () => {
      setLoading(true);
      
      try {
        // This will check if we're returning from a redirect and process it
        await checkRedirectResult();
        
        // Handle redirect back to original page if needed
        handleAuthRedirect();
      } catch (error) {
        console.error("Error during initial auth check:", error);
      } finally {
        setInitialCheckDone(true);
      }
    };
    
    handleInitialAuth();
    
    // Then set up the auth state listener
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("Auth state changed:", user ? "User signed in" : "No user");
      setUser(user);
      
      if (initialCheckDone) {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, [initialCheckDone]);

  // Set loading to false once both initial check is done and auth state is determined
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
