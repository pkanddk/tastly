"use client";

import { useEffect, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

export default function AddToHomeScreen() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    // Check if it's a mobile device
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    // Check if it's iOS specifically (for different instructions)
    const isIOSDevice = /iPhone|iPad|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);
    
    // Check if the app is already installed (in standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone || 
                        document.referrer.includes('android-app://');
    
    // Only show prompt on mobile devices when not already installed
    if (isMobile && !isStandalone) {
      // Wait a few seconds before showing the prompt
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, []);

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-purple-600 text-white p-4 rounded-lg shadow-lg z-50 animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="flex-1 mr-4">
          <h3 className="font-bold text-lg mb-1">Add to Home Screen</h3>
          {isIOS ? (
            <p className="text-sm">
              Tap the share button <span className="inline-block">⎙</span> and choose "Add to Home Screen" to install Tastly
            </p>
          ) : (
            <p className="text-sm">
              Tap the menu button and choose "Add to Home Screen" to install Tastly
            </p>
          )}
        </div>
        <button 
          onClick={() => setShowPrompt(false)}
          className="flex-shrink-0 text-white hover:text-gray-200"
          aria-label="Close prompt"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
} 