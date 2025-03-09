"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { DEFAULT_RECIPE_IMAGE } from '@/lib/firebase/firebaseUtils';

// Define the recipe type
interface ReplicaRecipe {
  id: string;
  title: string;
  restaurant: string;
  description: string;
  imageUrl?: string;
  createdAt: number;
}

const FALLBACK_IMAGE = '/images/recipes/default-recipe.jpg'; // Use favicon as a fallback

function getRestaurantImage(restaurantName: string): string {
  const restaurantMap: Record<string, string> = {
    "McDonald's": "/images/recipes/restaurant-mcdonalds.jpg",
    "KFC": "/images/recipes/restaurant-kfc.jpg",
    "Burger King": "/images/recipes/restaurant-burger-king.jpg",
    "Chick-fil-A": "/images/recipes/restaurant-chick-fil-a.jpg",
    "Taco Bell": "/images/recipes/restaurant-taco-bell.jpg",
    "Subway": "/images/recipes/restaurant-subway.jpg",
    "In-N-Out": "/images/recipes/restaurant-in-n-out.jpg",
    "Popeyes": "/images/recipes/restaurant-popeyes.jpg",
    "Wendy's": "/images/recipes/restaurant-wendys.jpg",
    "Buffalo Wild Wings": "/images/recipes/restaurant-buffalo-wild-wings.jpg"
  };
  
  return restaurantMap[restaurantName] || FALLBACK_IMAGE;
}

