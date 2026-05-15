'use client';

import Link from 'next/link';
import Image from 'next/image';

export function PublicFooter() {
  return (
    <footer className="py-20 border-t border-gray-100 bg-white">
      <div className="container px-8 mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
          <Link href="/" className="flex items-center gap-2 group">
            <Image 
              src="/logo.png" 
              alt="OrbitPOS Logo" 
              width={240} 
              height={80} 
              className="h-16 w-auto transition-all grayscale hover:grayscale-0 opacity-80 hover:opacity-100" 
            />
          </Link>
          <span className="hidden md:block text-gray-300">|</span>
          <span className="text-gray-400 text-[13px] font-medium text-center md:text-left">
            Copyright © 2026 OrbitPOS Inc. All rights reserved.
          </span>
        </div>
        
        <nav className="flex flex-wrap justify-center gap-x-10 gap-y-4 text-[13px] font-medium text-gray-500">
          <Link className="hover:text-black transition-colors" href="/privacy">Privacy Policy</Link>
          <Link className="hover:text-black transition-colors" href="/terms">Terms of Use</Link>
          <Link className="hover:text-black transition-colors" href="/support">Support</Link>
          <Link className="hover:text-black transition-colors" href="/contact">Contact</Link>
        </nav>
      </div>
    </footer>
  );
}
