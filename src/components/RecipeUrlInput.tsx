'use client';

import React from 'react';

interface RecipeUrlInputProps {
  url: string;
  setUrl: (url: string) => void;
  onExtract: () => void;
  loading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
}

export default function RecipeUrlInput({ url, setUrl, onExtract, loading, error, setError }: RecipeUrlInputProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onExtract();
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Get the raw value from the input
    const rawValue = e.target.value;
    
    // Clean the URL (remove leading/trailing whitespace)
    const cleanValue = rawValue.trim();
    
    // Update the URL state
    setUrl(cleanValue);
    
    // Clear any previous error when the user types
    if (error) {
      setError(null);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="url"
          value={url}
          onChange={handleUrlChange}
          placeholder="Paste recipe URL here"
          className="flex-grow px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Extracting...' : 'Extract Recipe'}
        </button>
      </div>
    </form>
  );
} 