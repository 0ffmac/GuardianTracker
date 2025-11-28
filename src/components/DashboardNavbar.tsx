"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Shield } from "lucide-react";

const tabs = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/map", label: "Map" },
  { href: "/dashboard/metrics", label: "Metrics" },
];

export default function DashboardNavbar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="fixed top-0 w-full z-50 transition-all duration-500 glass-nav py-4 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex justify-between items-center">
        {/* Reuse main logo style */}
        <button
          type="button"
          onClick={() => router.push("/")}
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
        </button>

        {/* Dashboard tabs */}
        <div className="flex gap-2">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-4 py-2 rounded-lg text-xs font-sans uppercase tracking-widest transition-colors duration-150 border ${
                  isActive
                    ? "bg-gold-500 text-black border-gold-500 shadow"
                    : "text-gray-300 border-white/10 hover:bg-gold-900/40 hover:text-gold-100 hover:border-gold-400/60"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
