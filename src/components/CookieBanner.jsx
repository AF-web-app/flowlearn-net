import { useState, useEffect } from 'react';

export default function CookieBanner() {
  const [cookieConsent, setCookieConsent] = useState({
    analytics: false,
    necessary: true, // Always required
  });
  const [isVisible, setIsVisible] = useState(false);
  
  // Load consent preferences on component mount
  useEffect(() => {
    const savedConsent = localStorage.getItem('cookie-consent');
    if (savedConsent) {
      setCookieConsent(JSON.parse(savedConsent));
    } else {
      // Show banner if no consent has been given yet
      setIsVisible(true);
    }
  }, []);

  // Save consent preferences and initialize Google Analytics if consented
  const saveConsent = (consent) => {
    localStorage.setItem('cookie-consent', JSON.stringify(consent));
    setCookieConsent(consent);
    setIsVisible(false);
    
    // Initialize Google Analytics if analytics consent is given
    if (consent.analytics) {
      initializeGoogleAnalytics();
    }
  };

  // Accept all cookies
  const acceptAll = () => {
    const allConsent = {
      analytics: true,
      necessary: true,
    };
    saveConsent(allConsent);
  };

  // Accept only necessary cookies
  const acceptNecessary = () => {
    const necessaryConsent = {
      analytics: false,
      necessary: true,
    };
    saveConsent(necessaryConsent);
  };

  // Initialize Google Analytics
  const initializeGoogleAnalytics = () => {
    // Create script elements for Google Analytics
    const gtagScript = document.createElement('script');
    gtagScript.async = true;
    gtagScript.src = 'https://www.googletagmanager.com/gtag/js?id=G-MEASUREMENT_ID'; // Replace with your actual GA ID
    
    const inlineScript = document.createElement('script');
    inlineScript.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-MEASUREMENT_ID'); // Replace with your actual GA ID
    `;
    
    // Add scripts to document head
    document.head.appendChild(gtagScript);
    document.head.appendChild(inlineScript);
  };

  // Don't render anything if banner shouldn't be visible
  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-slate-800 border-t border-slate-700 shadow-lg">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2">Cookies och integritet</h3>
            <p className="text-slate-300 text-sm mb-2">
              Vi använder cookies för att förbättra din upplevelse på vår webbplats. 
              Vissa cookies är nödvändiga för webbplatsens funktion, medan andra hjälper 
              oss att förstå hur du interagerar med vår webbplats.
            </p>
            <p className="text-slate-300 text-sm">
              Genom att klicka på "Acceptera alla" godkänner du vår användning av cookies. 
              Du kan också välja "Endast nödvändiga" för att avböja icke-nödvändiga cookies.
              Läs mer i vår <a href="/integritetspolicy" className="text-blue-400 hover:underline">integritetspolicy</a>.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-0">
            <button 
              onClick={acceptNecessary}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded transition-colors text-sm"
            >
              Endast nödvändiga
            </button>
            <button 
              onClick={acceptAll}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors text-sm"
            >
              Acceptera alla
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
