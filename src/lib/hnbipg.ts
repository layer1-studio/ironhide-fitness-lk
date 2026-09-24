import { auth } from './firebase';
const CLOUD_FUNCTION_URL = 'https://us-central1-ironhide-fitness.cloudfunctions.net';
export interface HnbCheckoutRequest {
  planId: string;
  planName: string;
  amount: number;
  uid: string;
  recaptchaToken: string;
  billToName?: string;
  billToAddress?: string;
  billToPhone?: string;
}
interface HnbCheckoutResponse {
  endpoint: string;
  fields: Record<string, string>;
  sessionId: string;
}
/**
 * Initiates an HNB IPG (CyberSource) checkout session.
 *
 * Flow:
 *  1. Client calls this function with plan details + a reCAPTCHA v2 token
 *  2. Cloud Function verifies the token, enforces velocity limits, builds a
 *     HMAC-SHA256-signed CyberSource Simple Order API payload
 *  3. We auto-submit a hidden HTML form to CyberSource's hosted payment page
 *  4. After payment CyberSource redirects back to /payments?hnb=success
 *  5. CyberSource also POSTs a webhook to our hnbIpgWebhook Cloud Function
 *     which activates the membership
 */
export async function initiateHnbCheckout(request: HnbCheckoutRequest): Promise<void> {
  try {
    console.log('[HNB IPG] Initiating checkout for:', request.planName);
    const user = auth.currentUser;
    if (!user) throw new Error('You must be signed in to make a payment.');
    const idToken = await user.getIdToken();
    const response = await fetch(
      `${CLOUD_FUNCTION_URL}/createHnbCheckoutSession`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          planId: request.planId,
          planName: request.planName,
          amount: request.amount,
          recaptchaToken: request.recaptchaToken,
          billToName: request.billToName,
          billToAddress: request.billToAddress,
          billToPhone: request.billToPhone,
        }),
      }
    );
    if (!response.ok) {
      const error = await response.json() as { error?: string; details?: string };
      console.error('[HNB IPG] API Error:', error);
      throw new Error(
        error.details ?? error.error ?? `HTTP ${response.status}: Failed to create HNB checkout session`
      );
    }
    const { endpoint, fields, sessionId } = (await response.json()) as HnbCheckoutResponse;
    console.log('[HNB IPG] Checkout session created:', sessionId);
    if (!endpoint || !fields) throw new Error('Invalid response from HNB payment server.');
    // Save session so we can reference it on return
    sessionStorage.setItem('hnb_session_id', sessionId);
    sessionStorage.setItem('hnb_plan_name', request.planName);
    // Auto-submit a hidden form to CyberSource's hosted payment page (P2PE redirect)
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = endpoint;
    form.style.display = 'none';
    for (const [key, value] of Object.entries(fields)) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = value;
      form.appendChild(input);
    }
    document.body.appendChild(form);
    console.log('[HNB IPG] Submitting form to CyberSource:', endpoint);
    form.submit();
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[HNB IPG] Checkout initiation failed:', error);
    if (error?.message?.includes('You must be signed in')) {
      throw new Error('You must be signed in to make a payment.');
    } else if (error?.message?.includes('Failed to fetch') || error?.message?.includes('network')) {
      throw new Error('Could not connect to HNB payment gateway. Please check your connection and try again.');
    } else if (error?.message?.includes('reCAPTCHA')) {
      throw new Error('Security check failed. Please complete the reCAPTCHA and try again.');
    } else if (error?.message?.includes('Too many')) {
      throw new Error('Too many payment attempts. Please wait a few minutes before trying again.');
    } else if (error?.message?.includes('not configured')) {
      throw new Error('HNB IPG is not yet configured. Please use another payment method or contact support.');
    } else if (error?.message) {
      throw new Error(error.message);
    } else {
      throw new Error('Failed to initiate HNB payment. Please try again.');
    }
  }
}
/**
 * Returns URL params indicating HNB IPG payment result.
 * Call this on /payments and /renew page load.
 */
export function getHnbReturnStatus(): 'success' | 'cancelled' | 'failed' | null {
  const params = new URLSearchParams(window.location.search);
  const status = params.get('hnb');
  if (status === 'success') return 'success';
  if (status === 'cancelled') return 'cancelled';
  if (status === 'failed') return 'failed';
  return null;
}
/**
 * Clears HNB IPG session data from sessionStorage.
 */
export function clearHnbSession(): void {
  sessionStorage.removeItem('hnb_session_id');
  sessionStorage.removeItem('hnb_plan_name');
}