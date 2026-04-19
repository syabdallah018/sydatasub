import axios from "axios";

const FLUTTERWAVE_BASE_URL = "https://api.flutterwave.com/v3";
const FLUTTERWAVE_SECRET = process.env.FLUTTERWAVE_SECRET_KEY;

const flutterwaveClient = axios.create({
  baseURL: FLUTTERWAVE_BASE_URL,
  headers: {
    Authorization: `Bearer ${FLUTTERWAVE_SECRET}`,
    "Content-Type": "application/json",
  },
});

// ============================================================================
// TYPES
// ============================================================================

export interface CreateStaticVirtualAccountParams {
  email: string;
  firstname: string;
  lastname: string;
  phone: string;
  tx_ref: string;
  bvn?: string;
  narration?: string;
}

export interface CreateDynamicVirtualAccountParams {
  email: string;
  firstname: string;
  lastname: string;
  phone: string;
  tx_ref: string;
  amount: number; // Amount to be received
  narration?: string;
}

export interface FLWVirtualAccountResponse {
  id: number;
  account_number: string;
  bank_name: string;
  bank_code: string;
  amount?: number;
  order_ref?: string;
  flw_ref?: string;
}

export interface FLWTransaction {
  id: number;
  tx_ref: string;
  flw_ref: string;
  amount: number;
  currency: string;
  status: string;
  customer: {
    email: string;
    phone_number: string;
  };
}

// ============================================================================
// STATIC VIRTUAL ACCOUNTS (Permanent)
// ============================================================================

export async function createStaticVirtualAccount(
  params: CreateStaticVirtualAccountParams
): Promise<FLWVirtualAccountResponse> {
  try {
    const response = await flutterwaveClient.post("/virtual-account-numbers", {
      email: params.email,
      tx_ref: params.tx_ref,
      phonenumber: params.phone,
      firstname: params.firstname,
      lastname: params.lastname,
      narration: params.narration || `SY DATA ${params.firstname}`,
      bvn: params.bvn || process.env.FLW_BVN,
      is_permanent: true,
    });

    if (response.data.status === "success") {
      return {
        id: response.data.data.id,
        account_number: response.data.data.account_number,
        bank_name: response.data.data.bank_name,
        bank_code: response.data.data.bank_code,
      };
    }

    throw new Error(`Flutterwave error: ${response.data.message}`);
  } catch (error: any) {
    console.error("[CREATE STATIC VA ERROR]", error.response?.data || error.message);
    if (error.response?.status === 429) {
      throw new Error("Rate limited by Flutterwave - please try again later");
    }
    throw new Error(`Failed to create virtual account: ${error.message}`);
  }
}

// ============================================================================
// DYNAMIC VIRTUAL ACCOUNTS (Temporary, with amount)
// ============================================================================

export async function createDynamicVirtualAccount(
  params: CreateDynamicVirtualAccountParams
): Promise<FLWVirtualAccountResponse> {
  try {
    const response = await flutterwaveClient.post("/virtual-account-numbers", {
      email: params.email,
      tx_ref: params.tx_ref,
      phonenumber: params.phone,
      firstname: params.firstname,
      lastname: params.lastname,
      amount: params.amount,
      narration: params.narration || `SY DATA - ${params.amount} NGN`,
      is_permanent: false, // Not permanent - one-time use
    });

    if (response.data.status === "success") {
      return {
        id: response.data.data.id,
        account_number: response.data.data.account_number,
        bank_name: response.data.data.bank_name,
        bank_code: response.data.data.bank_code,
        amount: response.data.data.amount,
        order_ref: response.data.data.order_ref,
        flw_ref: response.data.data.flw_ref,
      };
    }

    throw new Error(`Flutterwave error: ${response.data.message}`);
  } catch (error: any) {
    console.error("[CREATE DYNAMIC VA ERROR]", error.response?.data || error.message);
    if (error.response?.status === 429) {
      throw new Error("Rate limited by Flutterwave - please try again later");
    }
    throw new Error(`Failed to create virtual account: ${error.message}`);
  }
}

// ============================================================================
// TRANSACTION VERIFICATION
// ============================================================================

export async function verifyTransaction(txRef: string): Promise<FLWTransaction | null> {
  try {
    const response = await flutterwaveClient.get(`/transactions`, {
      params: { tx_ref: txRef },
    });

    if (response.data.status === "success" && response.data.data.length > 0) {
      const tx = response.data.data[0];
      return {
        id: tx.id,
        tx_ref: tx.tx_ref,
        flw_ref: tx.flw_ref,
        amount: tx.amount,
        currency: tx.currency,
        status: tx.status,
        customer: {
          email: tx.customer.email,
          phone_number: tx.customer.phone_number,
        },
      };
    }

    return null;
  } catch (error: any) {
    console.error("[VERIFY TRANSACTION ERROR]", error.response?.data || error.message);
    if (error.response?.status === 429) {
      throw new Error("Rate limited by Flutterwave - please try again later");
    }
    return null;
  }
}

// ============================================================================
// LEGACY - KEPT FOR BACKWARD COMPATIBILITY
// ============================================================================

export interface CreateVirtualAccountParams {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
}

export interface VirtualAccountResponse {
  id: number;
  account_number: string;
  bank_name: string;
  bank_code: string;
  amount?: number;
  tx_ref?: string;
  order_ref?: string;
  flw_ref?: string;
}

export async function createFlutterwaveVirtualAccount(
  params: CreateVirtualAccountParams
): Promise<VirtualAccountResponse> {
  try {
    const txRef = `SYDATA-VA-${params.userId}-${Date.now()}`;
    const response = await flutterwaveClient.post("/virtual-account-numbers", {
      email: params.email,
      tx_ref: txRef,
      phonenumber: params.phone,
      firstname: params.firstName,
      lastname: params.lastName,
      narration: `SY DATA ${params.firstName}`,
      bvn: process.env.FLW_BVN,
      is_permanent: true,
    });

    return {
      ...response.data.data,
      tx_ref: response.data.data?.tx_ref || txRef,
      order_ref: response.data.data?.order_ref,
      flw_ref: response.data.data?.flw_ref,
    };
  } catch (error) {
    console.error("[FLUTTERWAVE ERROR]", error);
    throw new Error("Failed to create virtual account with Flutterwave");
  }
}

export async function verifyFlutterwaveTransaction(
  transactionId: number
): Promise<any> {
  try {
    const response = await flutterwaveClient.get(
      `/transactions/${transactionId}/verify`
    );
    return response.data.data;
  } catch (error) {
    console.error("[FLUTTERWAVE VERIFY ERROR]", error);
    throw new Error("Failed to verify transaction");
  }
}
