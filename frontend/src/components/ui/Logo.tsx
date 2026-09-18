import React from 'react';

interface LogoProps {
  variant?: 'full' | 'icon';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ variant = 'full', size = 'md', className = '' }) => {
  const getSizeClasses = () => {
    if (variant === 'icon') {
      switch (size) {
        case 'sm': return 'w-8 h-8';
        case 'md': return 'w-10 h-10';
        case 'lg': return 'w-12 h-12';
        case 'xl': return 'w-16 h-16';
        default: return 'w-10 h-10';
      }
    } else {
      switch (size) {
        case 'sm': return 'h-8';
        case 'md': return 'h-10';
        case 'lg': return 'h-12';
        case 'xl': return 'h-16';
        default: return 'h-10';
      }
    }
  };

  if (variant === 'icon') {
    return (
      <svg 
        className={`${getSizeClasses()} ${className}`}
        viewBox="0 0 80 80" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1"/>
            <stop offset="50%" stopColor="#8b5cf6"/>
            <stop offset="100%" stopColor="#06b6d4"/>
          </linearGradient>
          <filter id="softShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15"/>
          </filter>
        </defs>
        
        <rect x="4" y="4" width="72" height="72" rx="18" ry="18" 
              fill="url(#iconGradient)" filter="url(#softShadow)"/>
        
        <g fill="white">
          <rect x="20" y="22" width="7" height="36" rx="1.5"/>
          <rect x="20" y="22" width="24" height="7" rx="1.5"/>
          <rect x="20" y="36.5" width="18" height="6" rx="1.5"/>
          <rect x="20" y="51" width="24" height="7" rx="1.5"/>
          
          <circle cx="48" cy="25.5" r="2.5" fill="#10b981"/>
          <circle cx="42" cy="39.5" r="2" fill="#06b6d4"/>
          <circle cx="48" cy="54.5" r="2.5" fill="#10b981"/>
        </g>
      </svg>
    );
  }

  return (
    <svg 
      className={`${getSizeClasses()} ${className}`}
      viewBox="0 0 480 120" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="iconGradientFull" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1"/>
          <stop offset="50%" stopColor="#8b5cf6"/>
          <stop offset="100%" stopColor="#06b6d4"/>
        </linearGradient>
        
        <linearGradient id="accentGradientFull" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#10b981"/>
          <stop offset="100%" stopColor="#06b6d4"/>
        </linearGradient>
        
        <filter id="softShadowFull" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15"/>
        </filter>
      </defs>

      <rect x="8" y="8" width="64" height="64" rx="16" ry="16" 
            fill="url(#iconGradientFull)" filter="url(#softShadowFull)"/>
      
      <g fill="white">
        <rect x="22" y="24" width="6" height="32" rx="1"/>
        <rect x="22" y="24" width="20" height="6" rx="1"/>
        <rect x="22" y="37" width="16" height="5" rx="1"/>
        <rect x="22" y="50" width="20" height="6" rx="1"/>
        
        <circle cx="46" cy="27" r="2" fill="#10b981"/>
        <circle cx="42" cy="39.5" r="1.5" fill="#06b6d4"/>
        <circle cx="46" cy="53" r="2" fill="#10b981"/>
      </g>

      <g fontFamily="system-ui, -apple-system, sans-serif">
        <text x="88" y="45" fontWeight="700" fontSize="32" fill="#1f2937" letterSpacing="-0.5px">Evolu</text>
        <text x="205" y="45" fontWeight="800" fontSize="32" fill="url(#accentGradientFull)" letterSpacing="-0.5px">X</text>
        <text x="230" y="45" fontWeight="700" fontSize="32" fill="#1f2937" letterSpacing="-0.5px">ion</text>
      </g>

      <text x="88" y="62" fontFamily="system-ui, -apple-system, sans-serif" 
            fontWeight="500" fontSize="14" fill="#6b7280" letterSpacing="2px">
        WORKFORCE SOLUTIONS
      </text>

      <rect x="88" y="70" width="60" height="2" rx="1" fill="url(#accentGradientFull)" opacity="0.6"/>
    </svg>
  );
};

export default Logo;