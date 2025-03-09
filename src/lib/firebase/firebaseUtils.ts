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
  onAuthStateChanged,
  indexedDBLocalPersistence
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
  limit,
  orderBy
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Update the default recipe image path
export const DEFAULT_RECIPE_IMAGE = '/images/tastly-banner.jpg';

// Auth functions
export const signOut = async (callback?: () => void) => {
  try {
    // Clear any stored auth state
    localStorage.removeItem('auth_pending');
    await firebaseSignOut(auth);
    
    // Execute callback if provided
    if (callback) {
      callback();
    }
    
    return true;
  } catch (error) {
    console.error('Error signing out:', error);
    return false;
  }
};

export const signInWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    // Add this line to prefer popup mode
    provider.setCustomParameters({ prompt: 'select_account' });
    
    // Use signInWithPopup with error handling
    const result = await signInWithPopup(auth, provider)
      .catch((error) => {
        console.error("Popup sign-in error:", error);
        // Fallback to redirect method if popup fails
        if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
          console.log("Popup was blocked or closed, trying redirect method");
          return signInWithRedirect(auth, provider);
        }
        throw error;
      });
      
    return result;
  } catch (error) {
    console.error("Error signing in with Google:", error);
    throw error;
  }
};

// Check if we're returning from a redirect
export const checkRedirectResult = async () => {
  if (typeof window === 'undefined') return false;
  
  console.log("A. Checking for redirect result");
  const pendingAuth = localStorage.getItem('auth_pending');
  const timestamp = localStorage.getItem('auth_timestamp');
  
  console.log(`B. Auth pending: ${pendingAuth}, Timestamp: ${timestamp}`);
  
  // Only process if we have a pending auth that's not too old (5 minutes max)
  if (pendingAuth === 'true' && timestamp) {
    const authTime = parseInt(timestamp, 10);
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    const elapsed = now - authTime;
    
    console.log(`C. Auth time: ${new Date(authTime).toISOString()}, Elapsed: ${elapsed}ms`);
    
    if (elapsed < fiveMinutes) {
      console.log("D. Auth is recent, checking redirect result");
      try {
        console.log("E. Calling getRedirectResult");
        const result = await getRedirectResult(auth);
        console.log("F. Redirect result:", result ? "Success" : "No result");
        
        // Clear the pending flag regardless of result
        localStorage.removeItem('auth_pending');
        localStorage.removeItem('auth_timestamp');
        
        if (result && result.user) {
          console.log("G. Redirect sign-in successful, user:", result.user.email);
          return true;
        } else {
          console.log("H. No user from redirect result");
        }
      } catch (error) {
        console.error("I. Error handling redirect result:", error);
        localStorage.removeItem('auth_pending');
        localStorage.removeItem('auth_timestamp');
      }
    } else {
      // Auth is too old, clear it
      console.log("J. Auth attempt is stale, clearing");
      localStorage.removeItem('auth_pending');
      localStorage.removeItem('auth_timestamp');
    }
  } else {
    console.log("K. No pending auth detected");
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

export async function getRecipeFromCache(url: string): Promise<string | null> {
  try {
    const q = query(collection(db, 'recipesCache'), where('url', '==', url));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return doc.data().content;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting cached recipe:', error);
    // Just return null and don't let the error affect the user experience
    return null;
  }
}

export async function cacheRecipeUrl(url: string, content: string): Promise<void> {
  try {
    await addDoc(collection(db, 'recipesCache'), {
      url,
      content,
      timestamp: new Date().getTime()
    });
  } catch (error) {
    console.error('Error caching recipe:', error);
    // Silently fail - don't let caching errors affect the user experience
  }
}

// Helper function to create a hash of a string
const createHash = async (text: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Check if a recipe with the given title is already saved by the user
 */
export const checkIfRecipeSaved = async (userId: string, title: string): Promise<boolean> => {
  try {
    const recipesRef = collection(db, 'recipes');
    const q = query(
      recipesRef,
      where('userId', '==', userId),
      where('title', '==', title),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking if recipe is saved:', error);
    return false;
  }
};

/**
 * Save a replica recipe to Firestore
 */
export const saveReplicaRecipe = async (userId: string, recipeData: any) => {
  try {
    const recipesRef = collection(db, 'replicaRecipes');
    const newRecipe = {
      ...recipeData,
      userId,
      createdAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(recipesRef, newRecipe);
    return docRef.id;
  } catch (error) {
    console.error('Error saving replica recipe:', error);
    throw error;
  }
};

/**
 * Get all replica recipes
 */
export const getAllReplicaRecipes = async () => {
  try {
    const recipesRef = collection(db, 'replicaRecipes');
    const q = query(recipesRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const recipes: any[] = [];
    querySnapshot.forEach((doc) => {
      recipes.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return recipes;
  } catch (error) {
    console.error('Error getting replica recipes:', error);
    throw error;
  }
};

/**
 * Get a replica recipe by ID
 */
export const getReplicaRecipeById = async (recipeId: string) => {
  try {
    const docRef = doc(db, 'replicaRecipes', recipeId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting replica recipe:', error);
    throw error;
  }
};
