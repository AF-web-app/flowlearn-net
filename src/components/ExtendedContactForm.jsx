import React, { useState, useEffect } from 'react';

// Define submission endpoints
const SUBMISSION_ENDPOINTS = [
  'https://api.web3forms.com/submit',
  'https://submit.web3forms.com/submit'
];

export default function ExtendedContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    subject: '',
    service: 'ikt-pedagogik', // Default value
    message: '',
    gdpr: false
  });
  const [accessKey, setAccessKey] = useState(null);

  useEffect(() => {
    const key = import.meta.env.PUBLIC_WEB3FORMS_ACCESS_KEY || process.env.PUBLIC_WEB3FORMS_ACCESS_KEY;
    setAccessKey(key || null);
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Reset previous error state
    setErrorMessage('');
    
    if (!accessKey) {
      setErrorMessage('Tekniskt fel: Åtkomstnyckel saknas');
      setSubmitStatus('error');
      return;
    }

    // Client-side validation
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim() || !formData.gdpr) {
      setErrorMessage('Vänligen fyll i alla obligatoriska fält och godkänn hantering av personuppgifter');
      setSubmitStatus('error');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    const submissionData = new FormData();
    submissionData.set('access_key', accessKey);
    submissionData.set('subject', `Kontaktförfrågan från Flowlearn: ${formData.subject || 'Allmän förfrågan'}`);
    submissionData.set('from_name', 'Flowlearn Kontaktformulär');
    
    // Add all form fields
    Object.entries(formData).forEach(([key, value]) => {
      submissionData.set(key, value);
    });

    try {
      const response = await fetch(SUBMISSION_ENDPOINTS[0], {
        method: 'POST',
        body: submissionData,
        headers: {
          'Accept': 'application/json'
        }
      });

      // Log full response for debugging
      const responseText = await response.text();
      console.log('Full Response:', responseText);

      // Try to parse the response
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        setErrorMessage(`Kunde inte tolka serverns svar: ${responseText}`);
        setSubmitStatus('error');
        return;
      }

      // Check response status and success
      if (!response.ok || !responseData.success) {
        setErrorMessage(
          responseData.message || 
          `Serverfel: ${response.status} ${response.statusText}`
        );
        setSubmitStatus('error');
        return;
      }

      // Success handling
      setSubmitStatus('success');
      
      // Clear form data
      setFormData({
        name: '',
        email: '',
        phone: '',
        company: '',
        subject: '',
        service: 'ikt-pedagogik',
        message: '',
        gdpr: false
      });

      // Use client-side navigation instead of hard redirect
      setTimeout(() => {
        window.location.href = '/tack';
      }, 1500);
      
    } catch (error) {
      console.error('Form submission error:', error);
      
      // More detailed error handling
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
      className="space-y-6 bg-slate-800/50 p-8 rounded-lg border border-slate-700"
    >
      <input type="hidden" name="subject" value={`Kontaktförfrågan från Flowlearn: ${formData.subject || 'Allmän förfrågan'}`} />
      <input type="hidden" name="from_name" value="Flowlearn Kontaktformulär" />
      <input type="hidden" name="redirect" value="https://flowlearn.se/tack" />

      <div className="honeypot">
        <input type="text" name="botcheck" style={{ display: 'none' }} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            <option value="ikt-pedagogik">IKT-Pedagogik</option>
            <option value="it-support">IT-Support & Digitala Lösningar</option>
            <option value="webbdesign">Webbdesign & Grafisk Design</option>
            <option value="webbapplikationer">Webbapplikationer</option>
            <option value="annat">Annat</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="message" className="block mb-2 text-slate-300">Meddelande <span className="text-emerald-500">*</span></label>
        <textarea 
          id="message" 
          name="message" 
          value={formData.message}
          onChange={handleChange}
          required 
          rows={6} 
          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
          placeholder="Beskriv vad du behöver hjälp med..."
        ></textarea>
      </div>

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

      <button 
        type="submit" 
        disabled={isSubmitting || !accessKey}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg transition-colors font-medium text-lg"
      >
        {isSubmitting ? 'Skickar...' : 'Skicka meddelande'}
      </button>

      {submitStatus === 'error' && errorMessage && (
        <div className="bg-red-950 border border-red-900 p-4 rounded-lg mt-4">
          <p className="text-red-500">
            {errorMessage}
          </p>
          <p className="text-xs text-red-300 mt-2">
            Om problemet kvarstår, kontakta oss direkt på it@flowlearn.se
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
