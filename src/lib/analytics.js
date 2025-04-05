// Google Analytics implementation that respects GDPR consent

// Check if consent exists and analytics are allowed
function hasAnalyticsConsent() {
  try {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) return false;
    
    const parsedConsent = JSON.parse(consent);
    return parsedConsent.analytics === true;
  } catch (error) {
    console.error('Error checking analytics consent:', error);
    return false;
  }
}

// Initialize Google Analytics if user has given consent
export function initializeAnalytics() {
  if (!hasAnalyticsConsent()) return;
  
  // Replace 'G-MEASUREMENT_ID' with your actual Google Analytics ID
  const GA_ID = 'G-MEASUREMENT_ID';
  
  // Add Google Analytics script
  const script = document.createElement('script');
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  script.async = true;
  document.head.appendChild(script);
  
  // Initialize gtag
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  gtag('js', new Date());
  gtag('config', GA_ID, { 'anonymize_ip': true }); // Anonymize IP for GDPR compliance
  
  // Make gtag available globally
  window.gtag = gtag;
}

// Track page view (only if consent is given)
export function trackPageView(url) {
  if (!hasAnalyticsConsent() || !window.gtag) return;
  
  window.gtag('config', 'G-MEASUREMENT_ID', {
    page_path: url,
    anonymize_ip: true
  });
}

// Track event (only if consent is given)
export function trackEvent(eventName, params = {}) {
  if (!hasAnalyticsConsent() || !window.gtag) return;
  
  window.gtag('event', eventName, params);
}
