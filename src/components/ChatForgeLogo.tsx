import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'custom';
  title?: string;
}

/**
 * ChatForge Icon: 160x160 blue bubble with orange-red forge lightning spark.
 */
export const ChatForgeIcon: React.FC<LogoProps> = ({
  className = 'w-8 h-8',
  size,
  title = 'ChatForge Logo',
}) => {
  const sizeClasses = {
    xs: 'w-5 h-5',
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    xl: 'w-14 h-14',
    custom: '',
  };

  const finalClass = size && size !== 'custom' ? sizeClasses[size] : className;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 160 160"
      className={`shrink-0 ${finalClass}`}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <desc>Blue chat bubble with an orange-red forge lightning spark.</desc>
      <defs>
        <linearGradient id="cf-bubble-grad" x1="22" y1="18" x2="138" y2="142" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="48%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#4338CA" />
        </linearGradient>
        <linearGradient id="cf-spark-grad" x1="55" y1="30" x2="112" y2="126" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF9D00" />
          <stop offset="48%" stopColor="#FF5A00" />
          <stop offset="100%" stopColor="#EF3030" />
        </linearGradient>
        <linearGradient id="cf-edge-grad" x1="35" y1="25" x2="125" y2="135" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>
        <filter id="cf-shadow-filter" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#0F172A" floodOpacity="0.22" />
        </filter>
      </defs>
      {/* Chat bubble */}
      <path
        d="M48 15h58c22.644 0 41 18.356 41 41v29c0 22.644-18.356 41-41 41H79l-25 18v-18h-6c-22.644 0-41-18.356-41-41V56c0-22.644 18.356-41 41-41Z"
        fill="url(#cf-bubble-grad)"
        stroke="url(#cf-edge-grad)"
        strokeWidth="5"
        strokeLinejoin="round"
        filter="url(#cf-shadow-filter)"
      />
      {/* Bubble highlight */}
      <path
        d="M28 52c5-15 19-25 36-25h38c9 0 17 3 24 7-8-10-20-16-34-16H49c-10 0-19 4-26 10-2 2-3 5-4 8 3-2 6-3 9-4Z"
        fill="#FFFFFF"
        opacity="0.18"
      />
      {/* Forge lightning */}
      <path
        d="M91 21 52 78h26l-8 55 44-70H88Z"
        fill="url(#cf-spark-grad)"
        stroke="#FFFFFF"
        strokeWidth="5"
        strokeLinejoin="round"
        filter="url(#cf-shadow-filter)"
      />
      {/* Spark highlight */}
      <path
        d="m89 29-27 44h18l-4 25 29-47H85Z"
        fill="#FFFFFF"
        opacity="0.16"
      />
    </svg>
  );
};

/**
 * ChatForge Wordmark: Custom Stylized Wordmark from ChatForge Brand Assets.
 * "Chat" in vivid orange-red gradient, "Forge" in electric-to-royal blue gradient
 * with the signature lightning bolt inscribed inside the letter 'o'.
 */
export const ChatForgeWordmark: React.FC<{
  className?: string;
  textColor?: string;
}> = ({ className = 'h-7 w-auto' }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 505 110"
      className={`shrink-0 ${className}`}
      role="img"
      aria-label="ChatForge"
    >
      <title>ChatForge</title>
      <defs>
        <linearGradient id="cf-wordmark-orange" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FF4200" />
          <stop offset="45%" stopColor="#FF5C00" />
          <stop offset="100%" stopColor="#FF7D00" />
        </linearGradient>
        <linearGradient id="cf-wordmark-blue" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0088FF" />
          <stop offset="50%" stopColor="#0066FF" />
          <stop offset="100%" stopColor="#0044FF" />
        </linearGradient>
        <linearGradient id="cf-wordmark-bolt" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#007CF0" />
          <stop offset="100%" stopColor="#0048E6" />
        </linearGradient>
      </defs>

      {/* "Chat" in Orange Gradient */}
      <text
        x="6"
        y="85"
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
        fontSize="96"
        fontWeight="900"
        letterSpacing="-3.5"
        fill="url(#cf-wordmark-orange)"
      >
        Chat
      </text>

      {/* "F" in Blue Gradient */}
      <text
        x="228"
        y="85"
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
        fontSize="96"
        fontWeight="900"
        letterSpacing="-2"
        fill="url(#cf-wordmark-blue)"
      >
        F
      </text>

      {/* 'o' with embedded white badge & lightning bolt */}
      <g transform="translate(310, 60.5)">
        {/* Outer blue circular body */}
        <circle cx="0" cy="0" r="25.5" fill="url(#cf-wordmark-blue)" />
        {/* Inner white circle */}
        <circle cx="0" cy="0" r="16" fill="#FFFFFF" />
        {/* Inner electric lightning bolt */}
        <path
          d="M2.5 -11.5 L-6 1.5 H0 L-2.5 11.5 L6.5 -1.5 H0.5 Z"
          fill="url(#cf-wordmark-bolt)"
          strokeLinejoin="round"
        />
      </g>

      {/* "rge" in Blue Gradient */}
      <text
        x="342"
        y="85"
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
        fontSize="96"
        fontWeight="900"
        letterSpacing="-3.5"
        fill="url(#cf-wordmark-blue)"
      >
        rge
      </text>
    </svg>
  );
};

/**
 * ChatForge Combined Logo (Icon + Wordmark): 680x150
 */
export const ChatForgeLogo: React.FC<{
  className?: string;
  textColor?: string;
}> = ({ className = 'h-10 w-auto' }) => {
  return (
    <div className={`inline-flex items-center gap-3 shrink-0 ${className}`}>
      <ChatForgeIcon className="h-full w-auto aspect-square drop-shadow-md" />
      <ChatForgeWordmark className="h-full w-auto" />
    </div>
  );
};
