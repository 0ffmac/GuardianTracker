import React from 'react';
import { ArrowRight } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'gold';
  icon?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  icon = false,
  className = '',
  ...props 
}) => {
  const baseStyles = "relative px-8 py-3 font-sans text-sm tracking-[0.15em] uppercase transition-all duration-500 flex items-center justify-center gap-3 overflow-hidden group";
  
  const variants = {
    primary: "bg-white text-black hover:bg-gold-100 hover:text-black",
    gold: "bg-gold-400 text-black hover:bg-white hover:text-black",
    secondary: "bg-white/5 text-white backdrop-blur-sm hover:bg-white/10",
    outline: "border border-white/30 text-white hover:border-gold-400 hover:text-gold-400"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      <span className="relative z-10 flex items-center gap-2">
        {children}
        {icon && (
          <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
        )}
      </span>
    </button>
  );
};