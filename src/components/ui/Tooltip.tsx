import React, { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  delay?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  className,
  delay = 200,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  // Triangle indicator
  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 -mt-1 border-t-zinc-800',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 -mb-1 border-b-zinc-800',
    left: 'left-full top-1/2 -translate-y-1/2 -ml-1 border-l-zinc-800',
    right: 'right-full top-1/2 -translate-y-1/2 -mr-1 border-r-zinc-800',
  };

  const arrowBaseClasses = 'absolute w-0 h-0 border-4 border-transparent';

  return (
    <div
      className={clsx('relative inline-flex items-center group/tooltip', className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isVisible && (
        <div
          className={clsx(
            'absolute z-[999] px-2.5 py-1.5 text-[10px] font-bold text-zinc-100 bg-zinc-800 border border-zinc-700/50 rounded-lg shadow-2xl backdrop-blur-md whitespace-nowrap pointer-events-none transition-all duration-200',
            positionClasses[position]
          )}
          style={{ animation: 'tooltip-in 0.15s ease-out' }}
        >
          {content}
          <div className={clsx(arrowBaseClasses, arrowClasses[position])} />
        </div>
      )}
      <style>{`
        @keyframes tooltip-in {
          from { opacity: 0; transform: scale(0.95) \${position === 'top' || position === 'bottom' ? 'translateX(-50%)' : 'translateY(-50%)'}; }
          to { opacity: 1; transform: scale(1) \${position === 'top' || position === 'bottom' ? 'translateX(-50%)' : 'translateY(-50%)'}; }
        }
      `}</style>
    </div>
  );
};
