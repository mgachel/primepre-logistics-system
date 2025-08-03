import React from "react";

export const BoxIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12,2L13.09,8.26L22,9L17,14L18.18,22.5L12,19.77L5.82,22.5L7,14L2,9L10.91,8.26L12,2Z" />
    <path d="M3 7v10a3 3 0 003 3h12a3 3 0 003-3V7l-9-5-9 5z" />
    <path d="M3 7h18l-2 2H5l-2-2z" />
  </svg>
);

export const TruckIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M18 18.5a1.5 1.5 0 0 1-1.5-1.5a1.5 1.5 0 0 1 1.5-1.5a1.5 1.5 0 0 1 1.5 1.5a1.5 1.5 0 0 1-1.5 1.5m1.5-9H17V12h4.46L19.5 9.5M6 18.5a1.5 1.5 0 0 1-1.5-1.5A1.5 1.5 0 0 1 6 15.5A1.5 1.5 0 0 1 7.5 17A1.5 1.5 0 0 1 6 18.5M20 8l3 4v5h-2a3 3 0 0 1-3 3a3 3 0 0 1-3-3H9a3 3 0 0 1-3 3a3 3 0 0 1-3-3H1V6a2 2 0 0 1 2-2h14v4h3M2 7v9h1a3 3 0 0 1 3-3a3 3 0 0 1 3 3h6V7H2Z" />
    <circle cx="18" cy="17" r="1" />
    <circle cx="6" cy="17" r="1" />
  </svg>
);

export const FlagIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M5,4V21H7V14H12L13,16H20V4H5M7,6H18V14H12L11,12H7V6Z" />
  </svg>
);

export const CheckCircleIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M11,16.5L18,9.5L16.59,8.09L11,13.67L7.91,10.59L6.5,12L11,16.5Z" />
  </svg>
);
