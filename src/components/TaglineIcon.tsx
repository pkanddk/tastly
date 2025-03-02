import React from 'react';

type IconType = 
  | 'ban' 
  | 'mouse' 
  | 'book-open' 
  | 'shield-check' 
  | 'academic-cap' 
  | 'book' 
  | 'x-circle' 
  | 'heart' 
  | 'fast-forward' 
  | 'globe' 
  | 'mail' 
  | 'arrow-down' 
  | 'document-text' 
  | 'user-group' 
  | 'photograph' 
  | 'lightning-bolt';

interface TaglineIconProps {
  icon: IconType;
  className?: string;
}

export default function TaglineIcon({ icon, className = "" }: TaglineIconProps) {
  const baseClass = "w-6 h-6 " + className;
  
  switch (icon) {
    case 'ban':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      );
    case 'mouse':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      );
    case 'book-open':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      );
    case 'shield-check':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      );
    // Add the rest of the icons...
    default:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
  }
} 