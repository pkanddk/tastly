import { auth, db, storage } from "./firebase";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  signInWithRedirect,
  getRedirectResult,
  browserSessionPersistence,
  setPersistence,
  inMemoryPersistence,
  browserLocalPersistence,
  onAuthStateChanged
} from "firebase/auth";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Add this near the top of the file
export const DEFAULT_RECIPE_IMAGE = "/images/banner.jpg";

// Auth functions
export const signOut = async () => {
  try {
    // Clear any stored auth state
    localStorage.removeItem('auth_pending');
    await firebaseSignOut(auth);
    return true;
  } catch (error) {
    console.error('Error signing out:', error);
    return false;
  }
};

export const signInWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    
    // Add these parameters to improve compatibility
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    
    console.log("Starting Google sign-in process");
    
    // Check if we're on a mobile device
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
      console.log("Using mobile sign-in approach");
      
      // Set persistence to LOCAL to survive page reloads
      await setPersistence(auth, browserLocalPersistence);
      
      // Store a flag to detect if we're in the middle of auth
      localStorage.setItem('auth_pending', 'true');
      localStorage.setItem('auth_timestamp', Date.now().toString());
      
      // Store the current URL so we can return to it after auth
      localStorage.setItem('auth_return_url', window.location.pathname);
      
      // Use redirect method
      await signInWithRedirect(auth, provider);
      // Code after this won't execute on mobile due to redirect
      return true;
    } else {
      // For desktop, use popup
      console.log("Using popup for desktop sign-in");
      const result = await signInWithPopup(auth, provider);
      console.log("Sign-in successful");
      return true;
    }
  } catch (error) {
    console.error('Error signing in with Google:', error);
    
    // Log specific error codes to help with debugging
    if (error.code) {
      console.error('Error code:', error.code);
    }
    
    return false;
  }
};

// Check if we're returning from a redirect
export const checkRedirectResult = async () => {
  if (typeof window === 'undefined') return false;
  
  const pendingAuth = localStorage.getItem('auth_pending');
  const timestamp = localStorage.getItem('auth_timestamp');
  
  // Only process if we have a pending auth that's not too old (5 minutes max)
  if (pendingAuth === 'true' && timestamp) {
    const authTime = parseInt(timestamp, 10);
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    
    if (now - authTime < fiveMinutes) {
      console.log("Detected return from auth redirect, checking result");
      try {
        const result = await getRedirectResult(auth);
        
        // Clear the pending flag regardless of result
        localStorage.removeItem('auth_pending');
        localStorage.removeItem('auth_timestamp');
        
        if (result && result.user) {
          console.log("Redirect sign-in successful");
          return true;
        }
      } catch (error) {
        console.error("Error handling redirect result:", error);
        localStorage.removeItem('auth_pending');
        localStorage.removeItem('auth_timestamp');
      }
    } else {
      // Auth is too old, clear it
      console.log("Clearing stale auth attempt");
      localStorage.removeItem('auth_pending');
      localStorage.removeItem('auth_timestamp');
    }
  }
  
  return false;
};

// Helper to handle redirect after auth
export const handleAuthRedirect = () => {
  if (typeof window === 'undefined') return;
  
  const returnUrl = localStorage.getItem('auth_return_url');
  if (returnUrl) {
    localStorage.removeItem('auth_return_url');
    
    // Only redirect if we're not already on that page
    if (window.location.pathname !== returnUrl) {
      window.location.href = returnUrl;
    }
  }
};

// Firestore functions
export const addDocument = (collectionName: string, data: any) =>
  addDoc(collection(db, collectionName), data);

export const getDocuments = async (collectionName: string) => {
  const querySnapshot = await getDocs(collection(db, collectionName));
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

export const updateDocument = (collectionName: string, id: string, data: any) =>
  updateDoc(doc(db, collectionName, id), data);

export const deleteDocument = (collectionName: string, id: string) =>
  deleteDoc(doc(db, collectionName, id));

// Storage functions
export const uploadFile = async (file: File, path: string) => {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
};

// Recipes collection functions
export const saveRecipe = async (userId: string, recipe: any) => {
  try {
    // Check if the recipe already exists for this user
    const existingRecipes = await getRecipesByUser(userId);
    const existingRecipe = existingRecipes.find(r => 
      r.title === recipe.title || 
      (r.url && r.url === recipe.url)
    );
    
    if (existingRecipe) {
      // Update the existing recipe
      return updateDocument('recipes', existingRecipe.id, {
        ...recipe,
        userId,
        updatedAt: new Date().toISOString()
      });
    } else {
      // Add a new recipe
      return addDocument('recipes', {
        ...recipe,
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error saving recipe:', error);
    throw error;
  }
};

export const getRecipesByUser = async (userId: string) => {
  try {
    const querySnapshot = await getDocs(
      query(collection(db, 'recipes'), where('userId', '==', userId))
    );
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting recipes:', error);
    throw error;
  }
};

export const deleteRecipe = async (recipeId: string) => {
  try {
    await deleteDocument('recipes', recipeId);
  } catch (error) {
    console.error('Error deleting recipe:', error);
    throw error;
  }
};

export const getRecipeById = async (recipeId: string) => {
  try {
    const docRef = doc(db, 'recipes', recipeId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      };
    } else {
      throw new Error('Recipe not found');
    }
  } catch (error) {
    console.error('Error getting recipe:', error);
    throw error;
  }
};

export const cacheRecipeUrl = async (url: string, recipeData: any) => {
  try {
    // Create a hash of the URL to use as a key
    const urlHash = await createHash(url);
    
    // Store in Firestore with TTL of 7 days
    const cacheRef = doc(db, 'recipe_cache', urlHash);
    await setDoc(cacheRef, {
      url,
      recipeData,
      timestamp: serverTimestamp(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });
    
    return true;
  } catch (error) {
    console.error('Error caching recipe:', error);
    return false;
  }
};

export const getRecipeFromCache = async (url: string) => {
  try {
    const urlHash = await createHash(url);
    const cacheRef = doc(db, 'recipe_cache', urlHash);
    const docSnap = await getDoc(cacheRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      
      // Check if cache has expired
      if (data.expiresAt && data.expiresAt.toDate() > new Date()) {
        return data.recipeData;
      }
      
      // Cache expired, delete it
      await deleteDoc(cacheRef);
    }
    
    return null;
  } catch (error) {
    console.error('Error getting cached recipe:', error);
    return null;
  }
};

// Helper function to create a hash of a string
const createHash = async (text: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};
