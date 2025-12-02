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

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

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

  // 5. Load latest profile avatar for navbar
  useEffect(() => {
    if (!isLoggedIn || !session?.user) {
      setAvatarUrl(null);
      return;
    }
    const id = (session.user as any).id;
    if (!id) return;

    const loadProfile = async () => {
      try {
        const res = await fetch(`/api/user/${id}`);
        if (!res.ok) return;
        const data = await res.json();
        console.log("Navbar profile data:", data);
        if (typeof data.image === "string" && data.image.length > 0) {
          setAvatarUrl(data.image);
        }
      } catch (err) {
        console.error("Failed to load navbar profile", err);
      }
    };

    loadProfile();
  }, [isLoggedIn, session?.user]);

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
            : [
                { label: 'Features', kind: 'hash', href: '#features' },
                { label: 'Discover', kind: 'route', href: '/discover' },
                { label: 'Pricing', kind: 'route', href: '/pricing' },
                { label: 'About', kind: 'route', href: '/about' },
              ].map((link) => (
                link.kind === 'route' ? (
                  <button
                    key={link.label}
                    onClick={() => router.push(link.href)}
                    className="text-xs font-sans font-medium uppercase tracking-widest text-gray-400 hover:text-gold-400 transition-colors relative group"
                  >
                    {link.label}
                    <span className="absolute -bottom-2 left-1/2 w-0 h-[1px] bg-gold-400 transition-all duration-300 group-hover:w-full group-hover:left-0" />
                  </button>
                ) : (
                  <a
                    key={link.label}
                    href={link.href}
                    className="text-xs font-sans font-medium uppercase tracking-widest text-gray-400 hover:text-gold-400 transition-colors relative group"
                  >
                    {link.label}
                    <span className="absolute -bottom-2 left-1/2 w-0 h-[1px] bg-gold-400 transition-all duration-300 group-hover:w-full group-hover:left-0" />
                  </a>
                )
              ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          {/* Avatar Display */}
          {isLoggedIn && (
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center overflow-hidden border border-gold-400">
              {avatarUrl || session?.user?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl || (session.user?.image as string)}
                  alt={session.user?.name || session.user?.email || 'User Avatar'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs font-semibold text-gold-200">
                  {(session.user?.name || session.user?.email || '?')
                    .toString()
                    .trim()
                    .charAt(0)
                    .toUpperCase()}
                </span>
              )}
            </div>
          )}

          {/* Auth Button */}
          <button
            onClick={handleAuthAction}
            className="flex items-center gap-2 text-xs font-sans uppercase tracking-widest text-white hover:text-gold-400 transition-colors"
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

          {/* CTA Button (Get Started / Go to Dashboard) */}
          <div className="hidden sm:block">
            <Button
              variant="outline"
              onClick={handleCtaAction}
              className="!py-2 !px-6 !text-xs !border-white/20 hover:!bg-white hover:!text-black hover:!border-white"
            >
              {isLoggedIn ? 'Dashboard' : 'Get Started'}
            </Button>
          </div>
        </div>
      </div>
    </motion.nav>
  );
};
