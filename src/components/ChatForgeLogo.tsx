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
 * ChatForge Wordmark: 320x80
 */
export const ChatForgeWordmark: React.FC<{
  className?: string;
  textColor?: string;
}> = ({ className = 'h-7 w-auto', textColor = '#F4F4F5' }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 320 80"
      className={`shrink-0 ${className}`}
      role="img"
      aria-label="ChatForge"
    >
      <title>ChatForge</title>
      <defs>
        <linearGradient id="cf-wordmark-forge" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
      </defs>
      <text
        x="10"
        y="55"
        fontFamily="Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fontSize="52"
        fontWeight="750"
        letterSpacing="-2.2"
      >
        <tspan fill={textColor}>Chat</tspan>
        <tspan fill="url(#cf-wordmark-forge)">Forge</tspan>
      </text>
    </svg>
  );
};

/**
 * ChatForge Combined Logo (Icon + Wordmark): 520x150
 */
export const ChatForgeLogo: React.FC<{
  className?: string;
  textColor?: string;
}> = ({ className = 'h-10 w-auto', textColor = '#F4F4F5' }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 520 150"
      className={`shrink-0 ${className}`}
      role="img"
      aria-label="ChatForge Logo"
    >
      <title>ChatForge logo</title>
      <desc>A chat bubble containing a forge-style lightning spark, followed by the ChatForge wordmark.</desc>
      <defs>
        <linearGradient id="cf-combo-bubble" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#4F46E5" />
        </linearGradient>
        <linearGradient id="cf-combo-spark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FF8A00" />
          <stop offset="100%" stopColor="#EF4444" />
        </linearGradient>
      </defs>
      {/* Icon */}
      <g transform="translate(12 10)">
        {/* speech bubble */}
        <path
          d="M56 8h60c27.6 0 50 22.4 50 50v25c0 27.6-22.4 50-50 50H82l-25 17v-17H56c-27.6 0-50-22.4-50-50V58C6 30.4 28.4 8 56 8Z"
          fill="url(#cf-combo-bubble)"
        />
        {/* subtle inner chat highlight */}
        <path
          d="M31 34c9-10 22-16 37-16h44c10 0 20 3 28 8-9-13-24-21-41-21H56c-18 0-33 7-42 19 5-2 11-3 17-3Z"
          fill="#fff"
          opacity="0.14"
        />
        {/* forge spark / lightning */}
        <path
          d="M94 20 54 82h29l-8 38 43-62H90Z"
          fill="url(#cf-combo-spark)"
          stroke="#fff"
          strokeWidth="5"
          strokeLinejoin="round"
        />
      </g>
      {/* Wordmark */}
      <g
        fontFamily="Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fontSize="54"
        fontWeight="750"
        letterSpacing="-2"
      >
        <text x="190" y="91" fill={textColor}>
          Chat
        </text>
        <text x="319" y="91" fill="#4F46E5">
          Forge
        </text>
      </g>
    </svg>
  );
};
