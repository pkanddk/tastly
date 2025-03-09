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
