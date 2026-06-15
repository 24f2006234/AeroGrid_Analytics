import React from 'react';

interface MonoTextProps {
  children: React.ReactNode;
  className?: string;
}

export const MonoText: React.FC<MonoTextProps> = ({ children, className = '' }) => {
  return (
    <span className={`font-mono tracking-tight tabular-nums ${className}`}>
      {children}
    </span>
  );
};
