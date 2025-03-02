"use client";

import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { signInWithGoogle as firebaseSignInWithGoogle, signOut as firebaseSignOut } from "../firebase/firebaseUtils";

export function useAuth() {
  const { user, loading } = useContext(AuthContext);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  return {
    user: mounted ? user : null,
    loading: !mounted || loading,
    signInWithGoogle: firebaseSignInWithGoogle,
    signOut: firebaseSignOut
  };
}