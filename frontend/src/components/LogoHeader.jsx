import { useState } from 'react';
import logo from '../assets/primepre.logo.jpg';
import { FallbackLogo } from '../assets/FallbackLogo';

function LogoHeader() {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center w-full py-1">
      {/* Logo container with explicit dimensions and proper padding */}
      <div className="w-full flex justify-center items-center h-8">
        {!imageError ? (
          <img 
            src={logo} 
            alt="PrimePre Logo" 
            className="h-full max-w-full object-contain" 
            onError={() => {
              console.error("Logo failed to load");
              setImageError(true);
            }}
          />
        ) : (
          <FallbackLogo />
        )}
      </div>
      <div className="w-full mt-1">
        <p className="text-[9px] font-medium text-primary-700 uppercase tracking-wide leading-none text-center">
          Large enough to handle
        </p>
        <p className="text-[9px] font-medium text-primary-700 uppercase tracking-wide leading-none text-center">
          Small enough to care
        </p>
      </div>
    </div>
  );
}

export default LogoHeader;
