import { prisma } from "@/lib/db";
import { createReservedVirtualAccount } from "@/lib/billstack-core.mjs";

export type BillstackBank = "9PSB" | "SAFEHAVEN" | "PROVIDUS" | "BANKLY" | "PALMPAY";

const SIGNUP_BANK_FALLBACK: BillstackBank[] = ["PALMPAY", "9PSB", "SAFEHAVEN"];

function isMissingUserBankAccountsTable(error: unknown) {
  if (typeof error !== "object" || error === null) return false;
  if (!("code" in error) || (error as { code?: string }).code !== "P2021") return false;
  const table = String((error as { meta?: { table?: string } }).meta?.table || "");
  return table.includes("user_bank_accounts");
}

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
  try {
    const accounts = await prisma.userBankAccount.findMany({
      where: { userId },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    });
    if (accounts.length > 0) return accounts;
  } catch (error) {
    if (!isMissingUserBankAccountsTable(error)) {
      throw error;
    }
  }

  const legacy = await prisma.virtualAccount.findUnique({
    where: { userId },
  });
  if (!legacy) return [];

  return [
    {
      id: `legacy-${legacy.id}`,
      userId,
      bankCode: "LEGACY",
      accountNumber: legacy.accountNumber,
      accountName: null,
      bankName: legacy.bankName,
      merchantReference: legacy.orderRef,
      providerReference: legacy.flwRef,
      isPrimary: true,
      createdAt: legacy.createdAt,
      updatedAt: legacy.createdAt,
    },
  ];
}

export async function createBillstackBankAccount(params: CreateAccountParams) {
  let supportsUserBankAccounts = true;
  let existingForBank: Awaited<ReturnType<typeof prisma.userBankAccount.findUnique>> | null = null;

  try {
    existingForBank = await prisma.userBankAccount.findUnique({
      where: {
        userId_bankCode: {
          userId: params.userId,
          bankCode: params.bank,
        },
      },
    });
  } catch (error) {
    if (isMissingUserBankAccountsTable(error)) {
      supportsUserBankAccounts = false;
    } else {
      throw error;
    }
  }

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

  if (!supportsUserBankAccounts) {
    await prisma.virtualAccount.upsert({
      where: { userId: params.userId },
      update: {
        accountNumber: result.accountNumber,
        bankName: result.bankName,
        flwRef: result.providerReference,
        orderRef: merchantReference,
      },
      create: {
        userId: params.userId,
        accountNumber: result.accountNumber,
        bankName: result.bankName,
        flwRef: result.providerReference,
        orderRef: merchantReference,
      },
    });

    return {
      created: true,
      reason: "created_legacy_mode",
      account: {
        id: `legacy-${params.userId}-${params.bank}`,
        userId: params.userId,
        bankCode: params.bank,
        accountNumber: result.accountNumber,
        accountName: result.accountName,
        bankName: result.bankName,
        merchantReference,
        providerReference: result.providerReference,
        isPrimary: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };
  }

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

  if (shouldBePrimary) {
    await prisma.virtualAccount.upsert({
      where: { userId: params.userId },
      update: {
        accountNumber: result.accountNumber,
        bankName: result.bankName,
        flwRef: result.providerReference,
        orderRef: merchantReference,
      },
      create: {
        userId: params.userId,
        accountNumber: result.accountNumber,
        bankName: result.bankName,
        flwRef: result.providerReference,
        orderRef: merchantReference,
      },
    });
  }

  return {
    created: true,
    reason: "created",
    account,
  };
}

export async function provisionSignupBillstackAccount(params: {
  userId: string;
  fullName: string;
  phone: string;
  email?: string | null;
}) {
  let lastError: unknown = null;

  for (const bank of SIGNUP_BANK_FALLBACK) {
    try {
      const provisioned = await createBillstackBankAccount({
        userId: params.userId,
        fullName: params.fullName,
        phone: params.phone,
        email: params.email,
        bank,
        makePrimary: true,
      });
      return {
        success: true,
        bank,
        account: provisioned.account,
      };
    } catch (error) {
      lastError = error;
      console.error("[BILLSTACK SIGNUP FALLBACK FAILED]", {
        userId: params.userId,
        bank,
        message: error instanceof Error ? error.message : "unknown_error",
      });
    }
  }

  return {
    success: false,
    error: lastError instanceof Error ? lastError.message : "Could not create reserved account",
  };
}
