import { prisma } from "@/lib/db";
import { createReservedVirtualAccount } from "@/lib/billstack-core.mjs";

export type BillstackBank = "9PSB" | "SAFEHAVEN" | "PROVIDUS" | "BANKLY" | "PALMPAY";

const SIGNUP_BANK_FALLBACK: BillstackBank[] = ["PALMPAY", "9PSB", "SAFEHAVEN"];

function splitName(fullName: string) {
  const normalized = (fullName || "").trim().replace(/\s+/g, " ");
  if (!normalized) return { firstName: "Customer", lastName: "User" };
  const [first, ...rest] = normalized.split(" ");
  return {
    firstName: first || "Customer",
    lastName: rest.join(" ") || first || "User",
  };
}

function emailForProvision(phone: string, email?: string | null) {
  const normalized = (email || "").trim();
  return normalized || `${phone}@sydatasub.local`;
}

type CreateAccountParams = {
  userId: string;
  fullName: string;
  phone: string;
  email?: string | null;
  bank: BillstackBank;
  makePrimary?: boolean;
};

export async function listUserBankAccounts(userId: string) {
  return prisma.userBankAccount.findMany({
    where: { userId },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  });
}

export async function createBillstackBankAccount(params: CreateAccountParams) {
  const existingForBank = await prisma.userBankAccount.findUnique({
    where: {
      userId_bankCode: {
        userId: params.userId,
        bankCode: params.bank,
      },
    }
  });

  if (existingForBank) {
    return {
      created: false,
      reason: "exists_for_bank",
      account: existingForBank,
    };
  }

  const names = splitName(params.fullName);
  const merchantReference = `BS-VA-${params.userId}-${params.bank}`;

  const result = await createReservedVirtualAccount({
    reference: merchantReference,
    email: emailForProvision(params.phone, params.email),
    phone: params.phone,
    firstName: names.firstName,
    lastName: names.lastName,
    bank: params.bank,
  });

  const primaryAccount = await prisma.userBankAccount.findFirst({
    where: { userId: params.userId, isPrimary: true },
    select: { id: true },
  });

  const shouldBePrimary = Boolean(params.makePrimary || !primaryAccount);

  const account = await prisma.userBankAccount.create({
    data: {
      userId: params.userId,
      bankCode: params.bank,
      accountNumber: result.accountNumber,
      accountName: result.accountName,
      bankName: result.bankName,
      merchantReference,
      providerReference: result.providerReference,
      isPrimary: shouldBePrimary,
    },
  });

  return {
    created: true,
    reason: "created",
    account,
  };
}

export const SUPPORTED_BANKS: BillstackBank[] = ["PALMPAY", "9PSB", "SAFEHAVEN"];

export async function provisionSignupBillstackAccount(params: {
  userId: string;
  fullName: string;
  phone: string;
  email?: string | null;
}) {
  const createdAccounts: any[] = [];
  const failedBanks: Array<{ bank: string; error: string }> = [];

  for (let i = 0; i < SUPPORTED_BANKS.length; i++) {
    const bank = SUPPORTED_BANKS[i];
    try {
      const provisioned = await createBillstackBankAccount({
        userId: params.userId,
        fullName: params.fullName,
        phone: params.phone,
        email: params.email,
        bank,
        makePrimary: i === 0, // First successful becomes primary if none
      });
      if (provisioned.account) {
        createdAccounts.push(provisioned.account);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown_error";
      failedBanks.push({ bank, error: message });
      console.warn("[BILLSTACK SIGNUP PROVISION NOTICE]", {
        userId: params.userId,
        bank,
        message,
      });
    }
  }

  return {
    success: createdAccounts.length > 0,
    createdAccounts,
    failedBanks,
    count: createdAccounts.length,
  };
}
