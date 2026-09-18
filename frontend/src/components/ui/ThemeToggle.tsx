import React from 'react';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../../contexts/ThemeContext';

interface ThemeToggleProps {
  variant?: 'default' | 'minimal';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showLabel?: boolean;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  variant = 'default', 
  size = 'md', 
  className = '',
  showLabel = false 
}) => {
  const { theme, toggleTheme } = useTheme();

  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'w-8 h-8';
      case 'md': return 'w-10 h-10';
      case 'lg': return 'w-12 h-12';
      default: return 'w-10 h-10';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm': return 'h-4 w-4';
      case 'md': return 'h-5 w-5';
      case 'lg': return 'h-6 w-6';
      default: return 'h-5 w-5';
    }
  };

  const baseClasses = `
    ${getSizeClasses()} 
    rounded-lg 
    flex items-center justify-center 
    transition-all duration-200 
    focus:outline-none 
    focus:ring-2 
    focus:ring-offset-1
  `;

  const variantClasses = variant === 'minimal' 
    ? `
      text-gray-500 dark:text-gray-400 
      hover:text-gray-700 dark:hover:text-gray-200 
      hover:bg-gray-100 dark:hover:bg-gray-800
      focus:ring-gray-300 dark:focus:ring-gray-600
    `
    : `
      bg-white dark:bg-gray-800 
      text-gray-600 dark:text-gray-300
      border border-gray-200 dark:border-gray-600
      hover:bg-gray-50 dark:hover:bg-gray-700
      hover:text-gray-800 dark:hover:text-gray-100
      focus:ring-blue-300 dark:focus:ring-blue-600
      shadow-sm hover:shadow-md
    `;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={toggleTheme}
        className={`${baseClasses} ${variantClasses}`}
        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      >
        {theme === 'light' ? (
          <MoonIcon className={getIconSize()} />
        ) : (
          <SunIcon className={getIconSize()} />
        )}
      </button>
      
      {showLabel && (
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
        </span>
      )}
    </div>
  );
};

export default ThemeToggle;