import { useEffect, useRef, useId } from 'react';
// Extend window to include the reCAPTCHA API
declare global {
  interface Window {
    grecaptcha: {
      ready: (cb: () => void) => void;
      render: (
        container: string | HTMLElement,
        params: {
          sitekey: string;
          callback?: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
          theme?: 'light' | 'dark';
          size?: 'normal' | 'compact';
        }
      ) => number;
      reset: (widgetId?: number) => void;
      getResponse: (widgetId?: number) => string;
    };
    // Called by reCAPTCHA script once it loads
    onRecaptchaLoad?: () => void;
  }
}
interface ReCaptchaProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  theme?: 'light' | 'dark';
}
const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY ?? '';
export function ReCaptcha({ onVerify, onExpire, theme = 'dark' }: ReCaptchaProps) {
  const containerId = useId().replace(/:/g, '_');
  const widgetIdRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!SITE_KEY) {
      console.warn('[ReCaptcha] VITE_RECAPTCHA_SITE_KEY is not set. reCAPTCHA will not render.');
      return;
    }
    const renderWidget = () => {
      if (!containerRef.current) return;
      // Already rendered
      if (widgetIdRef.current !== null) return;
      widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
        sitekey: SITE_KEY,
        callback: onVerify,
        'expired-callback': () => {
          onExpire?.();
        },
        'error-callback': () => {
          onExpire?.();
        },
        theme,
      });
    };
    if (window.grecaptcha) {
      window.grecaptcha.ready(renderWidget);
    } else {
      // Queue until script loads
      const prev = window.onRecaptchaLoad;
      window.onRecaptchaLoad = () => {
        prev?.();
        window.grecaptcha.ready(renderWidget);
      };
    }
    return () => {
      widgetIdRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!SITE_KEY) {
    return (
      <div className="border border-yellow-600 bg-yellow-600/10 p-3 text-yellow-400 font-body text-body-sm">
        ⚠ reCAPTCHA not configured (VITE_RECAPTCHA_SITE_KEY missing). Security check skipped.
      </div>
    );
  }
  return (
    <div
      id={containerId}
      ref={containerRef}
      className="g-recaptcha"
      aria-label="reCAPTCHA security check"
    />
  );
}