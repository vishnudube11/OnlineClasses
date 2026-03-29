import axios from "axios";

export interface CreateOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export const createOrder = async (params: {
  amount: number;
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
}): Promise<CreateOrderResponse> => {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    throw new Error("Missing EXPO_PUBLIC_API_BASE_URL");
  }

  const res = await axios.post(`${baseUrl}/api/razorpay/create-order`, params, {
    headers: { "Content-Type": "application/json" },
  });
  return res.data;
};

export const verifyPayment = async (params: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): Promise<{ verified: boolean }> => {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    throw new Error("Missing EXPO_PUBLIC_API_BASE_URL");
  }

  const res = await axios.post(
    `${baseUrl}/api/razorpay/verify-payment`,
    params,
    {
      headers: { "Content-Type": "application/json" },
    },
  );
  return res.data;
};
