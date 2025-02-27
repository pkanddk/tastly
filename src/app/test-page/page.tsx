import TestClient from './test-client';

export default function TestPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Page</h1>
      <p>This is a simple test page to verify routing works correctly.</p>
      <TestClient />
    </div>
  );
} 