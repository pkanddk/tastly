'use client';

import { useState } from 'react';

export default function TestClient() {
  const [count, setCount] = useState(0);
  
  return (
    <div className="mt-4">
      <p>Count: {count}</p>
      <button 
        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
        onClick={() => setCount(count + 1)}
      >
        Increment
      </button>
    </div>
  );
} 