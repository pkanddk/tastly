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
    // Only log in development environment
    if (process.env.NODE_ENV === 'development') {
      console.log('Setting up auth state listener');
    }
    
    setLoading(true);
    
    // Only log in development environment
    if (process.env.NODE_ENV === 'development') {
      console.log('Checking current user');
      console.log('Current user from auth:', auth.currentUser ? 'User exists' : 'No user');
    }
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // Only log in development environment
      if (process.env.NODE_ENV === 'development') {
        console.log('Auth state changed:', user ? 'User exists' : 'No user');
      }
      
      setUser(user);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  // Handle redirect result
  useEffect(() => {
    async function checkRedirectResult() {
      if (localStorage.getItem('auth_pending')) {
        try {
          console.log("Checking redirect result");
          const result = await getRedirectResult(auth);
          if (result) {
            console.log("Redirect sign-in successful", result.user.uid);
            localStorage.removeItem('auth_pending');
          }
        } catch (error) {
          console.error("Error getting redirect result:", error);
          localStorage.removeItem('auth_pending');
        } finally {
          // Ensure loading is set to false after handling redirect result
          setLoading(false);
        }
      }
    }
    
    checkRedirectResult();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => useContext(AuthContext);
