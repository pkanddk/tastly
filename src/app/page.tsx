export default function Home() {
  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Tastly</h1>
        </div>
        
        <div className="mt-8 text-center">
          <h2 className="text-2xl font-semibold mb-4">Welcome to Tastly</h2>
          <p className="mb-4">Your recipe extraction and organization tool</p>
          <a 
            href="/recipe-extractor" 
            className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
          >
            Go to Recipe Extractor
          </a>
        </div>
      </div>
    </main>
  );
}
