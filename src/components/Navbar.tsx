"use client";

import React, { useState, useEffect } from 'react';
import { motion, useScroll } from 'framer-motion';
import { Shield, LogOut, Menu, X } from 'lucide-react';
import { Button } from './ui/Button';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from "next-auth/react";

export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollY } = useScroll();
  const [mobileOpen, setMobileOpen] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const router = useRouter();
  const pathname = usePathname();
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

  const isDashboard = pathname?.startsWith('/dashboard');

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
 
  const dashboardLinks = [
    { href: '/dashboard', label: 'Overview' },
    { href: '/dashboard/map', label: 'Map' },
    { href: '/dashboard/metrics', label: 'Metrics' },
    { href: '/dashboard/analytics', label: 'Analytics' },
    { href: '/dashboard/settings', label: 'Settings' },
  ];
 
  const marketingLinks = [
    { label: 'Features', kind: 'hash' as const, href: '#features' },
    { label: 'Discover', kind: 'route' as const, href: '/discover' },
    { label: 'Pricing', kind: 'route' as const, href: '/pricing' },
    { label: 'About', kind: 'route' as const, href: '/about' },
  ];
 
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
            Guard Royal
          </span>
        </a>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-10">
          {isDashboard
            ? dashboardLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => router.push(link.href)}
                  className="text-xs font-sans font-medium uppercase tracking-widest text-gray-400 hover:text-gold-400 transition-colors relative group"
                >
                  {link.label}
                  <span className="absolute -bottom-2 left-1/2 w-0 h-[1px] bg-gold-400 transition-all duration-300 group-hover:w-full group-hover:left-0" />
                </button>
              ))
            : marketingLinks.map((link) =>
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
              )}
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

          {/* Mobile menu toggle */}
          <button
            type="button"
            className="md:hidden p-2 rounded-lg border border-white/10 text-gray-200 hover:bg-white/5"
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden mt-2 px-4">
          <div className="max-w-7xl mx-auto bg-black/80 border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
            {(isDashboard ? dashboardLinks : marketingLinks).map((link) => (
              'kind' in link && link.kind === 'hash' ? (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="w-full text-left text-xs font-sans font-medium uppercase tracking-widest text-gray-200 hover:text-gold-400"
                >
                  {link.label}
                </a>
              ) : (
                <button
                  key={link.href}
                  onClick={() => {
                    router.push(link.href as string);
                    setMobileOpen(false);
                  }}
                  className="w-full text-left text-xs font-sans font-medium uppercase tracking-widest text-gray-200 hover:text-gold-400"
                >
                  {link.label}
                </button>
              )
            ))}

            <div className="border-t border-white/10 pt-3 mt-1 flex flex-col gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  handleCtaAction();
                  setMobileOpen(false);
                }}
                className="!py-2 !px-4 !text-xs !border-white/20 hover:!bg-white hover:!text-black hover:!border-white w-full"
              >
                {isLoggedIn ? 'Dashboard' : 'Get Started'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </motion.nav>
  );
};
