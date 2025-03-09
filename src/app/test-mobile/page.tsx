'use client';

import { useState, useEffect } from 'react';

export default function TestMobile() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const testUrl = 'https://www.allrecipes.com/recipe/273671/orange-maple-roasted-carrots-and-fennel/';
  
  const runTest = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Log device info
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      console.log("Device info:", { isMobile, userAgent: navigator.userAgent });
      
      // Call the API directly
      const response = await fetch('/api/extract-recipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Is-Mobile': isMobile ? 'true' : 'false'
        },
        body: JSON.stringify({ url: testUrl })
      });
      
      console.log("Response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${errorText}`);
      }
      
      // Display the raw response for debugging
      const rawResponse = await response.text();
      console.log("Raw response:", rawResponse);
      
      try {
        const data = JSON.parse(rawResponse);
        setResult(data);
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        setError(`Failed to parse JSON: ${rawResponse.substring(0, 100)}...`);
      }
      
    } catch (err) {
      console.error("Test error:", err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Mobile API Test</h1>
      
      <button 
        onClick={runTest}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
        disabled={loading}
      >
        {loading ? 'Testing...' : 'Run Test'}
      </button>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {result && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">Result:</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96 text-sm">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
} 