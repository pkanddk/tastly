'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function MobileDebugPage() {
  const [deviceInfo, setDeviceInfo] = useState<any>({});
  const [testResult, setTestResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [testUrl, setTestUrl] = useState('https://www.allrecipes.com/recipe/158968/spinach-and-feta-turkey-burgers/');

  useEffect(() => {
    // Collect device information
    const info = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      vendor: navigator.vendor,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      language: navigator.language,
      cookiesEnabled: navigator.cookieEnabled,
      localStorage: typeof localStorage !== 'undefined',
      sessionStorage: typeof sessionStorage !== 'undefined',
    };
    setDeviceInfo(info);
  }, []);

  const testDirectFetch = async () => {
    try {
      setLoading(true);
      setTestResult('Starting direct fetch test...');
      
      // Test direct fetch to the API
      const response = await fetch('/api/deepseek/extract-recipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Is-Mobile': 'true'
        },
        body: JSON.stringify({ 
          url: testUrl, 
          isMobile: true,
          debug: true
        }),
      });
      
      setTestResult(`Response status: ${response.status}`);
      
      const contentType = response.headers.get('Content-Type');
      setTestResult(prev => `${prev}\nContent-Type: ${contentType}`);
      
      try {
        if (contentType?.includes('application/json')) {
          const jsonData = await response.json();
          setTestResult(prev => `${prev}\nJSON Response: ${JSON.stringify(jsonData).substring(0, 500)}...`);
        } else {
          const textData = await response.text();
          setTestResult(prev => `${prev}\nText Response: ${textData.substring(0, 500)}...`);
        }
      } catch (parseError) {
        setTestResult(prev => `${prev}\nError parsing response: ${parseError}`);
        
        // Try to get raw text as fallback
        try {
          const rawText = await response.text();
          setTestResult(prev => `${prev}\nRaw response text: ${rawText.substring(0, 200)}...`);
        } catch (e) {
          setTestResult(prev => `${prev}\nCouldn't get raw response: ${e}`);
        }
      }
    } catch (err) {
      setTestResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Mobile Debug Page</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Device Information</h2>
        <pre className="bg-gray-900 p-4 rounded-lg text-gray-200 text-sm overflow-auto max-h-60">
          {JSON.stringify(deviceInfo, null, 2)}
        </pre>
      </div>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Test Recipe Extraction</h2>
        <div className="flex flex-col gap-4">
          <input
            type="text"
            value={testUrl}
            onChange={(e) => setTestUrl(e.target.value)}
            placeholder="Enter recipe URL to test"
            className="p-2 border border-gray-300 rounded w-full"
          />
          <button 
            onClick={testDirectFetch}
            className="bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-4 rounded-lg"
            disabled={loading}
          >
            {loading ? 'Testing...' : 'Test Direct API Fetch'}
          </button>
        </div>
      </div>
      
      {testResult && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Test Results</h2>
          <pre className="bg-gray-900 p-4 rounded-lg text-gray-200 text-sm overflow-auto max-h-96 whitespace-pre-wrap">
            {testResult}
          </pre>
        </div>
      )}
      
      <div className="mt-8">
        <Link href="/" className="text-blue-500 hover:underline">
          Back to Home
        </Link>
      </div>
    </div>
  );
} 