"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { doc, getDoc, addDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { useAuth } from '@/lib/hooks/useAuth';
import RecipeDisplay from '@/components/RecipeDisplay';
import { DEFAULT_RECIPE_IMAGE, saveRecipe, checkIfRecipeSaved } from '@/lib/firebase/firebaseUtils';
import GroceryList from '@/components/GroceryList';

const FALLBACK_IMAGE = '/images/recipes/default-recipe.jpg';

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

export default function ReplicaRecipePage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const [recipe, setRecipe] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isGeneratingList, setIsGeneratingList] = useState(false);
  const [showGroceryModal, setShowGroceryModal] = useState(false);
  const [groceryItems, setGroceryItems] = useState<string[]>([]);
  const [categorizedItems, setCategorizedItems] = useState<Record<string, string[]>>({});
  
  useEffect(() => {
    async function loadRecipe() {
      try {
        // Handle special hardcoded recipes
        if (params.id === 'mcdonalds-secret-sauce') {
          setRecipe({
            title: "McDonald's Secret Sauce Recipe",
            restaurant: "McDonald's",
            content: `# McDonald's Secret Sauce Recipe

## Ingredients
- 1 cup mayonnaise
- 1/4 cup French dressing
- 1/4 cup sweet pickle relish
- 1 tablespoon finely minced white onion
- 1 teaspoon white vinegar
- 1 teaspoon sugar
- 1/8 teaspoon salt

## Instructions
1. In a medium bowl, combine the mayonnaise, French dressing, sweet pickle relish, minced onion, white vinegar, sugar, and salt.
2. Mix all the ingredients thoroughly until well combined.
3. Cover the bowl with plastic wrap and refrigerate for at least 1 hour to allow the flavors to meld.
4. Stir the sauce again before serving.

## Cooking Time and Servings
- Preparation Time: 10 minutes
- Chilling Time: 1 hour
- Servings: Makes about 1 1/2 cups of sauce

## Notes
- This sauce is perfect for burgers, sandwiches, or as a dipping sauce for fries.
- For a smoother texture, you can blend the sauce in a food processor or blender.`,
            imageUrl: getRestaurantImage("McDonald's")
          });
          setIsLoading(false);
          return;
        }
        
        if (params.id === 'kfc-original-recipe') {
          setRecipe({
            title: "KFC Original Recipe Fried Chicken",
            restaurant: "KFC",
            content: `# KFC Original Recipe Fried Chicken

## Ingredients
- 1 whole chicken, cut into pieces
- 1 cup all-purpose flour
- 2 teaspoons salt
- 1/2 teaspoon thyme
- 1/2 teaspoon basil
- 1/3 teaspoon oregano
- 1 tablespoon celery salt
- 1 tablespoon black pepper
- 1 tablespoon dried mustard
- 4 tablespoons paprika
- 2 tablespoons garlic salt
- 1 tablespoon ground ginger
- 3 tablespoons white pepper
- 1 cup buttermilk
- Vegetable oil for frying

## Instructions
1. In a large bowl, combine the flour, salt, thyme, basil, oregano, celery salt, black pepper, dried mustard, paprika, garlic salt, ground ginger, and white pepper. Mix well.
2. Dip each piece of chicken into the buttermilk, then coat thoroughly with the flour mixture.
3. Heat the vegetable oil in a deep fryer or large skillet to 350°F (175°C).
4. Fry the chicken pieces in the hot oil until golden brown and cooked through, about 15-20 minutes.
5. Drain on paper towels and serve hot.

## Cooking Time and Servings
- Preparation Time: 20 minutes
- Cooking Time: 20 minutes
- Servings: 4-6

## Notes
- For extra crispy chicken, double-coat the pieces by dipping them in buttermilk and flour mixture twice.
- Ensure the oil is at the correct temperature to avoid greasy chicken.`,
            imageUrl: getRestaurantImage("KFC")
          });
          setIsLoading(false);
          return;
        }
        
        if (params.id === 'chick-fil-a-sandwich') {
          setRecipe({
            title: "Chick-fil-A Chicken Sandwich",
            restaurant: "Chick-fil-A",
            content: `# Chick-fil-A Chicken Sandwich

## Ingredients
- 1 boneless, skinless chicken breast
- 1/2 cup pickle juice
- 1/2 cup milk
- 1 egg
- 1 cup all-purpose flour
- 2 tablespoons powdered sugar
- 1 teaspoon paprika
- 1/2 teaspoon salt
- 1/2 teaspoon black pepper
- 1/2 teaspoon garlic powder
- 1/2 teaspoon celery salt
- 1/4 teaspoon dried basil
- Vegetable oil for frying
- 1 buttered bun
- 2 pickle slices

## Instructions
1. Marinate the chicken breast in pickle juice for 30 minutes to 1 hour.
2. In a bowl, whisk together the milk and egg. In another bowl, combine the flour, powdered sugar, paprika, salt, black pepper, garlic powder, celery salt, and dried basil.
3. Dip the marinated chicken breast into the milk and egg mixture, then coat thoroughly with the flour mixture.
4. Heat vegetable oil in a deep fryer or skillet to 350°F (175°C).
5. Fry the chicken breast for 5-6 minutes on each side, or until golden brown and cooked through.
6. Drain on paper towels.
7. Place the fried chicken breast on a buttered bun and top with pickle slices.
8. Serve immediately.

## Cooking Time and Servings
- Preparation Time: 15 minutes (plus marinating time)
- Cooking Time: 12 minutes
- Servings: 1

## Notes
- For a healthier option, you can bake the chicken breast at 375°F (190°C) for 25-30 minutes instead of frying.
- Add lettuce, tomato, or your favorite toppings for a customized sandwich.`,
            imageUrl: getRestaurantImage("Chick-fil-A")
          });
          setIsLoading(false);
          return;
        }
        
        if (params.id === 'taco-bell-crunchwrap') {
          setRecipe({
            title: "Taco Bell Crunchwrap Supreme",
            restaurant: "Taco Bell",
            content: `# Taco Bell Crunchwrap Supreme

## Ingredients
- 1 large flour tortilla
- 1/2 cup seasoned ground beef
- 1/4 cup nacho cheese sauce
- 1/4 cup shredded lettuce
- 1/4 cup diced tomatoes
- 2 tablespoons sour cream
- 1 tostada shell

## Instructions
1. Lay the flour tortilla flat on a clean surface.
2. Spread the seasoned ground beef in the center of the tortilla.
3. Layer the nacho cheese sauce, shredded lettuce, diced tomatoes, and sour cream on top of the beef.
4. Place the tostada shell on top of the layered ingredients.
5. Fold the edges of the tortilla over the filling, creating a hexagonal shape.
6. Heat a skillet over medium heat and place the Crunchwrap seam-side down. Cook for 2-3 minutes until golden brown, then flip and cook the other side for another 2-3 minutes.
7. Serve immediately.

## Cooking Time and Servings
- Preparation Time: 10 minutes
- Cooking Time: 5 minutes
- Servings: 1

## Notes
- Customize the fillings with your favorite ingredients, such as guacamole or jalapeños.
- Use a spatula to press down gently while cooking to ensure the Crunchwrap holds its shape.`,
            imageUrl: getRestaurantImage("Taco Bell")
          });
          setIsLoading(false);
          return;
        }
        
        if (params.id === 'burger-king-whopper') {
          setRecipe({
            title: "Burger King Whopper",
            restaurant: "Burger King",
            content: `# Burger King Whopper

## Ingredients
- 1/4 lb ground beef
- 1 sesame seed burger bun
- 1 tablespoon mayonnaise
- 1 teaspoon ketchup
- 4 pickle slices
- 1 tablespoon diced onion
- 2 tomato slices
- Shredded lettuce
- Salt and pepper to taste

## Instructions
1. Season the ground beef with salt and pepper, then shape it into a patty.
2. Grill or fry the patty over medium-high heat until cooked to your desired level of doneness.
3. Toast the sesame seed bun lightly.
4. Spread mayonnaise and ketchup on the bottom bun.
5. Layer the cooked patty, pickles, diced onion, tomato slices, and shredded lettuce on top.
6. Place the top bun over the fillings and serve immediately.

## Cooking Time and Servings
- Preparation Time: 10 minutes
- Cooking Time: 10 minutes
- Servings: 1

## Notes
- For a flame-grilled flavor, cook the patty on a grill instead of a skillet.
- Add cheese or bacon for a customized Whopper.`,
            imageUrl: getRestaurantImage("Burger King")
          });
          setIsLoading(false);
          return;
        }
        
        if (params.id === 'subway-italian-bmt') {
          setRecipe({
            title: "Subway Italian B.M.T. Sandwich",
            restaurant: "Subway",
            content: `# Subway Italian B.M.T. Sandwich

## Ingredients
- 1 Italian bread roll
- 3 slices salami
- 3 slices pepperoni
- 3 slices ham
- 1 slice provolone cheese
- Shredded lettuce
- Sliced tomatoes
- Sliced cucumbers
- Sliced onions
- Sliced green peppers
- Banana peppers (optional)
- Mayonnaise, mustard, or Subway sauce of choice

## Instructions
1. Slice the Italian bread roll lengthwise, but not all the way through.
2. Layer the salami, pepperoni, ham, and provolone cheese on the bottom half of the roll.
3. Add shredded lettuce, tomatoes, cucumbers, onions, green peppers, and banana peppers (if using).
4. Spread mayonnaise, mustard, or your preferred Subway sauce on the top half of the roll.
5. Close the sandwich and serve immediately.

## Cooking Time and Servings
- Preparation Time: 10 minutes
- Servings: 1

## Notes
- Customize the sandwich with your favorite vegetables and sauces.
- Toast the sandwich for a warm, melty version.`,
            imageUrl: getRestaurantImage("Subway")
          });
          setIsLoading(false);
          return;
        }
        
        // Add these additional recipe cases to the loadRecipe function

        if (params.id === 'mcdonalds-big-mac-sauce') {
          setRecipe({
            title: "McDonald's Big Mac Sauce",
            restaurant: "McDonald's",
            content: `# McDonald's Big Mac Sauce Recipe

## Ingredients
- 1/2 cup mayonnaise
- 2 tablespoons French dressing
- 4 teaspoons sweet pickle relish
- 1 tablespoon finely minced white onion
- 1 teaspoon white vinegar
- 1 teaspoon sugar
- 1/8 teaspoon salt

## Instructions
1. In a small bowl, combine the mayonnaise, French dressing, sweet pickle relish, minced onion, white vinegar, sugar, and salt.
2. Mix all the ingredients thoroughly until well combined.
3. Cover the bowl with plastic wrap and refrigerate for at least 1 hour to allow the flavors to meld.
4. Stir the sauce again before serving.

## Cooking Time and Servings
- Preparation Time: 10 minutes
- Chilling Time: 1 hour
- Servings: Makes about 3/4 cup of sauce

## Notes
- This sauce is a key component of the iconic Big Mac burger.
- Adjust the sweetness or tanginess by varying the amount of sugar or vinegar to suit your taste.`,
            imageUrl: getRestaurantImage("McDonald's")
          });
          setIsLoading(false);
          return;
        }

        if (params.id === 'mcdonalds-mcchicken-sauce') {
          setRecipe({
            title: "McDonald's McChicken Sauce",
            restaurant: "McDonald's",
            content: `# McDonald's McChicken Sauce Recipe

## Ingredients
- 1/2 cup mayonnaise
- 1 tablespoon Dijon mustard
- 1 tablespoon honey
- 1 teaspoon lemon juice
- 1/2 teaspoon garlic powder
- 1/2 teaspoon onion powder
- 1/4 teaspoon paprika
- Salt and pepper to taste

## Instructions
1. In a small bowl, combine the mayonnaise, Dijon mustard, honey, lemon juice, garlic powder, onion powder, and paprika.
2. Mix all the ingredients thoroughly until well combined.
3. Season with salt and pepper to taste.
4. Cover the bowl with plastic wrap and refrigerate for at least 30 minutes to allow the flavors to meld.
5. Stir the sauce again before serving.

## Cooking Time and Servings
- Preparation Time: 10 minutes
- Chilling Time: 30 minutes
- Servings: Makes about 2/3 cup of sauce

## Notes
- This sauce is perfect for chicken sandwiches or as a dipping sauce for chicken nuggets.
- For a spicier version, add a pinch of cayenne pepper or a few drops of hot sauce.`,
            imageUrl: getRestaurantImage("McDonald's")
          });
          setIsLoading(false);
          return;
        }

        if (params.id === 'mcdonalds-bacon-egg-cheese-biscuit') {
          setRecipe({
            title: "McDonald's Bacon, Egg, and Cheese Biscuit",
            restaurant: "McDonald's",
            content: `# McDonald's Bacon, Egg, and Cheese Biscuit

## Ingredients
- 1 large egg
- 1 slice American cheese
- 2 slices cooked bacon
- 1 biscuit (store-bought or homemade)
- Butter for cooking

## Instructions
1. Cook the bacon in a skillet until crispy, then set aside.
2. In the same skillet, melt a little butter and crack the egg into the pan. Cook until the egg white is set but the yolk is still runny.
3. Split the biscuit in half and toast it lightly.
4. Place the cooked egg on the bottom half of the biscuit, followed by the bacon and cheese slice.
5. Close the biscuit and serve immediately.

## Cooking Time and Servings
- Preparation Time: 5 minutes
- Cooking Time: 10 minutes
- Servings: 1

## Notes
- For a fluffier biscuit, use homemade buttermilk biscuits.
- Add a slice of tomato or avocado for extra flavor.`,
            imageUrl: getRestaurantImage("McDonald's")
          });
          setIsLoading(false);
          return;
        }

        if (params.id === 'in-n-out-animal-style') {
          setRecipe({
            title: "In-N-Out Animal Style Burger",
            restaurant: "In-N-Out",
            content: `# In-N-Out Animal Style Burger

## Ingredients
- 1/4 lb ground beef
- 1 hamburger bun
- 1 tablespoon mayonnaise
- 1 tablespoon mustard
- 1 slice American cheese
- 1/4 cup diced onions
- 2 pickle slices
- 1 tablespoon In-N-Out spread (see McDonald's Secret Sauce recipe above)
- Butter for grilling

## Instructions
1. Cook the ground beef patty on a griddle or skillet over medium-high heat.
2. While the patty is cooking, caramelize the diced onions in a separate pan with a little butter until golden brown.
3. Toast the hamburger bun on the griddle with a little butter.
4. Spread mayonnaise and mustard on the bottom bun.
5. Place the cooked patty on the bun, then top with American cheese, caramelized onions, pickle slices, and In-N-Out spread.
6. Close the burger and serve immediately.

## Cooking Time and Servings
- Preparation Time: 10 minutes
- Cooking Time: 10 minutes
- Servings: 1

## Notes
- For extra flavor, grill the patty with a splash of mustard before flipping.
- Add lettuce and tomato if desired.`,
            imageUrl: getRestaurantImage("In-N-Out")
          });
          setIsLoading(false);
          return;
        }

        if (params.id === 'popeyes-fried-chicken') {
          setRecipe({
            title: "Popeyes Fried Chicken",
            restaurant: "Popeyes",
            content: `# Popeyes Fried Chicken

## Ingredients
- 1 whole chicken, cut into pieces
- 1 cup buttermilk
- 1 cup all-purpose flour
- 1 teaspoon paprika
- 1 teaspoon garlic powder
- 1 teaspoon onion powder
- 1 teaspoon cayenne pepper
- 1 teaspoon salt
- 1 teaspoon black pepper
- Vegetable oil for frying

## Instructions
1. Marinate the chicken pieces in buttermilk for at least 4 hours or overnight.
2. In a large bowl, combine the flour, paprika, garlic powder, onion powder, cayenne pepper, salt, and black pepper.
3. Dredge the marinated chicken pieces in the flour mixture, ensuring they are fully coated.
4. Heat vegetable oil in a deep fryer or large skillet to 350°F (175°C).
5. Fry the chicken pieces for 12-15 minutes, or until golden brown and cooked through.
6. Drain on paper towels and serve hot.

## Cooking Time and Servings
- Preparation Time: 15 minutes (plus marinating time)
- Cooking Time: 15 minutes
- Servings: 4-6

## Notes
- For extra crispy chicken, double-dredge the pieces in the flour mixture.
- Serve with your favorite dipping sauce.`,
            imageUrl: getRestaurantImage("Popeyes")
          });
          setIsLoading(false);
          return;
        }

        if (params.id === 'wendys-spicy-chicken') {
          setRecipe({
            title: "Wendy's Spicy Chicken Sandwich",
            restaurant: "Wendy's",
            content: `# Wendy's Spicy Chicken Sandwich

## Ingredients
- 1 boneless, skinless chicken breast
- 1/2 cup buttermilk
- 1/2 cup hot sauce
- 1 cup all-purpose flour
- 1 teaspoon cayenne pepper
- 1 teaspoon paprika
- 1 teaspoon garlic powder
- 1 teaspoon onion powder
- 1/2 teaspoon salt
- 1/2 teaspoon black pepper
- Vegetable oil for frying
- 1 bun
- Mayonnaise, lettuce, and tomato for serving

## Instructions
1. Marinate the chicken breast in buttermilk and hot sauce for at least 1 hour.
2. In a bowl, combine the flour, cayenne pepper, paprika, garlic powder, onion powder, salt, and black pepper.
3. Dredge the marinated chicken breast in the flour mixture, ensuring it is fully coated.
4. Heat vegetable oil in a deep fryer or skillet to 350°F (175°C).
5. Fry the chicken breast for 6-7 minutes on each side, or until golden brown and cooked through.
6. Drain on paper towels.
7. Assemble the sandwich with mayonnaise, lettuce, tomato, and the fried chicken breast.
8. Serve immediately.

## Cooking Time and Servings
- Preparation Time: 15 minutes (plus marinating time)
- Cooking Time: 12 minutes
- Servings: 1

## Notes
- Adjust the level of spiciness by adding more or less cayenne pepper.
- For a healthier option, bake the chicken breast at 375°F (190°C) for 25-30 minutes.`,
            imageUrl: getRestaurantImage("Wendy's")
          });
          setIsLoading(false);
          return;
        }

        if (params.id === 'burger-king-chicken-fries') {
          setRecipe({
            title: "Burger King Chicken Fries",
            restaurant: "Burger King",
            content: `# Burger King Chicken Fries

## Ingredients
- 1 lb chicken tenders
- 1 cup buttermilk
- 1 cup all-purpose flour
- 1 teaspoon paprika
- 1 teaspoon garlic powder
- 1 teaspoon onion powder
- 1/2 teaspoon salt
- 1/2 teaspoon black pepper
- Vegetable oil for frying

## Instructions
1. Cut the chicken tenders into fry-shaped strips.
2. Marinate the chicken strips in buttermilk for at least 1 hour.
3. In a bowl, combine the flour, paprika, garlic powder, onion powder, salt, and black pepper.
4. Dredge the marinated chicken strips in the flour mixture, ensuring they are fully coated.
5. Heat vegetable oil in a deep fryer or skillet to 350°F (175°C).
6. Fry the chicken strips for 4-5 minutes, or until golden brown and cooked through.
7. Drain on paper towels and serve with your favorite dipping sauce.

## Cooking Time and Servings
- Preparation Time: 15 minutes (plus marinating time)
- Cooking Time: 5 minutes
- Servings: 2-3

## Notes
- For extra crispiness, double-dredge the chicken strips in the flour mixture.
- Serve with BBQ sauce, ranch, or honey mustard.`,
            imageUrl: getRestaurantImage("Burger King")
          });
          setIsLoading(false);
          return;
        }

        if (params.id === 'kfc-mashed-potatoes') {
          setRecipe({
            title: "KFC Mashed Potatoes and Gravy",
            restaurant: "KFC",
            content: `# KFC Mashed Potatoes and Gravy

## Ingredients
- 4 large potatoes, peeled and cubed
- 1/2 cup butter
- 1/2 cup milk
- Salt and pepper to taste
- 2 cups chicken broth
- 2 tablespoons butter
- 2 tablespoons all-purpose flour
- 1/4 teaspoon black pepper
- 1/4 teaspoon garlic powder

## Instructions
1. Boil the potatoes in salted water until tender, about 15-20 minutes.
2. Drain the potatoes and mash them with butter, milk, salt, and pepper until smooth.
3. For the gravy, melt 2 tablespoons of butter in a saucepan over medium heat.
4. Whisk in the flour, black pepper, and garlic powder until smooth.
5. Gradually add the chicken broth, whisking constantly, until the gravy thickens.
6. Serve the mashed potatoes topped with gravy.

## Cooking Time and Servings
- Preparation Time: 15 minutes
- Cooking Time: 20 minutes
- Servings: 4

## Notes
- For creamier mashed potatoes, add more milk or butter as needed.
- Adjust the seasoning of the gravy to your taste.`,
            imageUrl: getRestaurantImage("KFC")
          });
          setIsLoading(false);
          return;
        }

        if (params.id === 'buffalo-wild-wings-sauce') {
          setRecipe({
            title: "Buffalo Wild Wings Buffalo Sauce",
            restaurant: "Buffalo Wild Wings",
            content: `# Buffalo Wild Wings Buffalo Sauce

## Ingredients
- 1/2 cup hot sauce (like Frank's RedHot)
- 1/2 cup unsalted butter
- 1 tablespoon white vinegar
- 1/4 teaspoon Worcestershire sauce
- 1/4 teaspoon cayenne pepper
- 1/8 teaspoon garlic powder
- Salt to taste

## Instructions
1. In a saucepan, melt the butter over medium heat.
2. Add the hot sauce, white vinegar, Worcestershire sauce, cayenne pepper, and garlic powder.
3. Stir well and bring to a simmer.
4. Reduce the heat and let the sauce simmer for 5 minutes, stirring occasionally.
5. Season with salt to taste.
6. Remove from heat and let cool slightly before using.

## Cooking Time and Servings
- Preparation Time: 5 minutes
- Cooking Time: 10 minutes
- Servings: Makes about 1 cup of sauce

## Notes
- For a milder sauce, reduce the amount of cayenne pepper.
- This sauce is perfect for chicken wings, but can also be used as a dipping sauce for fries or vegetables.`,
            imageUrl: getRestaurantImage("Buffalo Wild Wings")
          });
          setIsLoading(false);
          return;
        }
        
        // Load from Firestore for other recipes
        const recipeDoc = await getDoc(doc(db, 'replicaRecipes', params.id));
        
        if (!recipeDoc.exists()) {
          setError('Recipe not found');
        } else {
          setRecipe(recipeDoc.data());
        }
      } catch (err) {
        console.error('Error loading recipe:', err);
        setError('Failed to load recipe');
      } finally {
        setIsLoading(false);
      }
    }
    
    loadRecipe();
  }, [params.id]);
  
  useEffect(() => {
    async function checkSavedStatus() {
      if (user && recipe) {
        try {
          const saved = await checkIfRecipeSaved(user.uid, recipe.title);
          setIsSaved(saved);
        } catch (error) {
          console.error('Error checking if recipe is saved:', error);
        }
      }
    }
    
    checkSavedStatus();
  }, [user, recipe]);
  
  const handleSaveRecipe = async () => {
    if (!user) {
      alert('Please sign in to save recipes');
      return;
    }
    
    if (isSaved) {
      return; // Already saved
    }
    
    setIsSaving(true);
    
    try {
      // Extract title from the first line of content
      const titleMatch = recipe.content.match(/# (.+)$/m);
      const title = titleMatch ? titleMatch[1] : recipe.title;
      
      // Save the recipe using the same function used in the extractor
      await saveRecipe(user.uid, {
        title: title,
        content: recipe.content,
        imageUrl: recipe.imageUrl || DEFAULT_RECIPE_IMAGE,
        source: 'replication-station',
        restaurant: recipe.restaurant
      });
      
      setIsSaved(true);
    } catch (error) {
      console.error('Error saving recipe:', error);
      alert('Failed to save recipe. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const extractIngredients = (content: string): string[] => {
    const ingredients: string[] = [];
    const lines = content.split('\n');
    
    let inIngredientsSection = false;
    
    for (const line of lines) {
      if (line.startsWith('## Ingredients')) {
        inIngredientsSection = true;
        continue;
      }
      
      if (inIngredientsSection && line.startsWith('## ')) {
        // We've reached the next section
        break;
      }
      
      if (inIngredientsSection && line.startsWith('- ')) {
        // This is an ingredient line
        ingredients.push(line.replace('- ', ''));
      }
    }
    
    return ingredients;
  };
  
  const categorizeIngredients = (ingredients: string[]): Record<string, string[]> => {
    const categories: Record<string, string[]> = {
      'Produce': [],
      'Meat & Seafood': [],
      'Dairy & Eggs': [],
      'Bakery': [],
      'Pantry': [],
      'Spices & Seasonings': [],
      'Other': []
    };
    
    // Define keywords for each category
    const categoryKeywords: Record<string, string[]> = {
      'Produce': ['lettuce', 'tomato', 'onion', 'potato', 'carrot', 'celery', 'cucumber', 'pepper', 'garlic', 'avocado', 'lemon', 'lime', 'apple', 'banana', 'berry', 'fruit', 'vegetable'],
      'Meat & Seafood': ['beef', 'chicken', 'pork', 'turkey', 'lamb', 'fish', 'salmon', 'tuna', 'shrimp', 'bacon', 'sausage', 'ground', 'steak', 'meat', 'seafood'],
      'Dairy & Eggs': ['milk', 'cream', 'cheese', 'butter', 'yogurt', 'egg', 'dairy'],
      'Bakery': ['bread', 'bun', 'roll', 'tortilla', 'pita', 'bagel', 'croissant', 'pastry', 'cake', 'cookie', 'biscuit'],
      'Pantry': ['flour', 'sugar', 'oil', 'vinegar', 'sauce', 'ketchup', 'mustard', 'mayonnaise', 'relish', 'dressing', 'pasta', 'rice', 'bean', 'can', 'jar', 'bottle'],
      'Spices & Seasonings': ['salt', 'pepper', 'spice', 'herb', 'seasoning', 'powder', 'paprika', 'oregano', 'basil', 'thyme', 'cumin', 'cinnamon', 'nutmeg', 'cayenne']
    };
    
    // Categorize each ingredient
    ingredients.forEach(ingredient => {
      const lowerIngredient = ingredient.toLowerCase();
      let assigned = false;
      
      // Check each category's keywords
      for (const [category, keywords] of Object.entries(categoryKeywords)) {
        if (keywords.some(keyword => lowerIngredient.includes(keyword))) {
          categories[category].push(ingredient);
          assigned = true;
          break;
        }
      }
      
      // If not assigned to any category, put in "Other"
      if (!assigned) {
        categories['Other'].push(ingredient);
      }
    });
    
    // Remove empty categories
    return Object.fromEntries(
      Object.entries(categories).filter(([_, items]) => items.length > 0)
    );
  };
  
  const handleGroceryList = () => {
    setIsGeneratingList(true);
    
    try {
      const ingredients = extractIngredients(recipe.content);
      
      if (ingredients.length === 0) {
        alert('No ingredients found in this recipe');
        return;
      }
      
      // Categorize the ingredients
      const categorizedIngredients = categorizeIngredients(ingredients);
      
      // Set the grocery items and show the modal
      setGroceryItems(ingredients);
      setCategorizedItems(categorizedIngredients);
      setShowGroceryModal(true);
    } catch (error) {
      console.error('Error generating grocery list:', error);
      alert('Failed to generate grocery list. Please try again.');
    } finally {
      setIsGeneratingList(false);
    }
  };
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  // Show error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-gray-800 rounded-xl p-6 text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Error</h1>
          <p className="text-gray-300 mb-6">{error}</p>
          
          <button
            onClick={() => router.push('/replication-station')}
            className="mt-4 text-blue-400 hover:text-blue-300"
          >
            Back to Replication Station
          </button>
        </div>
      </div>
    );
  }
  
  // Show recipe
  if (recipe) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <button
            onClick={() => router.push('/replication-station')}
            className="text-blue-400 hover:text-blue-300 inline-flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Replication Station
          </button>
        </div>
        
        <div className="custom-recipe-container bg-gray-900 rounded-xl shadow-lg mb-8">
          <div className="recipe-image-container rounded-t-xl overflow-hidden relative h-64 w-full">
            <Image 
              src={recipe.imageUrl || DEFAULT_RECIPE_IMAGE}
              alt={recipe.title}
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
            />
          </div>
          
          {/* Action Buttons - Match RecipeDisplay style */}
          <div className="p-4 bg-gray-700 flex justify-center gap-4">
            <button
              onClick={handleSaveRecipe}
              disabled={isSaving || isSaved}
              className={`flex items-center gap-2 ${
                isSaved 
                  ? 'bg-green-600 hover:bg-green-600' 
                  : 'bg-blue-600 hover:bg-blue-500'
              } text-white px-4 py-2 rounded-lg transition-colors`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              {isSaving ? 'Saving...' : isSaved ? 'Saved' : 'Save Recipe'}
            </button>
            
            <button
              onClick={handleGroceryList}
              className="flex items-center gap-2 bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Grocery List
            </button>
          </div>
          
          {/* Recipe Content - Format like RecipeDisplay */}
          <div className="p-6">
            <div className="recipe-content">
              {recipe.content.split('\n').map((line, index) => {
                // Skip the title line (starts with # )
                if (index === 0 && line.startsWith('# ')) {
                  return null;
                }
                
                // Format headings
                if (line.startsWith('## ')) {
                  return (
                    <h2 key={index} className="text-xl font-semibold my-4 text-blue-400">
                      {line.replace('## ', '')}
                    </h2>
                  );
                }
                
                // Format lists
                if (line.startsWith('- ')) {
                  return (
                    <div key={index} className="ml-4 my-1">
                      <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                      <span>{line.replace('- ', '')}</span>
                    </div>
                  );
                }
                
                // Format numbered lists
                if (/^\d+\.\s/.test(line)) {
                  return (
                    <div key={index} className="ml-4 my-1">
                      <span className="text-blue-400 mr-2">{line.match(/^\d+/)?.[0]}.</span>
                      <span>{line.replace(/^\d+\.\s/, '')}</span>
                    </div>
                  );
                }
                
                // Regular text
                return line ? <p key={index} className="my-2">{line}</p> : <div key={index} className="my-4"></div>;
              })}
            </div>
          </div>
        </div>
        
        {/* Grocery List Modal - Keep existing implementation */}
        {showGroceryModal && (
          <GroceryList 
            ingredients={groceryItems} 
            onClose={() => setShowGroceryModal(false)} 
          />
        )}
      </div>
    );
  }
} 