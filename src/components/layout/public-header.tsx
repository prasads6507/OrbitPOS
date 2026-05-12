'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { usePathname } from 'next/navigation';

export function PublicHeader() {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 w-full z-50 transition-all duration-500 ${
      scrolled || pathname !== '/' ? 'bg-white/80 backdrop-blur-xl border-b border-gray-100 py-3' : 'bg-transparent py-6'
    }`}>
      <div className="container mx-auto px-8 flex items-center justify-between">
        <Link className="flex items-center gap-2 group" href="/">
          <div className="w-9 h-9 bg-black rounded-lg flex items-center justify-center transition-transform group-hover:scale-105">
            <span className="text-white font-bold text-lg">O</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-black">
            OrbitPOS
          </span>
        </Link>
        
        <nav className="hidden md:flex items-center gap-12">
          <Link className="text-[13px] font-medium text-black/60 hover:text-black transition-colors" href="/#features">Features</Link>
          <Link className="text-[13px] font-medium text-black/60 hover:text-black transition-colors" href="/support">Support</Link>
          <Link className="text-[13px] font-medium text-black/60 hover:text-black transition-colors" href="/login">Sign In</Link>
          <Link href="/contact">
            <Button className="bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full px-6 h-9 text-[13px] font-semibold transition-all">
              Contact Sales
            </Button>
          </Link>
        </nav>

        <Button variant="ghost" size="icon" className="md:hidden">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
        </Button>
      </div>
    </header>
  );
}
