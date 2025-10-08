import React, { useState, useEffect } from 'react';

/**
 * Enhetligt kontaktformulär som ersätter både ContactForm och ExtendedContactForm
 * Kan konfigureras för enkel eller utökad version via props
 * 
 * @param {Object} props
 * @param {boolean} props.extended - Om formuläret ska visa utökade fält
 * @param {string} props.defaultService - Standard tjänst för utökade formuläret
 * @param {string} props.redirectUrl - URL att omdirigera till efter lyckad inskickning
 * @param {string} props.contactEmail - E-post att visa vid fel
 * @returns {React.Component}
 */
export default function UnifiedContactForm({
  extended = false,
  defaultService = 'it-support',
  redirectUrl = '/tack',
  contactEmail = 'kontakt@flowlearn.se'
}) {
  // Tillstånd för formuläret
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    subject: '',
    service: defaultService,
    message: '',
    gdpr: false
  });
  const [accessKey, setAccessKey] = useState(null);

  // Hämta API-nyckel från miljövariabler
  useEffect(() => {
    const key = import.meta.env.PUBLIC_WEB3FORMS_ACCESS_KEY || process.env.PUBLIC_WEB3FORMS_ACCESS_KEY;
    setAccessKey(key || null);
  }, []);

  // Hantera ändringar i formulärfält
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Hantera formulärinskickning
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Återställ tidigare felstatus
    setErrorMessage('');
    
    // Kontrollera att API-nyckel finns
    if (!accessKey) {
      setErrorMessage('Tekniskt fel: Åtkomstnyckel saknas');
      setSubmitStatus('error');
      return;
    }

    // Klientvalidering
    const requiredFields = ['name', 'email', 'message'];
    if (extended) {
      // GDPR krävs endast i utökat formulär
      requiredFields.push('gdpr');
    }
    
    const missingFields = requiredFields.filter(field => 
      field === 'gdpr' ? !formData[field] : !formData[field]?.trim()
    );
    
    if (missingFields.length > 0) {
      const gdprMissing = missingFields.includes('gdpr');
      setErrorMessage(
        `Vänligen fyll i alla obligatoriska fält${gdprMissing ? ' och godkänn hantering av personuppgifter' : ''}`
      );
      setSubmitStatus('error');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    // Förbered data för inskickning
    const submissionData = new FormData();
    submissionData.set('access_key', accessKey);
    submissionData.set('subject', extended && formData.subject 
      ? `Kontaktförfrågan från Flowlearn: ${formData.subject}` 
      : 'Ny kontaktförfrågan från Flowlearn'
    );
    submissionData.set('from_name', 'Flowlearn Kontaktformulär');
    
    // Lägg till alla formulärfält
    Object.entries(formData).forEach(([key, value]) => {
      // Skicka bara med relevanta fält baserat på formulärtyp
      if (!extended && ['phone', 'company', 'subject', 'service', 'gdpr'].includes(key)) {
        return;
      }
      submissionData.set(key, value);
    });

    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: submissionData,
        headers: {
          'Accept': 'application/json'
        }
      });

      // Försök tolka svaret
      let responseData;
      try {
        const responseText = await response.text();
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        setErrorMessage('Kunde inte tolka serverns svar');
        setSubmitStatus('error');
        return;
      }

      // Kontrollera svarsstatus och framgång
      if (!response.ok || !responseData.success) {
        setErrorMessage(
          responseData.message || 
          `Serverfel: ${response.status} ${response.statusText}`
        );
        setSubmitStatus('error');
        return;
      }

      // Hantera framgång
      setSubmitStatus('success');
      
      // Rensa formulärdata
      setFormData({
        name: '',
        email: '',
        phone: '',
        company: '',
        subject: '',
        service: defaultService,
        message: '',
        gdpr: false
      });

      // Omdirigera efter framgångsrik inskickning
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 1500);
      
    } catch (error) {
      console.error('Form submission error:', error);
      
      // Detaljerad felhantering
      if (error instanceof TypeError) {
        setErrorMessage('Nätverksfel: Kunde inte ansluta till servern');
      } else if (error instanceof Error) {
        setErrorMessage(`Oväntat fel: ${error.message}`);
      } else {
        setErrorMessage('Ett okänt fel inträffade');
      }
      
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form 
      onSubmit={handleSubmit} 
      method="POST" 
      className={`space-y-4 ${extended ? 'max-w-2xl mx-auto' : ''}`}
    >
      <input type="hidden" name="subject" value={extended && formData.subject 
        ? `Kontaktförfrågan från Flowlearn: ${formData.subject}` 
        : 'Ny kontaktförfrågan från Flowlearn'} 
      />
      <input type="hidden" name="from_name" value="Flowlearn Kontaktformulär" />
      <input type="hidden" name="redirect" value={redirectUrl} />

      <div className="honeypot">
        <input type="text" name="botcheck" style={{ display: 'none' }} />
      </div>

      {extended ? (
        // Utökat formulär med fler fält
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block mb-2 text-slate-300">Namn <span className="text-emerald-500">*</span></label>
              <input 
                type="text" 
                id="name" 
                name="name" 
                value={formData.name}
                onChange={handleChange}
                required 
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                placeholder="Ditt namn"
              />
            </div>

            <div>
              <label htmlFor="email" className="block mb-2 text-slate-300">E-post <span className="text-emerald-500">*</span></label>
              <input 
                type="email" 
                id="email" 
                name="email" 
                value={formData.email}
                onChange={handleChange}
                required 
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                placeholder="din.epost@exempel.se"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="phone" className="block mb-2 text-slate-300">Telefon</label>
              <input 
                type="tel" 
                id="phone" 
                name="phone" 
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                placeholder="Ditt telefonnummer"
              />
            </div>

            <div>
              <label htmlFor="company" className="block mb-2 text-slate-300">Företag/Organisation</label>
              <input 
                type="text" 
                id="company" 
                name="company" 
                value={formData.company}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                placeholder="Ditt företag eller organisation"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="subject" className="block mb-2 text-slate-300">Ämne</label>
              <input 
                type="text" 
                id="subject" 
                name="subject" 
                value={formData.subject}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                placeholder="Ämne för din förfrågan"
              />
            </div>

            <div>
              <label htmlFor="service" className="block mb-2 text-slate-300">Tjänst du är intresserad av</label>
              <select 
                id="service" 
                name="service" 
                value={formData.service}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
              >
                <option value="it-support">IT-Support</option>
                <option value="ikt-pedagogik">IKT-Pedagogik</option>
                <option value="webbdesign">Webbdesign & Grafisk Design</option>
                <option value="annat">Annat</option>
              </select>
            </div>
          </div>
        </>
      ) : (
        // Enkelt formulär med färre fält
        <>
          <div>
            <label htmlFor="name" className="block mb-2">Namn</label>
            <input 
              type="text" 
              id="name" 
              name="name" 
              value={formData.name}
              onChange={handleChange}
              required 
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg"
            />
          </div>

          <div>
            <label htmlFor="email" className="block mb-2">E-post</label>
            <input 
              type="email" 
              id="email" 
              name="email" 
              value={formData.email}
              onChange={handleChange}
              required 
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg"
            />
          </div>
        </>
      )}

      <div>
        <label htmlFor="message" className="block mb-2 text-slate-300">
          Meddelande {extended && <span className="text-emerald-500">*</span>}
        </label>
        <textarea 
          id="message" 
          name="message" 
          value={formData.message}
          onChange={handleChange}
          required 
          rows={extended ? 6 : 4} 
          className={`w-full px-${extended ? '4' : '3'} py-${extended ? '3' : '2'} bg-slate-800 border border-slate-700 rounded-lg ${extended ? 'focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all' : ''}`}
          placeholder={extended ? "Beskriv vad du behöver hjälp med..." : ""}
        ></textarea>
      </div>

      {extended && (
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              id="gdpr"
              name="gdpr"
              type="checkbox"
              checked={formData.gdpr}
              onChange={handleChange}
              required
              className="w-4 h-4 bg-slate-800 border-slate-700 rounded focus:ring-emerald-500"
            />
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor="gdpr" className="text-slate-300">
              Jag godkänner att Flowlearn lagrar mina personuppgifter enligt <a href="/integritetspolicy" className="text-emerald-500 hover:underline">integritetspolicyn</a> <span className="text-emerald-500">*</span>
            </label>
          </div>
        </div>
      )}

      <button 
        type="submit" 
        disabled={isSubmitting || !accessKey}
        className={`w-full bg-emerald-${extended ? '600' : '700'} hover:bg-emerald-${extended ? '700' : '800'} text-white px-${extended ? '6' : '4'} py-${extended ? '3' : '2'} rounded-lg transition-colors ${extended ? 'font-medium text-lg' : ''}`}
      >
        {isSubmitting ? 'Skickar...' : extended ? 'Skicka meddelande' : 'Skicka'}
      </button>

      {submitStatus === 'error' && errorMessage && (
        <div className="bg-red-950 border border-red-900 p-4 rounded-lg mt-4">
          <p className="text-red-500">
            {errorMessage}
          </p>
          <p className="text-xs text-red-300 mt-2">
            Om problemet kvarstår, kontakta oss direkt på {contactEmail}
          </p>
        </div>
      )}

      {submitStatus === 'success' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-emerald-900 p-8 rounded-lg text-center">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-16 w-16 mx-auto text-emerald-500 mb-4" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
              />
            </svg>
            <h2 className="text-2xl font-bold text-white mb-4">Tack för ditt meddelande!</h2>
            <p className="text-emerald-200 mb-4">Vi återkommer snart.</p>
            <p className="text-sm text-emerald-300">Omdirigerar...</p>
          </div>
        </div>
      )}
    </form>
  );
}
