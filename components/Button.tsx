import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'secondary', 
  icon,
  className = '',
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-sm text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-black text-white hover:bg-gray-800 focus:ring-gray-900 border border-transparent dark:bg-white dark:text-black dark:hover:bg-gray-200",
    secondary: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 focus:ring-gray-200 dark:bg-dark-inner dark:text-gray-300 dark:border-gray-700 dark:hover:bg-[#2d333b] dark:focus:ring-gray-700",
    ghost: "text-gray-500 hover:text-gray-900 hover:bg-gray-100/50 focus:ring-gray-200 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-white/5"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {icon && <span className="w-4 h-4">{icon}</span>}
      {children}
    </button>
  );
};