'use client';

import { useState } from 'react';

export default function TestProductionPage() {
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const testProductionEndpoint = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/test-production-deepseek', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: 'https://example.com' }),
      });
      
      const contentType = response.headers.get('Content-Type');
      let testData;
      
      if (contentType?.includes('application/json')) {
        testData = await response.json();
        setResult(JSON.stringify(testData, null, 2));
      } else {
        testData = await response.text();
        setResult(testData);
      }
      
      console.log("Test production response:", typeof testData, testData);
    } catch (err) {
      console.error(err);
      setResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Test Production Endpoint</h1>
      
      <button 
        onClick={testProductionEndpoint}
        className="bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-4 rounded-lg mb-6"
        disabled={loading}
      >
        {loading ? 'Testing...' : 'Test Production Endpoint'}
      </button>
      
      {result && (
        <div className="bg-gray-900 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-bold text-white mb-4">Result:</h2>
          <pre className="whitespace-pre-wrap text-gray-200 overflow-auto max-h-96">
            {result}
          </pre>
        </div>
      )}
    </div>
  );
} 