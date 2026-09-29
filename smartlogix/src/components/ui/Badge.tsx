import React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'lime' | 'sage' | 'purple' | 'default';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', dot = false, className = '', ...props }) => {
  const variants = {
    success: 'bg-emerald-50/90 backdrop-blur-xs text-emerald-800 border-emerald-200/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.85),0_1px_2px_rgba(16,185,129,0.06)]',
    warning: 'bg-amber-50/90 backdrop-blur-xs text-amber-800 border-amber-200/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.85),0_1px_2px_rgba(245,158,11,0.06)]',
    danger: 'bg-rose-50/90 backdrop-blur-xs text-rose-800 border-rose-200/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.85),0_1px_2px_rgba(244,63,94,0.06)]',
    info: 'bg-sky-50/90 backdrop-blur-xs text-sky-800 border-sky-200/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.85),0_1px_2px_rgba(14,165,233,0.06)]',
    lime: 'bg-brand-lime-soft/90 backdrop-blur-xs text-lime-900 border-lime-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.85),0_1px_2px_rgba(132,204,22,0.08)]',
    sage: 'bg-brand-sage-light/90 backdrop-blur-xs text-brand-sage-deep border-brand-sage/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.85),0_1px_2px_rgba(92,122,107,0.06)]',
    purple: 'bg-purple-50/90 backdrop-blur-xs text-purple-800 border-purple-200/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.85),0_1px_2px_rgba(168,85,247,0.06)]',
    default: 'bg-white/90 backdrop-blur-xs text-brand-text-secondary border-brand-border/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9),0_1px_2px_rgba(19,59,45,0.03)]',
  };

  const dotColors = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    info: 'bg-sky-500',
    lime: 'bg-brand-lime',
    sage: 'bg-brand-sage-deep',
    purple: 'bg-purple-500',
    default: 'bg-brand-text-secondary',
  };

  return (
    <span 
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border tracking-wide transition-colors ${variants[variant]} ${className}`}
      {...props}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]} flex-shrink-0`} />}
      {children}
    </span>
  );
};
