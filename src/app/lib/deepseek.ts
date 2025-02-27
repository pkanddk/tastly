'use client';

// This file is now just a client-side wrapper for the API
export async function extractRecipeFromUrl(url: string) {
  try {
    const response = await fetch('/api/extract-recipe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      throw new Error('Failed to extract recipe');
    }

    return await response.json();
  } catch (error) {
    console.error('Error extracting recipe:', error);
    throw error;
  }
} 