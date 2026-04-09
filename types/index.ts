export enum UserRole {
  USER = "USER",
  AGENT = "AGENT",
  ADMIN = "ADMIN",
}

export enum TransactionStatus {
  PENDING = "PENDING",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
}

export enum TransactionType {
  DATA = "DATA",
  AIRTIME = "AIRTIME",
  FUND_WALLET = "FUND_WALLET",
}

export enum RewardType {
  REFERRAL = "REFERRAL",
  LOYALTY = "LOYALTY",
  BONUS = "BONUS",
  CASHBACK = "CASHBACK",
}

export interface User {
  id: string;
  phone: string;
  pinHash: string;
  name: string;
  role: UserRole;
  balance: number;
  isBanned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  dataSize: string;
  validity: number;
  network: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  planId?: string;
  phoneNumber?: string;
  description?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
}

export interface VirtualAccount {
  id: string;
  userId: string;
  accountNumber: string;
  bankName: string;
  bankCode: string;
  flutterwaveId: number;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Reward {
  id: string;
  type: RewardType;
  title: string;
  description: string;
  value: number;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserReward {
  id: string;
  userId: string;
  rewardId: string;
  claimed: boolean;
  claimedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  reward?: Reward;
  user?: User;
}

export interface AdminStats {
  totalUsers: number;
  totalTransactions: number;
  totalRevenue: number;
  successfulTransactions: number;
  pendingTransactions: number;
  recentTransactions: Transaction[];
}

export interface TempPayment {
  id: string;
  userId: string;
  amount: number;
  status: TransactionStatus;
  flutterwaveRef?: string;
  createdAt: Date;
  updatedAt: Date;
}
