import { LoginForm } from '@/components/auth/login-form';
import Image from 'next/image';

export default function LoginPage() {
  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-[#f0f0f5]">
      {/* Dynamic Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-gradient-to-br from-[#ff2a85]/30 to-[#8a2be2]/30 rounded-full blur-[100px] mix-blend-multiply animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-gradient-to-tr from-[#00d2ff]/30 to-[#3a7bd5]/30 rounded-full blur-[100px] mix-blend-multiply animate-[pulse_10s_ease-in-out_infinite_1s]" />
        <div className="absolute top-[20%] right-[20%] w-[40%] h-[40%] bg-gradient-to-bl from-[#f9d423]/30 to-[#ff4e50]/30 rounded-full blur-[100px] mix-blend-multiply animate-[pulse_12s_ease-in-out_infinite_2s]" />
      </div>

      {/* Glossy Glass Card Container */}
      <div className="relative z-10 w-full max-w-[440px] mx-auto p-6 animate-in slide-in-from-bottom-10 fade-in duration-1000">
        <div className="relative rounded-[2.5rem] bg-white/40 backdrop-blur-3xl border border-white/60 shadow-[0_8px_40px_rgba(0,0,0,0.08)] overflow-hidden">
          {/* Inner Gloss Highlights */}
          <div className="absolute inset-0 rounded-[2.5rem] border border-white/80 pointer-events-none" style={{ clipPath: 'inset(0 0 auto 0)' }} />
          <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
          
          <div className="p-10 relative z-20">
            <div className="mb-8 text-center">
              <Image 
                src="/logo.png" 
                alt="OrbitPOS Logo" 
                width={180} 
                height={60} 
                className="mx-auto mb-6 transform hover:scale-105 transition-transform duration-500" 
              />
              <p className="text-[14px] text-[#505055] font-medium">
                Sign in to your workspace
              </p>
            </div>
            
            <LoginForm variant="transparent" theme="light" />
          </div>
        </div>
      </div>
    </div>
  );
}
