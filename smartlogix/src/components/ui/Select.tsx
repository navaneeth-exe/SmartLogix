import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = '', ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && <label className="text-xs font-semibold uppercase tracking-wider text-brand-text-secondary">{label}</label>}
        <select
          ref={ref}
          className={`w-full bg-white/85 backdrop-blur-xs border ${
            error 
              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-400/10' 
              : 'border-brand-border/90 focus:border-brand-primary hover:border-brand-sage focus:ring-brand-primary/10'
          } rounded-xl pl-3.5 pr-8 py-2 text-sm focus:outline-none focus:ring-4 text-brand-text shadow-[inset_0_1px_2px_0_rgba(19,59,45,0.04)] transition-all appearance-none disabled:opacity-60 disabled:bg-brand-surface/70 ${className}`}
          style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%234D7C5D' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.65rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.25em 1.25em' }}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {error && <span className="text-xs text-rose-500 font-medium">{error}</span>}
      </div>
    );
  }
);
Select.displayName = 'Select';
