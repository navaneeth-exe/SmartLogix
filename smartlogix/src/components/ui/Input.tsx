import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && <label className="text-xs font-semibold uppercase tracking-wider text-brand-text-secondary">{label}</label>}
        <div className="relative">
          {icon && (
            <div className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-brand-text-secondary pointer-events-none">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`w-full bg-white/85 backdrop-blur-xs border ${
              error 
                ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-400/10' 
                : 'border-brand-border/90 focus:border-brand-primary hover:border-brand-sage focus:ring-brand-primary/10'
            } rounded-xl ${icon ? 'pl-10' : 'pl-3.5'} pr-3.5 py-2 text-sm focus:outline-none focus:ring-4 text-brand-text shadow-[inset_0_1px_2px_0_rgba(19,59,45,0.04)] transition-all placeholder:text-brand-text-muted/60 disabled:opacity-60 disabled:bg-brand-surface/70 ${className}`}
            {...props}
          />
        </div>
        {error && <span className="text-xs text-rose-500 font-medium">{error}</span>}
      </div>
    );
  }
);
Input.displayName = 'Input';
