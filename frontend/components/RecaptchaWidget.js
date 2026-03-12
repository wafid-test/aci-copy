import { useEffect, useRef, useState } from 'react';

const SCRIPT_ID = 'google-recaptcha-script';

export default function RecaptchaWidget({ onToken }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const [error, setError] = useState('');
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '';

  useEffect(() => {
    if (!siteKey) {
      setError('Missing NEXT_PUBLIC_RECAPTCHA_SITE_KEY');
      return undefined;
    }

    let cancelled = false;

    function renderWidget() {
      if (cancelled || !window.grecaptcha || !containerRef.current) return;
      if (widgetIdRef.current !== null) return;

      widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token) => onToken(token),
        'expired-callback': () => onToken(''),
        'error-callback': () => {
          setError('Recaptcha failed. Refresh and try again.');
          onToken('');
        },
      });
    }

    function init() {
      if (window.grecaptcha && window.grecaptcha.render) {
        renderWidget();
        return;
      }

      let script = document.getElementById(SCRIPT_ID);
      if (!script) {
        script = document.createElement('script');
        script.id = SCRIPT_ID;
        script.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
      }

      script.addEventListener('load', renderWidget);
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [onToken, siteKey]);

  return (
    <div>
      <div ref={containerRef} />
      {error ? <p className="auth-message">{error}</p> : null}
    </div>
  );
}
