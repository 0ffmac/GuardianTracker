import React from 'react';
import Link from 'next/link';
import { Shield, Twitter, Facebook, Instagram, Linkedin, ArrowUpRight } from 'lucide-react';
import { useLanguage } from "@/hooks/useLanguage";
 
 // Helper function to convert item names with spaces into valid URL slugs (e.g., "Privacy Policy" -> "privacy-policy")
 const createSlug = (item: string): string => item.toLowerCase().replace(/\s+/g, '-');
 
 export const Footer: React.FC = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-background border-t border-white/10 pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-6">
        
        <div className="grid md:grid-cols-12 gap-12 mb-20">
          <div className="md:col-span-5 space-y-8">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-white" />
              <span className="text-2xl font-serif text-white tracking-widest">GUARD ROYAL</span>
            </div>
             <p className="text-gray-400 text-sm leading-7 max-w-sm font-sans">
               {t('footer.slogan')}
             </p>

            <div className="flex gap-4">
              {[Twitter, Facebook, Instagram, Linkedin].map((Icon, i) => (
                <a 
                  key={i} 
                  href="#" 
                  className="w-10 h-10 border border-white/10 flex items-center justify-center hover:border-gold-400 hover:text-gold-400 transition-all duration-300 text-white"
                  aria-label={`Link to ${Icon.name} profile`}
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

           {/* Sitemap Links - Now using Link component for client-side navigation */}
           <div className="md:col-span-2">
            <h4 className="text-white font-sans text-xs uppercase tracking-[0.2em] mb-8">{t('footer.sitemapTitle')}</h4>
            <ul className="space-y-4 text-sm text-gray-500 font-sans">
              {[
                { slug: 'features', labelKey: 'footer.sitemap.features' },
                { slug: 'discover', labelKey: 'footer.sitemap.discover' },
                { slug: 'pricing', labelKey: 'footer.sitemap.pricing' },
                { slug: 'about', labelKey: 'footer.sitemap.about' },
              ].map((item) => (
                <li key={item.slug}>
                  <Link href={`/${item.slug}`} legacyBehavior>
                    <a className="hover:text-white transition-colors block py-1">{t(item.labelKey)}</a>
                  </Link>
                </li>
              ))}
            </ul>
           </div>


           {/* Legal Links - FIXED: Correctly implemented Link component */}
           <div className="md:col-span-2">
            <h4 className="text-white font-sans text-xs uppercase tracking-[0.2em] mb-8">{t('footer.legalTitle')}</h4>
            <ul className="space-y-4 text-sm text-gray-500 font-sans">
              {[
                { slug: createSlug('Privacy Policy'), labelKey: 'footer.legal.privacy' },
                { slug: createSlug('Terms of Service'), labelKey: 'footer.legal.terms' },
                { slug: createSlug('Cookie Policy'), labelKey: 'footer.legal.cookies' },
                { slug: createSlug('Licenses'), labelKey: 'footer.legal.licenses' },
              ].map((item) => (
                <li key={item.slug}>
                  <Link href={`/${item.slug}`} legacyBehavior>
                    <a className="hover:text-white transition-colors block py-1">{t(item.labelKey)}</a>
                  </Link>
                </li>
              ))}
            </ul>
           </div>


           <div className="md:col-span-3">
            <h4 className="text-white font-sans text-xs uppercase tracking-[0.2em] mb-8">{t('footer.newsletterTitle')}</h4>
             <div className="relative">
               <input 
                 type="email" 
                placeholder={t('footer.newsletter.placeholder')} 
                 className="bg-transparent border-b border-white/20 py-3 text-sm text-white focus:outline-none focus:border-gold-400 w-full placeholder-gray-700 font-sans tracking-wide"
               />
               <button 
                 className="absolute right-0 top-3 text-white hover:text-gold-400 transition-colors"
                aria-label={t('footer.newsletter.aria')}
               >

                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

         <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-600 font-sans tracking-wide uppercase">
           <p>© 2024 Guard Royal Systems Inc.</p>
          <p>{t('footer.designedFor')}</p>
         </div>

      </div>
    </footer>
  );
};