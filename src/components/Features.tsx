"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { Shield, MapPin, Clock, Users, Zap, Globe, Smartphone, Bell } from 'lucide-react';
import { Feature } from '../../types';

const features: Feature[] = [
  {
    icon: Shield,
    title: "Elite Encryption",
    description: "AES-256 protocols ensure your data remains accessible only to you."
  },
  {
    icon: MapPin,
    title: "Precision GPS",
    description: "Pinpoint accuracy within 3 meters, updated via premium satellite feeds."
  },
  {
    icon: Clock,
    title: "Legacy History",
    description: "Retain detailed location logs for up to 30 days securely in the cloud."
  },
  {
    icon: Users,
    title: "Private Circles",
    description: "Curate exclusive groups for family or team members with custom rights."
  },
  {
    icon: Zap,
    title: "Instant Alerts",
    description: "Micro-second latency notifications for zone entries and exits."
  },
  {
    icon: Globe,
    title: "Global Roaming",
    description: "Uninterrupted service across 150+ nations without reconfiguration."
  },
  {
    icon: Smartphone,
    title: "Smart Efficiency",
    description: "Optimized algorithms consume negligible battery life during operation."
  },
  {
    icon: Bell,
    title: "Emergency SOS",
    description: "Priority distress signal broadcasting to your chosen emergency contacts."
  }
];

export const Features: React.FC = () => {
  return (
    <section id="features" className="py-32 relative bg-surface border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-end mb-20 pb-10 border-b border-white/10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="max-w-2xl"
          >
            <span className="text-gold-400 font-sans text-xs tracking-[0.2em] uppercase mb-4 block">Capability</span>
            <h2 className="text-4xl md:text-5xl font-serif text-white leading-tight">
              Engineered for <br/>
              <span className="text-gray-500 italic">Perfection.</span>
            </h2>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="mt-6 md:mt-0"
          >
            <p className="text-gray-400 text-sm font-sans max-w-xs leading-relaxed text-right md:text-left">
              Every detail has been meticulously crafted to provide an experience that is as beautiful as it is secure.
            </p>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-white/5 border border-white/5">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              viewport={{ once: true }}
              className="group relative p-10 bg-background hover:bg-surface transition-colors duration-500"
            >
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-gold-400/50 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700" />
              <div className="absolute bottom-0 right-0 w-[1px] h-full bg-gradient-to-b from-transparent via-gold-400/50 to-transparent scale-y-0 group-hover:scale-y-100 transition-transform duration-700" />
              
              <div className="mb-8">
                <feature.icon className="w-8 h-8 text-white group-hover:text-gold-400 transition-colors duration-500 stroke-[1.5]" />
              </div>
              
              <h3 className="text-lg font-serif text-white mb-4 group-hover:text-gold-100 transition-colors">
                {feature.title}
              </h3>
              
              <p className="text-sm text-gray-500 leading-relaxed group-hover:text-gray-400 transition-colors font-sans">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};