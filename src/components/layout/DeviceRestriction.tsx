import React, { useEffect, useState } from 'react';
import { Monitor, Smartphone } from 'lucide-react';
import { APP_NAME, APP_TAGLINE } from '../../config';

interface DeviceRestrictionProps {
  children: React.ReactNode;
}

const isMobilePhone = (): boolean => {
  const userAgent = navigator.userAgent.toLowerCase();
  
  // Check for mobile phone indicators
  const isMobile = /android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  
  // Exclude tablets (iPad, Android tablets)
  const isTablet = /ipad|android(?!.*mobile)/i.test(userAgent);
  
  // Return true only if it's a mobile phone (not a tablet)
  return isMobile && !isTablet;
};

export const DeviceRestriction: React.FC<DeviceRestrictionProps> = ({ children }) => {
  const [isPhone, setIsPhone] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    setIsPhone(isMobilePhone());
    setIsChecking(false);
  }, []);

  // Show nothing while checking to avoid flash
  if (isChecking) {
    return null;
  }

  // Show restriction screen on mobile phones
  if (isPhone) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
        <div className="max-w-md w-full bg-slate-800/50 backdrop-blur-lg rounded-2xl shadow-2xl border border-slate-700/50 p-8 text-center">
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <Monitor className="w-16 h-16 text-purple-400" strokeWidth={1.5} />
              <div className="absolute -bottom-2 -right-2 bg-red-500 rounded-full p-2">
                <Smartphone className="w-6 h-6 text-white" strokeWidth={2} />
              </div>
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-white mb-3">
            {APP_NAME}
          </h1>
          
          <p className="text-purple-300 text-sm mb-6 italic">
            {APP_TAGLINE}
          </p>
          
          <div className="bg-slate-900/50 rounded-xl p-6 mb-6 border border-slate-700/30">
            <h2 className="text-xl font-semibold text-white mb-3">
              Desktop Experience Required
            </h2>
            <p className="text-slate-300 leading-relaxed">
              {APP_NAME} is optimized for desktop and tablet browsers to provide the best brainstorming experience. Please access this app from a larger screen.
            </p>
          </div>
          
          <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
            <Monitor className="w-4 h-4" />
            <span>Desktop & Tablet Only</span>
          </div>
        </div>
      </div>
    );
  }

  // Render the app normally on desktop/tablet
  return <>{children}</>;
};
