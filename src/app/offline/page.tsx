export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h1 className="text-3xl font-bold mb-4">You're offline</h1>
      <p className="mb-6 text-gray-300">
        It looks like you're not connected to the internet. Check your connection and try again.
      </p>
      <p className="text-gray-400 text-sm">
        Tastly works best with an internet connection, but you can still view previously loaded recipes.
      </p>
    </div>
  );
} 