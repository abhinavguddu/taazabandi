// Payment Gateway Integration with Development Bypass

const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_BYPASS_PAYMENT === 'true';

export interface PaymentOptions {
  amount: number;
  orderId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  orderId?: string;
  signature?: string;
  error?: string;
}

// Initialize Razorpay (only in production)
const loadRazorpay = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export async function initiatePayment(options: PaymentOptions): Promise<PaymentResult> {
  // DEVELOPMENT MODE - Bypass payment
  if (isDevelopment) {
    console.log('🔧 DEVELOPMENT MODE: Payment bypassed');
    console.log('Payment details:', options);
    
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return {
      success: true,
      paymentId: `dev_pay_${Date.now()}`,
      orderId: options.orderId,
      signature: 'dev_signature_bypass',
    };
  }

  // PRODUCTION MODE - Real Razorpay
  try {
    const res = await loadRazorpay();
    
    if (!res) {
      return {
        success: false,
        error: 'Razorpay SDK failed to load',
      };
    }

    // Create order on backend
    const response = await fetch('/api/payment/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: options.amount,
        orderId: options.orderId,
      }),
    });

    const { razorpayOrderId, amount, currency } = await response.json();

    // Razorpay checkout options
    const razorpayOptions = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: amount,
      currency: currency,
      name: 'TaazaBandi',
      description: 'Fresh Vegetable Bundle',
      order_id: razorpayOrderId,
      prefill: {
        name: options.customerName,
        email: options.customerEmail || '',
        contact: options.customerPhone,
      },
      theme: {
        color: '#2E7D32',
      },
      handler: function (response: any) {
        return {
          success: true,
          paymentId: response.razorpay_payment_id,
          orderId: response.razorpay_order_id,
          signature: response.razorpay_signature,
        };
      },
    };

    const paymentObject = new (window as any).Razorpay(razorpayOptions);
    
    return new Promise((resolve) => {
      paymentObject.on('payment.failed', function (response: any) {
        resolve({
          success: false,
          error: response.error.description,
        });
      });
      
      paymentObject.open();
    });

  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Payment failed',
    };
  }
}

export async function verifyPayment(
  paymentId: string,
  orderId: string,
  signature: string
): Promise<boolean> {
  // DEVELOPMENT MODE - Always return true
  if (isDevelopment) {
    console.log('🔧 DEVELOPMENT MODE: Payment verification bypassed');
    return true;
  }

  // PRODUCTION MODE - Verify with backend
  try {
    const response = await fetch('/api/payment/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentId, orderId, signature }),
    });

    const { verified } = await response.json();
    return verified;
  } catch (error) {
    console.error('Payment verification failed:', error);
    return false;
  }
}

// Helper to check if payment is bypassed
export function isPaymentBypassed(): boolean {
  return isDevelopment;
}
