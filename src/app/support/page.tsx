'use client';

import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { 
  Search, 
  BookOpen, 
  LifeBuoy, 
  Settings, 
  CreditCard, 
  Users, 
  Zap, 
  ArrowRight,
  MessageCircle,
  PlayCircle
} from 'lucide-react';
import Link from 'next/link';

export default function SupportPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1d1d1f] selection:bg-indigo-100 font-sans">
      <PublicHeader />

      <main className="flex-1 pt-32 pb-24">
        {/* Hero Section */}
        <section className="bg-[#f5f5f7] py-24 mb-20">
          <div className="container px-8 mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-black mb-8">
              How can we help?
            </h1>
            <div className="max-w-2xl mx-auto relative group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-400 group-focus-within:text-[#0071e3] transition-colors" />
              <Input 
                placeholder="Search for articles, guides, and more..." 
                className="h-16 pl-16 pr-8 rounded-2xl border-none shadow-xl shadow-black/5 bg-white text-lg font-medium focus:ring-2 focus:ring-[#0071e3]/20 transition-all"
              />
            </div>
            <p className="mt-8 text-[#86868b] font-medium">
              Popular topics: <span className="text-black cursor-pointer hover:text-[#0071e3] transition-colors">Setting up your store</span>, <span className="text-black cursor-pointer hover:text-[#0071e3] transition-colors">Hardware guides</span>, <span className="text-black cursor-pointer hover:text-[#0071e3] transition-colors">Billing</span>
            </p>
          </div>
        </section>

        <div className="container px-8 mx-auto">
          {/* Category Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-32">
            <SupportCategory 
              icon={BookOpen} 
              title="Getting Started" 
              description="Learn the basics of setting up your OrbitPOS account and hardware."
              links={["Setting up your store", "Adding your first product", "Staff roles & permissions"]}
            />
            <SupportCategory 
              icon={Zap} 
              title="POS Features" 
              description="Master the checkout process, discounts, and inventory tracking."
              links={["Processing sales", "Applying discounts", "Managing stock levels"]}
            />
            <SupportCategory 
              icon={Settings} 
              title="Advanced Settings" 
              description="Configure integrations, tax rates, and automated reporting."
              links={["API integrations", "Tax configuration", "Custom report builder"]}
            />
            <SupportCategory 
              icon={CreditCard} 
              title="Billing & Subscription" 
              description="Manage your plan, invoices, and payment methods."
              links={["Updating payment info", "Viewing invoices", "Upgrading your plan"]}
            />
            <SupportCategory 
              icon={Users} 
              title="Employee Management" 
              description="Track attendance, manage payroll, and performance."
              links={["Setting up payroll", "Attendance tracking", "Commission structures"]}
            />
            <SupportCategory 
              icon={LifeBuoy} 
              title="Troubleshooting" 
              description="Resolve common issues with hardware and synchronization."
              links={["Hardware connection issues", "Sync errors", "Offline mode usage"]}
            />
          </div>

          {/* Visual Guides Section */}
          <section className="mb-32">
            <div className="flex items-center justify-between mb-12">
              <h2 className="text-3xl font-bold tracking-tight">Visual Guides</h2>
              <Button variant="link" className="text-[#0071e3] font-bold text-lg p-0 h-auto flex items-center gap-2">
                View all guides <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <VideoCard 
                title="Setting up your OrbitPOS Hub"
                duration="5:24"
                thumbnail="/support_video_1.png"
              />
              <VideoCard 
                title="Mastering Inventory Management"
                duration="8:12"
                thumbnail="/support_video_2.png"
              />
            </div>
          </section>

          {/* Contact CTA */}
          <section className="bg-black text-white rounded-[3rem] p-12 md:p-20 text-center">
            <div className="w-16 h-16 bg-[#0071e3] rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-blue-500/20">
              <MessageCircle className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">Still need help?</h2>
            <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto font-medium">
              Our support team is available 24/7 to help you with any questions or technical issues.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link href="/contact">
                <Button size="lg" className="bg-white text-black hover:bg-gray-100 rounded-full px-12 h-14 text-lg font-bold transition-all">
                  Contact Support
                </Button>
              </Link>
            </div>
          </section>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

function SupportCategory({ icon: Icon, title, description, links }: any) {
  return (
    <div className="p-8 rounded-3xl bg-white border border-gray-100 hover:border-gray-200 hover:shadow-[0_20px_50px_rgba(0,0,0,0.03)] transition-all group">
      <div className="w-12 h-12 rounded-2xl bg-[#f5f5f7] flex items-center justify-center mb-6 group-hover:bg-[#0071e3] transition-colors">
        <Icon className="w-6 h-6 text-black group-hover:text-white transition-colors" />
      </div>
      <h3 className="text-xl font-bold mb-3 tracking-tight">{title}</h3>
      <p className="text-[#86868b] font-medium text-[15px] mb-6 leading-relaxed">{description}</p>
      <div className="space-y-3">
        {links.map((link: string, i: number) => (
          <div key={i} className="flex items-center gap-2 text-[14px] font-semibold text-[#0071e3] cursor-pointer hover:underline">
            {link}
          </div>
        ))}
      </div>
    </div>
  );
}

function VideoCard({ title, duration, thumbnail }: any) {
  return (
    <div className="relative group cursor-pointer overflow-hidden rounded-[2rem] aspect-video bg-gray-100 border border-gray-100 shadow-sm">
      <Image 
        src={thumbnail} 
        alt={title} 
        fill 
        sizes="(max-width: 768px) 100vw, 50vw"
        className="object-cover transition-transform duration-700 group-hover:scale-110" 
      />
      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-colors z-10" />
      <div className="absolute bottom-8 left-8 right-8 z-20 text-white">
        <p className="text-sm font-bold bg-black/40 backdrop-blur-md inline-block px-3 py-1 rounded-full mb-3">{duration}</p>
        <h3 className="text-2xl font-bold tracking-tight drop-shadow-md">{title}</h3>
      </div>
    </div>
  );
}
