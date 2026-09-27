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
        {label && <label className="text-sm font-medium text-brand-text">{label}</label>}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-text-secondary">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`w-full bg-brand-surface border ${error ? 'border-red-500' : 'border-brand-border'} rounded-lg ${icon ? 'pl-10' : 'pl-3'} pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 text-brand-text transition-colors ${className}`}
            {...props}
          />
        </div>
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
    );
  }
);
Input.displayName = 'Input';
