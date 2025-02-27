'use client';

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/hooks/useAuth";
import { signInWithGoogle, signOut } from "@/lib/firebase/firebaseUtils";

export function SignInButton() {
  const { user } = useAuth();

  return user ? (
    <div className="flex items-center gap-4">
      <span className="text-sm">{user.email}</span>
      <Button variant="outline" onClick={() => signOut()}>
        Sign Out
      </Button>
    </div>
  ) : (
    <Button onClick={() => signInWithGoogle()}>
      Sign in with Google
    </Button>
  );
} 