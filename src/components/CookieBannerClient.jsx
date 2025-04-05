import React from 'react';
import { createRoot } from 'react-dom/client';
import CookieBanner from './CookieBanner';

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('cookie-banner-container');
  
  if (container) {
    // Create a React root and render the CookieBanner component
    const root = createRoot(container);
    root.render(<CookieBanner />);
  }
});
