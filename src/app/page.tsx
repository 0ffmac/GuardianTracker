"use client";
import React from 'react';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { Features } from '@/components/Features';
import { Footer } from '@/components/Footer';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { ArrowRight } from 'lucide-react';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-white selection:bg-gold-500/30 selection:text-gold-200">
      <Navbar />
      
      <main>
        <Hero />
        <Features />
        
        {/* Luxury CTA Section */}
        <section className="py-32 px-6 relative overflow-hidden bg-background">
          <div className="max-w-7xl mx-auto relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 1 }}
              viewport={{ once: true }}
              className="relative border border-white/10 bg-surface p-12 md:p-24 text-center overflow-hidden group"
            >
              {/* Gold border accents on hover */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gold-400 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-1000" />
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gold-400 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-1000 delay-100" />
              
              <div className="relative z-10 flex flex-col items-center">
                <h2 className="text-4xl md:text-6xl font-serif mb-6 text-white tracking-tight">
                  Uncompromised Security
                </h2>
                <div className="w-24 h-[1px] bg-gold-400/50 mb-8" />
                <p className="text-lg text-gray-400 mb-12 max-w-xl mx-auto font-sans font-light leading-relaxed">
                  Join an exclusive network of individuals who prioritize safety above all else. Your peace of mind begins here.
                </p>
                <div className="flex flex-col sm:flex-row gap-6">
                   <Button variant="primary" className="min-w-[180px]">
                      Start Trial
                   </Button>
                   <Button variant="outline" className="min-w-[180px]">
                      Contact Sales
                   </Button>
                </div>
              </div>

              {/* Background gradient effects */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gold-400/5 rounded-full blur-[100px] -z-10 pointer-events-none" />
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default App;