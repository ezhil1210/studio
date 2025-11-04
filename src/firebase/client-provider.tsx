'use client';

import React, { useMemo, type ReactNode, useEffect } from 'react';
import { FirebaseProvider, useAuth } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { signInAnonymously } from 'firebase/auth';
import { useUser } from '.';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

// A new component to handle the automatic anonymous sign-in logic.
function AutoAnonymousSignIn({ children }: { children: ReactNode }) {
  const auth = useAuth(); // Gets the auth instance from the parent provider.
  const { user, isUserLoading } = useUser(); // Gets the current user state.

  useEffect(() => {
    // If auth is ready, not loading, and there's no user, sign in anonymously.
    if (auth && !isUserLoading && !user) {
      signInAnonymously(auth).catch(error => {
        console.error("Anonymous sign-in failed:", error);
      });
    }
  }, [auth, user, isUserLoading]); // Reruns when auth state might have changed.

  return <>{children}</>;
}


export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const firebaseServices = useMemo(() => {
    // Initialize Firebase on the client side, once per component mount.
    return initializeFirebase();
  }, []); // Empty dependency array ensures this runs only once on mount

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      <AutoAnonymousSignIn>
        {children}
      </AutoAnonymousSignIn>
    </FirebaseProvider>
  );
}
