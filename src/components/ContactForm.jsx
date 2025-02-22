import React, { useState, useEffect } from 'react';

// Define submission endpoints
const SUBMISSION_ENDPOINTS = [
  'https://api.web3forms.com/submit',
  'https://submit.web3forms.com/submit',
  'https://formspree.io/f/your_formspree_endpoint'
];

export default function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [accessKey, setAccessKey] = useState(null);

  useEffect(() => {
    const key = import.meta.env.PUBLIC_WEB3FORMS_ACCESS_KEY || process.env.PUBLIC_WEB3FORMS_ACCESS_KEY;
    setAccessKey(key || null);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
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
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      setErrorMessage('Vänligen fyll i alla fält');
      setSubmitStatus('error');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    const submissionData = new FormData();
    submissionData.set('access_key', accessKey);
    submissionData.set('subject', 'Ny kontaktförfrågan från FlowLearn');
    submissionData.set('from_name', 'FlowLearn Kontaktformulär');
    submissionData.set('name', formData.name);
    submissionData.set('email', formData.email);
    submissionData.set('message', formData.message);

    try {
      const response = await fetch('https://api.web3forms.com/submit', {
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
        message: ''
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
      className="space-y-4"
    >
      <input type="hidden" name="subject" value="Ny kontaktförfrågan från FlowLearn" />
      <input type="hidden" name="from_name" value="FlowLearn Kontaktformulär" />
      <input type="hidden" name="redirect" value="https://flowlearn.se/tack" />

      <div className="honeypot">
        <input type="text" name="botcheck" style={{ display: 'none' }} />
      </div>

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

      <div>
        <label htmlFor="message" className="block mb-2">Meddelande</label>
        <textarea 
          id="message" 
          name="message" 
          value={formData.message}
          onChange={handleChange}
          required 
          rows={4} 
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg"
        ></textarea>
      </div>

      <button 
        type="submit" 
        disabled={isSubmitting || !accessKey}
        className="w-full bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-lg transition-colors"
      >
        {isSubmitting ? 'Skickar...' : 'Skicka'}
      </button>

      {submitStatus === 'error' && errorMessage && (
        <div className="bg-red-950 border border-red-900 p-4 rounded-lg mt-4">
          <p className="text-red-500">
            {errorMessage}
          </p>
          <p className="text-xs text-red-300 mt-2">
            Om problemet kvarstår, kontakta oss direkt på kontakt@flowlearn.se
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
