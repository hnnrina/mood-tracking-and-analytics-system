// src/components/MindTrackLogo.jsx
import React from 'react';

const MindTrackLogo = ({ showText = true, className = "" }) => {
  return (
    <div 
      className={className} 
      style={{ 
        display: 'flex', 
        flexDirection: 'column', // Stacks the icon above the text
        alignItems: 'center', 
        justifyContent: 'center',
        gap: '8px',
        textAlign: 'center',
        fontFamily: "'Segoe UI', Roboto, sans-serif" 
      }}
    >
      {/* Logo Mark (Icon) - Scaled down down cleanly */}
      <svg 
        viewBox="0 0 100 100" 
        style={{ height: '48px', width: 'auto' }} // Adjusted height to make it smaller
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="mindTrackGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4F46E5" /> 
            <stop offset="50%" stopColor="#06B6D4" /> 
            <stop offset="100%" stopColor="#10B981" /> 
          </linearGradient>
        </defs>

        {/* Abstract Background Ring */}
        <circle cx="50" cy="50" r="44" fill="none" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3 3" />
        
        {/* The Mind Cloud Outline */}
        <path 
          d="M 28 65 
             C 12 65, 12 45, 25 40 
             C 20 20, 45 12, 55 22 
             C 70 10, 88 25, 80 45 
             C 90 55, 80 70, 68 68" 
          fill="none" 
          stroke="#94A3B8" 
          strokeWidth="3.5" 
          strokeLinecap="round"
        />

        {/* The "Track" Analytical Trendline */}
        <path 
          d="M 25 65 L 42 52 L 58 58 L 78 38" 
          fill="none" 
          stroke="url(#mindTrackGrad)" 
          strokeWidth="5" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />

        {/* Interconnected Nodes */}
        <circle cx="25" cy="65" r="4.5" fill="#4F46E5" stroke="#FFFFFF" strokeWidth="1.5" />
        <circle cx="42" cy="52" r="4.5" fill="#2563EB" stroke="#FFFFFF" strokeWidth="1.5" />
        <circle cx="58" cy="58" r="4.5" fill="#06B6D4" stroke="#FFFFFF" strokeWidth="1.5" />
        <circle cx="78" cy="38" r="5.5" fill="#10B981" stroke="#FFFFFF" strokeWidth="1.5" />
      </svg>

      {/* Typography Layout */}
      {showText && (
        <span style={{ fontSize: '22px', fontWeight: '700', color: '#4a4e69', letterSpacing: '-0.02em', lineHeight: '1.2' }}>
          Mind<span style={{ color: '#81b29a', fontWeight: '900' }}>Track</span>
          
          {/* FRIENDLIER TAGLINE SUBTITLE */}
          <span style={{ 
            display: 'block', 
            fontSize: '11px', 
            textTransform: 'uppercase', 
            letterSpacing: '1.5px', 
            color: '#8d99ae', 
            fontWeight: '600', 
            marginTop: '4px' 
          }}>
            Your Wellness Companion
          </span>
        </span>
      )}
    </div>
  );
};

export default MindTrackLogo;