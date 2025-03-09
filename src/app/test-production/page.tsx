'use client';

import { useState } from 'react';

export default function TestProduction() {
  const [url, setUrl] = useState('https://www.allrecipes.com/recipe/273671/orange-maple-roasted-carrots-and-fennel/');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  
  const runTest = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);
      setStartTime(Date.now());
      setEndTime(null);
      
      // Log device info
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      console.log("Device info:", { isMobile, userAgent: navigator.userAgent });
      
      // Call the API directly
      const response = await fetch('/api/extract-recipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Is-Mobile': isMobile ? 'true' : 'false',
          'X-Test-Production': 'true'
        },
        body: JSON.stringify({ url })
      });
      
      setEndTime(Date.now());
      console.log("Response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error (${response.status}): ${errorText}`);
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
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Recipe Extraction Test</h1>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Recipe URL:</label>
        <input 
          type="text" 
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full p-2 border rounded"
        />
      </div>
      
      <button 
        onClick={runTest}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
        disabled={loading}
      >
        {loading ? 'Testing...' : 'Run Test'}
      </button>
      
      {startTime && endTime && (
        <div className="text-sm mb-4">
          Time taken: {((endTime - startTime) / 1000).toFixed(2)} seconds
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {result && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">Result:</h2>
          <div className="bg-gray-100 p-4 rounded mb-4">
            <h3 className="font-medium mb-2">Markdown Content:</h3>
            <div className="whitespace-pre-wrap bg-white p-3 border rounded text-sm">
              {result.markdown}
            </div>
          </div>
          <div className="bg-gray-100 p-4 rounded">
            <h3 className="font-medium mb-2">Full Response:</h3>
            <pre className="overflow-auto max-h-96 bg-white p-3 border rounded text-xs">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
} 