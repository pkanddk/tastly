import Image from 'next/image';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8">
      {/* Banner Image */}
      <div className="w-full max-w-5xl mb-6 relative">
        <Image
          src="/images/tastly-banner.jpg"
          alt="Tastly - Recipe Extraction and Organization Tool"
          width={1200}
          height={400}
          className="rounded-lg shadow-md w-full h-auto"
          priority
        />
      </div>
      
      {/* Content with reduced spacing */}
      <div className="flex flex-col items-center space-y-4 mt-2">
        <h1 className="text-3xl md:text-4xl font-bold text-center">
          Welcome to Tastly
        </h1>
        <p className="text-xl text-center">
          Only the Recipe.
        </p>
        
        <a 
          href="/recipe-extractor" 
          className="mt-4 inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
        >
          Go to Recipe Extractor
        </a>
      </div>
    </main>
  );
}
