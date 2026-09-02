import React, { useEffect } from 'react';
import { ExternalLink } from 'lucide-react';

interface AdBannerProps {
  adSlot?: string;
  adClient?: string;
  className?: string;
  format?: 'auto' | 'fluid' | 'rectangle';
}

declare global {
  interface Window {
    adsbygoogle?: any[];
  }
}

export const AdBanner: React.FC<AdBannerProps> = ({
  adSlot = '1234567890', // Test/Placeholder ad slot
  adClient = 'ca-pub-0000000000000000', // Test publisher ID (can be replaced with real credentials)
  className = '',
  format = 'auto',
}) => {
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (e) {
      // Ignore adsbygoogle push errors in test/dev environments
      console.debug('AdSense script pending initialization:', e);
    }
  }, []);

  return (
    <div
      id="sidebar-ad-container"
      className={`relative overflow-hidden rounded-lg border border-zinc-800/80 bg-gradient-to-b from-zinc-900/60 to-zinc-950/80 p-2.5 transition-all ${className}`}
    >
      {/* Top micro header */}
      <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800/50 mb-2">
        <span className="text-[9px] font-medium tracking-wider uppercase text-zinc-500 font-mono">
          Sponsored
        </span>
        <span className="text-[9px] text-zinc-600 flex items-center gap-0.5">
          <span>Ad</span>
          <ExternalLink className="w-2.5 h-2.5 text-zinc-600" />
        </span>
      </div>

      {/* Google Adsense Container (Ready for real script) */}
      <div className="min-h-[60px] flex flex-col items-center justify-center text-center">
        {/* Actual Google Ad tag */}
        <ins
          className="adsbygoogle block w-full text-center"
          style={{ display: 'block', minHeight: '50px' }}
          data-ad-client={adClient}
          data-ad-slot={adSlot}
          data-ad-format={format}
          data-full-width-responsive="true"
        />

        {/* Visual Test Placeholder for development / until real ads load */}
        <div className="w-full py-2.5 px-2 rounded bg-zinc-900/40 border border-dashed border-zinc-800 flex flex-col items-center justify-center gap-1">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-blue-500/70 animate-pulse"></span>
            <span className="text-[11px] font-medium text-zinc-300">Google Ads Placement</span>
          </div>
          <p className="text-[10px] text-zinc-500 leading-tight max-w-[200px]">
            Slot ID: <span className="font-mono text-zinc-400">{adSlot}</span>
          </p>
        </div>
      </div>
    </div>
  );
};
