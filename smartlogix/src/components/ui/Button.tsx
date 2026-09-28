import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'lime';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  fullWidth = false,
  className = '',
  ...props 
}) => {
  const baseStyle = "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]";
  
  const variants = {
    primary: "bg-brand-primary text-white hover:bg-brand-active focus:ring-brand-primary/40 tactile-button",
    secondary: "bg-brand-soft text-brand-text hover:bg-brand-soft/80 border border-brand-primary/20 shadow-soft-sm focus:ring-brand-primary/40",
    outline: "bg-white/80 backdrop-blur-xs border border-brand-border text-brand-text hover:bg-brand-surface hover:border-brand-text-secondary/30 shadow-soft-sm focus:ring-brand-border",
    danger: "bg-red-50 text-red-700 border border-red-200/80 hover:bg-red-100 shadow-soft-sm focus:ring-red-400",
    lime: "bg-brand-lime text-brand-dark font-semibold hover:bg-brand-lime-hover shadow-lime-glow focus:ring-brand-lime/50",
  };
  
  const sizes = {
    sm: "px-3 py-1.5 text-xs font-semibold gap-1.5",
    md: "px-4 py-2 text-sm gap-2",
    lg: "px-6 py-2.5 text-base gap-2.5",
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
