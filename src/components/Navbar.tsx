"use client";

import React, { useState, useEffect } from 'react';
import { motion, useScroll } from 'framer-motion';
import { Shield, LogOut } from 'lucide-react'; // Added LogOut for clarity
import { Button } from './ui/Button';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from "next-auth/react";

export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollY } = useScroll();

  const router = useRouter();
  // 1. Next-Auth Session and Status Check
  const { data: session, status } = useSession();
  const isLoggedIn = status === 'authenticated';

  // 2. Combined Auth Action (Sign In/Sign Out)
  const handleAuthAction = () => {
    if (isLoggedIn) {
      signOut({ callbackUrl: window.location.origin + '/' }); 
    } else {
      router.push('/login');
    }
  };

  // 3. Conditional CTA Action (Get Started/Dashboard)
  const handleCtaAction = () => {
    if (isLoggedIn) {
        router.push('/dashboard');
    } else {
        router.push('/login'); // Assuming '/register' or '/signup'
    }
  };

  // 4. Optimized Scroll Listener
  useEffect(() => {
      // Subscribe to changes in the scrollY MotionValue
      return scrollY.onChange((latest) => {
        setIsScrolled(latest > 20);
      });
  }, [scrollY]);

  const isDashboard = typeof window !== 'undefined' && window.location.pathname.startsWith('/dashboard');

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-0 w-full z-50 transition-all duration-500 border-b ${
        isScrolled ? 'glass-nav py-4 border-white/5' : 'bg-transparent py-6 border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex justify-between items-center">
        {/* Logo (clickable link to home) */}
        <a 
          onClick={() => router.push('/')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-8 h-8 flex items-center justify-center border border-gold-400/50 rounded-none transform rotate-45 group-hover:rotate-0 transition-transform duration-500">
             <div className="transform -rotate-45 group-hover:rotate-0 transition-transform duration-500">
                <Shield className="w-4 h-4 text-gold-400" />
             </div>
          </div>
          <span className="text-xl md:text-2xl font-serif tracking-[0.1em] text-white group-hover:text-gold-300 transition-colors uppercase">
            Guardian
          </span>
        </a>
 
        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-10">
          {isDashboard
            ? [
                { href: '/dashboard', label: 'Overview' },
                { href: '/dashboard/map', label: 'Map' },
                { href: '/dashboard/metrics', label: 'Metrics' },
                { href: '/dashboard/settings', label: 'Settings' },
              ].map((link) => (
                <button
                  key={link.href}
                  onClick={() => router.push(link.href)}
                  className="text-xs font-sans font-medium uppercase tracking-widest text-gray-400 hover:text-gold-400 transition-colors relative group"
                >
                  {link.label}
                  <span className="absolute -bottom-2 left-1/2 w-0 h-[1px] bg-gold-400 transition-all duration-300 group-hover:w-full group-hover:left-0" />
                </button>
              ))
            : ['Features', 'Security', 'Pricing', 'About'].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  className="text-xs font-sans font-medium uppercase tracking-widest text-gray-400 hover:text-gold-400 transition-colors relative group"
                >
                  {item}
                  <span className="absolute -bottom-2 left-1/2 w-0 h-[1px] bg-gold-400 transition-all duration-300 group-hover:w-full group-hover:left-0" />
                </a>
              ))}
        </div>


        {/* Actions */}
        <div className="flex items-center gap-6"> {/* 🔑 Corrected the closing tags */}
          
          {/* 5. Avatar Display */}
          {isLoggedIn && session?.user?.image && (
            <img 
              src={session.user.image} 
              alt={session.user.name || 'User Avatar'} 
              className="w-8 h-8 rounded-full border border-gold-400 object-cover" 
            />
          )}

          {/* 6. Primary Auth Button (Sign In / Sign Out) */}
          <button 
            onClick={handleAuthAction}
            className="hidden sm:flex items-center gap-2 text-xs font-sans uppercase tracking-widest text-white hover:text-gold-400 transition-colors"
          >
            {isLoggedIn ? (
                <>
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </>
            ) : (
                'Sign In'
            )}
          </button>
          
          {/* 7. CTA Button (Get Started / Go to Dashboard) */}
          <Button 
            variant="outline" 
            onClick={handleCtaAction} 
            className="!py-2 !px-6 !text-xs !border-white/20 hover:!bg-white hover:!text-black hover:!border-white"
          >
            {isLoggedIn ? 'Go to Dashboard' : 'Get Started'}
          </Button>
        </div>
      </div>
    </motion.nav>
  );
};