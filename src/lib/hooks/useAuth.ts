"use client";

import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { signInWithGoogle as firebaseSignInWithGoogle, signOut as firebaseSignOut } from "../firebase/firebaseUtils";

export function useAuth() {
  const { user, loading: authLoading } = useContext(AuthContext);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  
  // Only return the user if mounted to avoid hydration issues
  // But keep loading true if auth is still loading, even if mounted
  return {
    user: mounted ? user : null,
    loading: !mounted || authLoading,
    signInWithGoogle: firebaseSignInWithGoogle,
    signOut: firebaseSignOut
  };
}