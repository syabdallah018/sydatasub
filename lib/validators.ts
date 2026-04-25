import { z } from "zod";

export const loginSchema = z.object({
  phone: z.string().regex(/^0[0-9]{10}$/, "Phone number must be 11 digits starting with 0"),
  pin: z.string().regex(/^\d{6}$/, "PIN must be 6 digits"),
});

export const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().regex(/^0[0-9]{10}$/, "Phone number must be 11 digits starting with 0"),
  pin: z.string().regex(/^\d{6}$/, "PIN must be 6 digits"),
  confirmPin: z.string().regex(/^\d{6}$/, "PIN must be 6 digits"),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms and conditions",
  }),
}).refine((data) => data.pin === data.confirmPin, {
  message: "PINs don't match",
  path: ["confirmPin"],
});

export const createVirtualAccountSchema = z.object({
  accountName: z.string().min(2, "Account name is required"),
});

export const setPINSchema = z.object({
  pin: z.string().regex(/^\d{4}$/, "PIN must be 4 digits"),
  confirmPin: z.string(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type CreateVirtualAccountInput = z.infer<
  typeof createVirtualAccountSchema
>;
export type SetPINInput = z.infer<typeof setPINSchema>;

// Helper validation functions
export function validatePhoneNumber(phoneNumber: string): {
  valid: boolean;
  error?: string;
} {
  if (!phoneNumber) {
    return { valid: false, error: "Phone number is required" };
  }

  // Remove all non-numeric characters
  const cleaned = phoneNumber.replace(/\D/g, "");

  // Nigerian phone numbers are 11 digits (starting with 0) or 13 digits (starting with +234)
  if (!cleaned.match(/^(234\d{10}|\d{11})$/)) {
    return { valid: false, error: "Invalid Nigerian phone number" };
  }

  return { valid: true };
}

export function validateDataRequest(data: {
  planId: string;
  phoneNumber: string;
}): {
  valid: boolean;
  error?: string;
} {
  if (!data.planId) {
    return { valid: false, error: "Plan ID is required" };
  }

  const phoneValidation = validatePhoneNumber(data.phoneNumber);
  if (!phoneValidation.valid) {
    return phoneValidation;
  }

  return { valid: true };
}

export function validateAmount(amount: number): {
  valid: boolean;
  error?: string;
} {
  if (!amount) {
    return { valid: false, error: "Amount is required" };
  }

  if (amount < 50) {
    return { valid: false, error: "Minimum amount is 50" };
  }

  if (amount > 1000000) {
    return { valid: false, error: "Maximum amount is 1,000,000" };
  }

  return { valid: true };
}

export function validateEmail(email: string): {
  valid: boolean;
  error?: string;
} {
  if (!email) {
    return { valid: false, error: "Email is required" };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: "Invalid email address" };
  }

  return { valid: true };
}
