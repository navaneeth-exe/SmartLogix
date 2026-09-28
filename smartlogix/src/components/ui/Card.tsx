import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  noPadding?: boolean;
  glass?: boolean;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  noPadding = false, 
  glass = false,
  hoverable = false,
  ...props 
}) => {
  const surfaceClass = glass ? 'glass-panel' : 'soft-card';
  const hoverClass = hoverable ? 'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft-lg' : '';

  return (
    <div 
      className={`${surfaceClass} rounded-2xl ${noPadding ? '' : 'p-6'} ${hoverClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className = '', ...props }) => (
  <div className={`mb-4 flex items-center justify-between ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ children, className = '', ...props }) => (
  <h3 className={`text-lg font-bold text-brand-text ${className}`} {...props}>
    {children}
  </h3>
);
