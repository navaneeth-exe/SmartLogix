import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'lime' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  fullWidth = false,
  loading = false,
  className = '', 
  disabled, 
  ...props 
}) => {
  const baseStyle = "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]";
  
  const variants = {
    primary: "bg-brand-primary text-white hover:bg-brand-active focus:ring-brand-primary/40 tactile-button shadow-soft-sm font-semibold",
    secondary: "bg-white/80 hover:bg-white text-brand-text border border-brand-border/80 hover:border-brand-primary/30 shadow-[inset_0_1px_0_0_#ffffff,0_1px_3px_0_rgba(19,59,45,0.05)] hover:shadow-soft-sm active:shadow-[inset_0_1px_2px_rgba(19,59,45,0.08)] focus:ring-brand-primary/30 backdrop-blur-xs font-semibold",
    outline: "bg-white/70 hover:bg-white border border-brand-border text-brand-text hover:border-brand-primary/40 shadow-soft-xs hover:shadow-soft-sm active:shadow-[inset_0_1px_2px_rgba(19,59,45,0.06)] focus:ring-brand-border backdrop-blur-xs font-medium",
    danger: "bg-rose-50/90 hover:bg-rose-100/90 text-rose-700 border border-rose-200/90 shadow-soft-xs hover:shadow-soft-sm active:shadow-[inset_0_1px_2px_rgba(225,29,72,0.1)] focus:ring-rose-400/30 backdrop-blur-xs font-semibold",
    lime: "bg-brand-lime text-brand-dark font-bold hover:bg-lime-400 shadow-[0_2px_8px_rgba(132,204,22,0.35),inset_0_1px_0_0_rgba(255,255,255,0.4)] focus:ring-brand-lime/50",
    ghost: "bg-transparent hover:bg-brand-surface/80 text-brand-text-secondary hover:text-brand-text border border-transparent shadow-none focus:ring-brand-primary/20",
  };
  
  const sizes = {
    sm: "px-3 py-1.5 text-xs font-semibold gap-1.5",
    md: "px-4 py-2 text-sm gap-2",
    lg: "px-6 py-2.5 text-base gap-2.5",
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5 flex-shrink-0" />
      )}
      {children}
    </button>
  );
};
