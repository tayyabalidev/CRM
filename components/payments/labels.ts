import type { PaymentMethod } from "@/types/index";

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: "Cash",
  bank_transfer: "Bank transfer",
  paypal: "PayPal",
  stripe: "Stripe",
  wise: "Wise",
  other: "Other",
};
