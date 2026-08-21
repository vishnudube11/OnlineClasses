import { logger } from "@/src/utils/logger";
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
  logger.payment("Creating order", {
    amount: params.amount,
    currency: params.currency,
  });
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    logger.error("Missing EXPO_PUBLIC_API_BASE_URL", null, {
      action: "create_order",
    });
    throw new Error("Missing EXPO_PUBLIC_API_BASE_URL");
  }

  try {
    const res = await axios.post(
      `${baseUrl}/api/razorpay/create-order`,
      params,
      {
        headers: { "Content-Type": "application/json" },
      },
    );
    logger.payment("Order created successfully", { orderId: res.data.orderId });
    return res.data;
  } catch (error) {
    logger.error("Order creation failed", error, {
      action: "create_order",
      amount: params.amount,
    });
    throw error;
  }
};

export const getPaymentStatus = async (
  category: string,
  idToken: string,
): Promise<{ paid: boolean }> => {
  logger.payment("Checking payment status", { category });
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    logger.error("Missing EXPO_PUBLIC_API_BASE_URL", null, {
      action: "get_payment_status",
    });
    throw new Error("Missing EXPO_PUBLIC_API_BASE_URL");
  }

  try {
    const res = await axios.get(`${baseUrl}/api/payments/status`, {
      params: { category },
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });
    logger.payment("Payment status retrieved", {
      category,
      paid: res.data.paid,
    });
    return res.data;
  } catch (error) {
    logger.error("Payment status check failed", error, {
      action: "get_payment_status",
      category,
    });
    throw error;
  }
};

export const verifyPayment = async (params: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): Promise<{ verified: boolean }> => {
  logger.payment("Verifying payment", {
    orderId: params.razorpay_order_id,
    paymentId: params.razorpay_payment_id,
  });
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    logger.error("Missing EXPO_PUBLIC_API_BASE_URL", null, {
      action: "verify_payment",
    });
    throw new Error("Missing EXPO_PUBLIC_API_BASE_URL");
  }

  try {
    const res = await axios.post(
      `${baseUrl}/api/razorpay/verify-payment`,
      params,
      {
        headers: { "Content-Type": "application/json" },
      },
    );
    logger.payment("Payment verification completed", {
      verified: res.data.verified,
    });
    return res.data;
  } catch (error) {
    logger.error("Payment verification failed", error, {
      action: "verify_payment",
      orderId: params.razorpay_order_id,
    });
    throw error;
  }
};

export interface MarkPaidParams {
  category: string;
  amount: number;
  currency?: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export const markPaid = async (
  params: MarkPaidParams,
  idToken: string,
): Promise<{ ok: boolean }> => {
  logger.payment("Marking payment as paid", {
    category: params.category,
    amount: params.amount,
    orderId: params.razorpay_order_id,
  });
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    logger.error("Missing EXPO_PUBLIC_API_BASE_URL", null, {
      action: "mark_paid",
    });
    throw new Error("Missing EXPO_PUBLIC_API_BASE_URL");
  }

  try {
    const res = await axios.post(`${baseUrl}/api/payments/mark-paid`, params, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
    });
    logger.payment("Payment marked as paid successfully", {
      category: params.category,
    });
    return res.data;
  } catch (error) {
    logger.error("Mark payment as paid failed", error, {
      action: "mark_paid",
      category: params.category,
    });
    throw error;
  }
};
