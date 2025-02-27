import { auth, db, storage } from "./firebase";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  signInWithRedirect,
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
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Auth functions
export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
  }
};

export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  try {
    // First, check if we're in a mobile environment
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
      // For mobile devices, use redirect flow to avoid popup issues
      await signInWithRedirect(auth, provider);
    } else {
      // For desktop, use popup but with better handling
      await signInWithPopup(auth, provider);
    }
    return true;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    
    // Don't show alerts for cancelled popups or redirects
    if (
      error.code !== 'auth/cancelled-popup-request' && 
      error.code !== 'auth/popup-closed-by-user'
    ) {
      console.error('Authentication error:', error.message);
    }
    
    return false;
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
