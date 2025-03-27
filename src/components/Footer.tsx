'use client';

interface FooterProps {
  className?: string;
}

export default function Footer({ className = '' }: FooterProps) {
  return (
    <footer className={className}>
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500 text-xs font-light tracking-wide">
          a pk and dk app.
        </p>
      </div>
    </footer>
  );
} 