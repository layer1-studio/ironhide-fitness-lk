export interface PayHereConfig {
  orderId: string;
  amount: number;
  currency: 'LKR';
  itemName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

// STUB — wire in merchant ID and secret when available
export function initiatePayHerePayment(_config: PayHereConfig): void {
  // TODO: Replace with real PayHere checkout
  // const params = new URLSearchParams({
  //   merchant_id: import.meta.env.VITE_PAYHERE_MERCHANT_ID,
  //   return_url: window.location.origin + '/payments',
  //   cancel_url: window.location.origin + '/renew',
  //   notify_url: 'https://your-cloud-function/payhereNotify',
  //   order_id: config.orderId,
  //   items: config.itemName,
  //   currency: config.currency,
  //   amount: config.amount.toFixed(2),
  //   first_name: config.firstName,
  //   last_name: config.lastName,
  //   email: config.email,
  //   phone: config.phone,
  // });
  // window.location.href = `https://www.payhere.lk/pay/checkout?${params}`;
  console.log('[PayHere] Stub: initiatePayHerePayment called — wire merchant credentials');
  alert('Card payment coming soon. Please use bank transfer or cash for now.');
}
