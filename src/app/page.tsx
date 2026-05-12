'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { ShoppingCart, ShieldCheck, Users, Zap, ArrowRight, BarChart3, Globe, Smartphone, Check } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';

export default function LandingPage() {
  const { user, loading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) return null;

  return (
    <div className="flex flex-col min-h-screen bg-[#ffffff] text-[#1d1d1f] selection:bg-indigo-100 font-sans">
      <PublicHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full pt-40 pb-24 overflow-hidden bg-[#f5f5f7]">
          <div className="container px-8 mx-auto text-center">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-black mb-8 leading-[1.05]">
                Modern Retail. <br />
                <span className="text-[#0071e3]">Effortlessly Simple.</span>
              </h1>
              
              <p className="mx-auto max-w-2xl text-[#86868b] text-xl md:text-2xl mb-12 font-medium leading-relaxed">
                Experience the world&apos;s most intuitive Point of Sale system. <br className="hidden md:block" />
                Designed for speed, built for scale.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-20">
                <Link href="/contact">
                  <Button size="lg" className="bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full px-12 h-14 text-lg font-semibold transition-all hover:scale-[1.02] shadow-lg shadow-blue-500/10">
                    Schedule a Demo
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="ghost" className="rounded-full px-12 h-14 text-lg font-semibold transition-all hover:bg-gray-200/50">
                    Sign In to Store
                  </Button>
                </Link>
              </div>
            </div>

            {/* Premium Asset Preview */}
            <div className="relative mx-auto max-w-6xl animate-in fade-in zoom-in-95 duration-1000 delay-300">
              <Image 
                src="/premium_pos_light_hero.png" 
                alt="OrbitPOS Interface" 
                width={1200} 
                height={800} 
                className="rounded-3xl shadow-[0_40px_100px_rgba(0,0,0,0.1)] border border-white/50"
                priority
              />
            </div>
          </div>
        </section>

        {/* Feature Highlights */}
        <section id="features" className="py-32 bg-white">
          <div className="container px-8 mx-auto">
            <div className="max-w-4xl mx-auto mb-32 text-center md:text-left">
              <h2 className="text-4xl md:text-6xl font-bold mb-10 tracking-tight">Everything about your <br /> business, at a glance.</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <p className="text-xl text-[#86868b] font-medium leading-relaxed">
                  OrbitPOS streamlines your entire operation from inventory management to automated payroll, so you can focus on what matters most—your customers.
                </p>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-lg font-semibold">
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    Real-time Inventory Sync
                  </div>
                  <div className="flex items-center gap-3 text-lg font-semibold">
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    Multi-location Support
                  </div>
                  <div className="flex items-center gap-3 text-lg font-semibold">
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    AI-powered Sales Analytics
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <FeatureCard 
                icon={ShoppingCart} 
                title="Swift Checkout" 
                description="Engineered for high-volume retail. Process transactions in seconds with smart barcode scanning."
              />
              <FeatureCard 
                icon={Zap} 
                title="Instant Insights" 
                description="Live data processing means you see sales, trends, and stock alerts the moment they happen."
              />
              <FeatureCard 
                icon={Smartphone} 
                title="Hardware Ready" 
                description="Works seamlessly with any USB or Bluetooth scanner, label printer, and payment terminal."
              />
            </div>
          </div>
        </section>

        {/* Apple-style Banner */}
        <section className="py-32 bg-[#000000] text-white">
          <div className="container px-8 mx-auto text-center">
            <h2 className="text-4xl md:text-6xl font-bold mb-8 tracking-tight">Ready to elevate your store?</h2>
            <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto font-medium">Join thousands of retailers who have simplified their checkout experience with OrbitPOS.</p>
            <Link href="/contact">
              <Button size="lg" className="bg-white text-black hover:bg-gray-100 rounded-full px-12 h-14 text-lg font-bold transition-all">
                Contact our Sales Team
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }: any) {
  return (
    <div className="group p-8 rounded-3xl bg-[#f5f5f7] hover:bg-white transition-all border border-transparent hover:border-gray-100 hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)]">
      <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center mb-8 shadow-sm group-hover:bg-[#0071e3] transition-colors">
        <Icon className="h-6 w-6 text-[#1d1d1f] group-hover:text-white transition-colors" />
      </div>
      <h3 className="text-2xl font-bold mb-4 tracking-tight">{title}</h3>
      <p className="text-[#86868b] leading-relaxed font-medium">{description}</p>
    </div>
  );
}