export default function ReplicationStationPage() {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<ReplicaRecipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  
  useEffect(() => {
    async function loadRecipes() {
      try {
        const recipesRef = collection(db, 'replicaRecipes');
        const q = query(recipesRef, orderBy('createdAt', 'desc'));
        
        try {
          const querySnapshot = await getDocs(q);
          
          const loadedRecipes: ReplicaRecipe[] = [];
          querySnapshot.forEach((doc) => {
            loadedRecipes.push({
              id: doc.id,
              ...doc.data() as Omit<ReplicaRecipe, 'id'>
            });
          });
          
          setRecipes(loadedRecipes);
        } catch (firestoreError) {
          console.error('Error loading replica recipes:', firestoreError);
          // Silently fail - we'll just show the hardcoded recipes
          setRecipes([]);
        }
      } catch (error) {
        console.error('Error in loadRecipes:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadRecipes();
  }, []);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Replication Station</h1>
        <p className="text-gray-400">Recreate your favorite restaurant dishes at home</p>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          <div className="mb-8 bg-gray-800 p-6 rounded-xl">
            <h2 className="text-xl font-bold mb-4">About Replication Station</h2>
            <p className="mb-4">
              Ever wanted to recreate your favorite restaurant dishes at home? Replication Station is a collection of recipes that mimic popular restaurant items.
            </p>
            <p>
              Browse our collection below!
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipes.map(recipe => (
              <div 
                key={recipe.id} 
                className="bg-gray-800 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => router.push(`/replication-station/${recipe.id}`)}
              >
                <div className="relative h-48 w-full">
                  <Image
                    src={getRestaurantImage(recipe.restaurant)}
                    alt={recipe.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-4">
                  <h2 className="text-xl font-bold mb-2">{recipe.title}</h2>
                  <p className="text-gray-400 text-sm mb-4">
                    {recipe.restaurant}
                  </p>
                  <div className="flex justify-between">
                    <button 
                      className="text-blue-400 hover:text-blue-300"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent card click
                        router.push(`/replication-station/${recipe.id}`);
                      }}
                    >
                      View Recipe
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">McDonald's Recreations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div 
                className="bg-gray-800 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => router.push('/replication-station/mcdonalds-secret-sauce')}
              >
                <div className="relative h-48 w-full">
                  <Image
                    src="/images/recipes/restaurant-mcdonalds.jpg"
                    alt="McDonald's Secret Sauce"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-4">
                  <h2 className="text-xl font-bold mb-2">Secret Sauce</h2>
                  <p className="text-gray-400 text-sm mb-4">
                    McDonald's
                  </p>
                  <div className="flex justify-between">
                    <button 
                      className="text-blue-400 hover:text-blue-300"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent card click
                        router.push('/replication-station/mcdonalds-secret-sauce');
                      }}
                    >
                      View Recipe
                    </button>
                  </div>
                </div>
              </div>
              
              <div 
                className="bg-gray-800 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => router.push('/replication-station/mcdonalds-big-mac-sauce')}
              >
                <div className="relative h-48 w-full">
                  <Image
                    src="/images/recipes/restaurant-mcdonalds.jpg"
                    alt="McDonald's Big Mac Sauce"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-4">
                  <h2 className="text-xl font-bold mb-2">Big Mac Sauce</h2>
                  <p className="text-gray-400 text-sm mb-4">
                    McDonald's
                  </p>
                  <div className="flex justify-between">
                    <button 
                      className="text-blue-400 hover:text-blue-300"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent card click
                        router.push('/replication-station/mcdonalds-big-mac-sauce');
                      }}
                    >
                      View Recipe
                    </button>
                  </div>
                </div>
              </div>
              
              <div 
                className="bg-gray-800 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => router.push('/replication-station/mcdonalds-mcchicken-sauce')}
              >
                <div className="relative h-48 w-full">
                  <Image
                    src="/images/recipes/restaurant-mcdonalds.jpg"
                    alt="McDonald's McChicken Sauce"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-4">
                  <h2 className="text-xl font-bold mb-2">McChicken Sauce</h2>
                  <p className="text-gray-400 text-sm mb-4">
                    McDonald's
                  </p>
                  <div className="flex justify-between">
                    <button 
                      className="text-blue-400 hover:text-blue-300"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent card click
                        router.push('/replication-station/mcdonalds-mcchicken-sauce');
                      }}
                    >
                      View Recipe
                    </button>
                  </div>
                </div>
              </div>
              
              <div 
                className="bg-gray-800 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => router.push('/replication-station/mcdonalds-bacon-egg-cheese-biscuit')}
              >
                <div className="relative h-48 w-full">
                  <Image
                    src="/images/recipes/restaurant-mcdonalds.jpg"
                    alt="McDonald's Bacon, Egg & Cheese Biscuit"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-4">
                  <h2 className="text-xl font-bold mb-2">Bacon, Egg & Cheese Biscuit</h2>
                  <p className="text-gray-400 text-sm mb-4">
                    McDonald's
                  </p>
                  <div className="flex justify-between">
                    <button 
                      className="text-blue-400 hover:text-blue-300"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent card click
                        router.push('/replication-station/mcdonalds-bacon-egg-cheese-biscuit');
                      }}
                    >
                      View Recipe
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">KFC Recreations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div 
                className="bg-gray-800 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => router.push('/replication-station/kfc-original-recipe')}
              >
                <div className="relative h-48 w-full">
                  <Image
                    src="/images/recipes/restaurant-kfc.jpg"
                    alt="KFC Original Recipe Chicken"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-4">
                  <h2 className="text-xl font-bold mb-2">Original Recipe Chicken</h2>
                  <p className="text-gray-400 text-sm mb-4">
                    KFC
                  </p>
                  <div className="flex justify-between">
                    <button 
                      className="text-blue-400 hover:text-blue-300"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent card click
                        router.push('/replication-station/kfc-original-recipe');
                      }}
                    >
                      View Recipe
                    </button>
                  </div>
                </div>
              </div>
              
              <div 
                className="bg-gray-800 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => router.push('/replication-station/kfc-mashed-potatoes')}
              >
                <div className="relative h-48 w-full">
                  <Image
                    src="/images/recipes/restaurant-kfc.jpg"
                    alt="KFC Mashed Potatoes & Gravy"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-4">
                  <h2 className="text-xl font-bold mb-2">Mashed Potatoes & Gravy</h2>
                  <p className="text-gray-400 text-sm mb-4">
                    KFC
                  </p>
                  <div className="flex justify-between">
                    <button 
                      className="text-blue-400 hover:text-blue-300"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent card click
                        router.push('/replication-station/kfc-mashed-potatoes');
                      }}
                    >
                      View Recipe
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">Burger King Recreations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div 
                className="bg-gray-800 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => router.push('/replication-station/burger-king-whopper')}
              >
                <div className="relative h-48 w-full">
                  <Image
                    src="/images/recipes/restaurant-burger-king.jpg"
                    alt="Burger King Whopper"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-4">
                  <h2 className="text-xl font-bold mb-2">Whopper</h2>
                  <p className="text-gray-400 text-sm mb-4">
                    Burger King
                  </p>
                  <div className="flex justify-between">
                    <button 
                      className="text-blue-400 hover:text-blue-300"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent card click
                        router.push('/replication-station/burger-king-whopper');
                      }}
                    >
                      View Recipe
                    </button>
                  </div>
                </div>
              </div>
              
              <div 
                className="bg-gray-800 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => router.push('/replication-station/burger-king-chicken-fries')}
              >
                <div className="relative h-48 w-full">
                  <Image
                    src="/images/recipes/restaurant-burger-king.jpg"
                    alt="Burger King Chicken Fries"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-4">
                  <h2 className="text-xl font-bold mb-2">Chicken Fries</h2>
                  <p className="text-gray-400 text-sm mb-4">
                    Burger King
                  </p>
                  <div className="flex justify-between">
                    <button 
                      className="text-blue-400 hover:text-blue-300"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent card click
                        router.push('/replication-station/burger-king-chicken-fries');
                      }}
                    >
                      View Recipe
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">More Restaurant Recreations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div 
                className="bg-gray-800 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => router.push('/replication-station/in-n-out-animal-style')}
              >
                <div className="relative h-48 w-full">
                  <Image
                    src="/images/recipes/restaurant-in-n-out.jpg"
                    alt="In-N-Out Animal Style Burger"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-4">
                  <h2 className="text-xl font-bold mb-2">Animal Style Burger</h2>
                  <p className="text-gray-400 text-sm mb-4">
                    In-N-Out
                  </p>
                  <div className="flex justify-between">
                    <button 
                      className="text-blue-400 hover:text-blue-300"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent card click
                        router.push('/replication-station/in-n-out-animal-style');
                      }}
                    >
                      View Recipe
                    </button>
                  </div>
                </div>
              </div>
              
              <div 
                className="bg-gray-800 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => router.push('/replication-station/popeyes-fried-chicken')}
              >
                <div className="relative h-48 w-full">
                  <Image
                    src="/images/recipes/restaurant-popeyes.jpg"
                    alt="Popeyes Fried Chicken"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-4">
                  <h2 className="text-xl font-bold mb-2">Fried Chicken</h2>
                  <p className="text-gray-400 text-sm mb-4">
                    Popeyes
                  </p>
                  <div className="flex justify-between">
                    <button 
                      className="text-blue-400 hover:text-blue-300"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent card click
                        router.push('/replication-station/popeyes-fried-chicken');
                      }}
                    >
                      View Recipe
                    </button>
                  </div>
                </div>
              </div>
              
              <div 
                className="bg-gray-800 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => router.push('/replication-station/wendys-spicy-chicken')}
              >
                <div className="relative h-48 w-full">
                  <Image
                    src="/images/recipes/restaurant-wendys.jpg"
                    alt="Wendy's Spicy Chicken Sandwich"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-4">
                  <h2 className="text-xl font-bold mb-2">Spicy Chicken Sandwich</h2>
                  <p className="text-gray-400 text-sm mb-4">
                    Wendy's
                  </p>
                  <div className="flex justify-between">
                    <button 
                      className="text-blue-400 hover:text-blue-300"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent card click
                        router.push('/replication-station/wendys-spicy-chicken');
                      }}
                    >
                      View Recipe
                    </button>
                  </div>
                </div>
              </div>
              
              <div 
                className="bg-gray-800 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => router.push('/replication-station/buffalo-wild-wings-sauce')}
              >
                <div className="relative h-48 w-full">
                  <Image
                    src="/images/recipes/restaurant-buffalo-wild-wings.jpg"
                    alt="Buffalo Wild Wings Buffalo Sauce"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-4">
                  <h2 className="text-xl font-bold mb-2">Buffalo Sauce</h2>
                  <p className="text-gray-400 text-sm mb-4">
                    Buffalo Wild Wings
                  </p>
                  <div className="flex justify-between">
                    <button 
                      className="text-blue-400 hover:text-blue-300"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent card click
                        router.push('/replication-station/buffalo-wild-wings-sauce');
                      }}
                    >
                      View Recipe
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
} 