// src/components/MoodVectors.jsx
import React from 'react';

// Common base vector component ensuring unified canvas rules
const VectorWrapper = ({ children, color }) => (
  <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <circle cx="18" cy="18" r="16" fill="currentColor" fillOpacity="0.1" />
    {children}
  </svg>
);

export const MoodVectors = {
  1: ({ color = '#e53e3e' }) => (
    <VectorWrapper color={color}>
      {/* Very Sad: Downcast eyes and down-curved frown */}
      <path d="M12 15L15 17M24 15L21 17" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M13 25.5C14.5 22.5 17.5 22 18 22C18.5 22 21.5 22.5 23 25.5" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </VectorWrapper>
  ),
  2: ({ color = '#dd6b20' }) => (
    <VectorWrapper color={color}>
      {/* Sad: Steady lower eyes with flat-curved frown */}
      <circle cx="13" cy="16" r="2" fill={color} />
      <circle cx="23" cy="16" r="2" fill={color} />
      <path d="M14 24C15.5 22.2 17 21.8 18 21.8C19 21.8 20.5 22.2 22 24" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </VectorWrapper>
  ),
  3: ({ color = '#4a5568' }) => (
    <VectorWrapper color={color}>
      {/* Neutral: Plain horizontal expression bar */}
      <circle cx="13" cy="16" r="2" fill={color} />
      <circle cx="23" cy="16" r="2" fill={color} />
      <line x1="13" y1="23" x2="23" y2="23" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </VectorWrapper>
  ),
  4: ({ color = '#38a169' }) => (
    <VectorWrapper color={color}>
      {/* Happy: Smooth open smile line */}
      <path d="M11 15C12 13.8 13.5 13.5 14 13.5C14.5 13.5 16 13.8 17 15M19 15C20 13.8 21.5 13.5 22 13.5C22.5 13.5 24 13.8 25 15" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M12 21C13.5 24 16.5 24.5 18 24.5C19.5 24.5 22.5 24 24 21" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </VectorWrapper>
  ),
  5: ({ color = '#81b29a' }) => (
    <VectorWrapper color={color}>
      {/* Very Happy: Radiant upturned eyes with open grin arc */}
      <path d="M10 16C11 14.5 12.5 14 13.5 14C14.5 14 16 14.5 17 16M19 16C20 14.5 21.5 14 22.5 14C23.5 14 25 14.5 26 16" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M11 21C12.5 25.5 15.5 26 18 26C20.5 26 23.5 25.5 25 21H11Z" fill={color} stroke={color} strokeWidth="1" strokeLinejoin="round" />
    </VectorWrapper>
  )
};

// Sleek Nav Icon Vector components mapping
export const NavIcons = {
  Calendar: () => (
    <svg className="nav-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
  ),
  AddEntry: () => (
    <svg className="nav-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
  ),
  History: () => (
    <svg className="nav-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
  ),
  Analytics: () => (
    <svg className="nav-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
  ),
  MenuToggle: () => (
    <svg style={{ width: '20px', height: '20px', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }} viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
  )
};

export const DashboardIcons = {
  Insights: () => (
    <svg style={{ width: '20px', height: '20px', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }} viewBox="0 0 24 24"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
  ),
  Sleep: () => (
    <svg style={{ width: '16px', height: '16px', fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round', marginRight: '6px', display: 'inline-block', verticalAlign: 'text-bottom' }} viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
  ),
  Hydration: () => (
    <svg style={{ width: '16px', height: '16px', fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round', marginRight: '6px', display: 'inline-block', verticalAlign: 'text-bottom' }} viewBox="0 0 24 24"><path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-13-7-13S5 10.7 5 15a7 7 0 0 0 7 7z"/></svg>
  ),
  Exercise: () => (
    <svg style={{ width: '16px', height: '16px', fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round', marginRight: '6px', display: 'inline-block', verticalAlign: 'text-bottom' }} viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
  ),
  Focus: () => (
    <svg style={{ width: '16px', height: '16px', fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round', marginRight: '6px', display: 'inline-block', verticalAlign: 'text-bottom' }} viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
  )
};