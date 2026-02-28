/**
 * @fileoverview Plan Types - Conversion Platform Billing Types
 *
 * Extended types for the ADA billing system supporting milestone-based trials,
 * invoices, and conversion tracking integration.
 *
 * These types complement the existing Tier-based types in types.ts with
 * Plan-centric types for the conversion platform (ADR C1266).
 *
 * @see docs/architecture/adr-trial-conversion-platform-c1266.md
 * @see docs/product/sprint3-trial-conversion-acceptance-criteria-c1267.md
 */

// ============================================================================
// Plan Types (Conversion Platform)
// ============================================================================

/**
 * Plan tier identifiers for the conversion platform.
 * Maps to the existing Tier type but uses Plan-centric naming.
 */
export type PlanTier = 'free' | 'pro' | 'enterprise';

/**
 * Billing interval for subscriptions.
 */
export type PlanBillingInterval = 'monthly' | 'yearly';

/**
 * Plan features and limits for conversion tracking.
 */
export interface PlanLimits {
  /** Maximum dispatch cycles per month (null = unlimited) */
  cyclesPerMonth: number | null;
  /** Maximum active repos */
  maxRepos: number;
  /** Maximum team members */
  maxTeamMembers: number;
  /** API rate limit per minute (per C1276 ADR) */
  apiRateLimit: number;
  /** Memory bank size limit in KB */
  memoryBankSizeKb: number;
  /** History retention in days */
  historyRetentionDays: number;
}

/**
 * Plan feature flags.
 */
export interface PlanFeatures {
  /** Access to GitHub integration */
  githubIntegration: boolean;
  /** Priority support */
  prioritySupport: boolean;
  /** Custom roles */
  customRoles: boolean;
  /** Advanced analytics */
  advancedAnalytics: boolean;
  /** API access */
  apiAccess: boolean;
  /** Webhook notifications */
  webhooks: boolean;
  /** SSO authentication */
  sso: boolean;
  /** Audit logs */
  auditLogs: boolean;
  /** Custom agent models */
  customModels: boolean;
}

/**
 * Pricing information for a plan.
 */
export interface PlanPricing {
  /** Monthly price in cents (USD) */
  monthlyPriceCents: number;
  /** Yearly price in cents (USD) - typically discounted */
  yearlyPriceCents: number;
  /** Stripe price IDs for checkout */
  stripePriceIds: {
    monthly: string;
    yearly: string;
  };
}

/**
 * Complete plan definition for conversion tracking.
 */
export interface Plan {
  /** Unique plan identifier */
  id: string;
  /** Plan tier */
  tier: PlanTier;
  /** Display name */
  name: string;
  /** Plan description */
  description: string;
  /** Plan limits */
  limits: PlanLimits;
  /** Plan features */
  features: PlanFeatures;
  /** Pricing (null for free tier) */
  pricing: PlanPricing | null;
  /** Whether this plan is currently available */
  isActive: boolean;
  /** Sort order for display */
  sortOrder: number;
}

// ============================================================================
// Trial Types (Milestone-Based)
// ============================================================================

/**
 * Trial information for milestone-based trials (per C1266 ADR).
 */
export interface MilestoneTrialInfo {
  /** Trial start date */
  startedAt: Date;
  /** Trial end date (extended by milestones) */
  endsAt: Date;
  /** Whether trial has ended */
  hasEnded: boolean;
  /** Days remaining in trial */
  daysRemaining: number;
  /** Total trial days (base + milestone bonuses) */
  totalDays: number;
  /** Milestone bonuses applied */
  milestoneBonuses: {
    milestoneId: string;
    daysAdded: number;
    appliedAt: Date;
  }[];
}

// ============================================================================
// Invoice Types
// ============================================================================

/**
 * Invoice status matching Stripe's invoice status.
 */
export type InvoiceStatus =
  | 'draft'
  | 'open'
  | 'paid'
  | 'void'
  | 'uncollectible';

/**
 * Individual line item on an invoice.
 */
export interface InvoiceLineItem {
  /** Line item ID */
  id: string;
  /** Description */
  description: string;
  /** Quantity */
  quantity: number;
  /** Unit amount in cents */
  unitAmountCents: number;
  /** Total amount in cents */
  amountCents: number;
  /** Period covered */
  period: {
    start: Date;
    end: Date;
  };
}

/**
 * Tax information on an invoice.
 */
export interface InvoiceTax {
  /** Tax rate percentage */
  rate: number;
  /** Tax amount in cents */
  amountCents: number;
  /** Tax description */
  description: string;
}

/**
 * Complete invoice record.
 */
export interface Invoice {
  /** Unique invoice ID (internal) */
  id: string;
  /** Stripe invoice ID */
  stripeInvoiceId: string;
  /** Invoice number */
  number: string;
  /** User ID */
  userId: string;
  /** Subscription ID */
  subscriptionId: string;
  /** Invoice status */
  status: InvoiceStatus;
  /** Currency code (e.g., 'usd') */
  currency: string;
  /** Subtotal in cents */
  subtotalCents: number;
  /** Tax information */
  tax?: InvoiceTax;
  /** Total in cents */
  totalCents: number;
  /** Amount paid in cents */
  amountPaidCents: number;
  /** Amount due in cents */
  amountDueCents: number;
  /** Line items */
  lineItems: InvoiceLineItem[];
  /** Invoice creation date */
  createdAt: Date;
  /** Due date */
  dueDate?: Date;
  /** Paid date */
  paidAt?: Date;
  /** PDF URL for the invoice */
  pdfUrl?: string;
  /** Hosted invoice URL */
  hostedInvoiceUrl?: string;
}

// ============================================================================
// Payment Types
// ============================================================================

/**
 * Payment method type.
 */
export type PaymentMethodType = 'card' | 'bank_account' | 'paypal';

/**
 * Card brand for card payments.
 */
export type CardBrand =
  | 'visa'
  | 'mastercard'
  | 'amex'
  | 'discover'
  | 'diners'
  | 'jcb'
  | 'unionpay'
  | 'unknown';

/**
 * Payment method details.
 */
export interface PaymentMethod {
  /** Unique ID */
  id: string;
  /** Stripe payment method ID */
  stripePaymentMethodId: string;
  /** Payment method type */
  type: PaymentMethodType;
  /** Whether this is the default payment method */
  isDefault: boolean;
  /** Card details (for card type) */
  card?: {
    brand: CardBrand;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  /** Created date */
  createdAt: Date;
}

// ============================================================================
// Billing Event Types (Conversion Integration)
// ============================================================================

/**
 * Billing event types for conversion tracking integration.
 */
export type BillingEventType =
  | 'subscription.created'
  | 'subscription.updated'
  | 'subscription.cancelled'
  | 'subscription.trial_started'
  | 'subscription.trial_ending'
  | 'subscription.trial_ended'
  | 'invoice.created'
  | 'invoice.paid'
  | 'invoice.payment_failed'
  | 'payment_method.added'
  | 'payment_method.removed'
  | 'usage.limit_approaching'
  | 'usage.limit_reached';

/**
 * Billing event for analytics and conversion tracking.
 */
export interface BillingEvent {
  /** Event ID */
  id: string;
  /** Event type */
  type: BillingEventType;
  /** User ID */
  userId: string;
  /** Related subscription ID */
  subscriptionId?: string;
  /** Related invoice ID */
  invoiceId?: string;
  /** Event timestamp */
  timestamp: Date;
  /** Event metadata */
  metadata: Record<string, unknown>;
}

// ============================================================================
// Customer Types
// ============================================================================

/**
 * Billing customer information for conversion tracking.
 */
export interface BillingCustomer {
  /** User ID */
  userId: string;
  /** Stripe customer ID */
  stripeCustomerId: string;
  /** Email address */
  email: string;
  /** Display name */
  name?: string;
  /** Default payment method */
  defaultPaymentMethod?: PaymentMethod;
  /** Customer creation date */
  createdAt: Date;
  /** Last update date */
  updatedAt: Date;
}

// ============================================================================
// Default Plan Configuration
// ============================================================================

/**
 * Default plan configurations matching API Gateway tiers (C1276).
 */
export const DEFAULT_PLANS: Readonly<Plan[]> = Object.freeze([
  {
    id: 'plan_free',
    tier: 'free',
    name: 'Free',
    description: 'Perfect for trying out ADA',
    limits: {
      cyclesPerMonth: 50,
      maxRepos: 1,
      maxTeamMembers: 1,
      apiRateLimit: 60, // 60 req/min per C1276
      memoryBankSizeKb: 256,
      historyRetentionDays: 7,
    },
    features: {
      githubIntegration: true,
      prioritySupport: false,
      customRoles: false,
      advancedAnalytics: false,
      apiAccess: false,
      webhooks: false,
      sso: false,
      auditLogs: false,
      customModels: false,
    },
    pricing: null,
    isActive: true,
    sortOrder: 1,
  },
  {
    id: 'plan_pro',
    tier: 'pro',
    name: 'Pro',
    description: 'For serious developers and small teams',
    limits: {
      cyclesPerMonth: null, // Unlimited
      maxRepos: 10,
      maxTeamMembers: 5,
      apiRateLimit: 300, // 300 req/min per C1276
      memoryBankSizeKb: 2048,
      historyRetentionDays: 90,
    },
    features: {
      githubIntegration: true,
      prioritySupport: true,
      customRoles: true,
      advancedAnalytics: true,
      apiAccess: true,
      webhooks: true,
      sso: false,
      auditLogs: false,
      customModels: false,
    },
    pricing: {
      monthlyPriceCents: 2900, // $29/month
      yearlyPriceCents: 29000, // $290/year (~17% discount)
      stripePriceIds: {
        monthly: 'price_pro_monthly',
        yearly: 'price_pro_yearly',
      },
    },
    isActive: true,
    sortOrder: 2,
  },
  {
    id: 'plan_enterprise',
    tier: 'enterprise',
    name: 'Enterprise',
    description: 'For organizations with advanced needs',
    limits: {
      cyclesPerMonth: null, // Unlimited
      maxRepos: null as unknown as number, // Unlimited (cast for type)
      maxTeamMembers: null as unknown as number, // Unlimited
      apiRateLimit: 1000, // 1000 req/min per C1276
      memoryBankSizeKb: 10240,
      historyRetentionDays: 365,
    },
    features: {
      githubIntegration: true,
      prioritySupport: true,
      customRoles: true,
      advancedAnalytics: true,
      apiAccess: true,
      webhooks: true,
      sso: true,
      auditLogs: true,
      customModels: true,
    },
    pricing: {
      monthlyPriceCents: 9900, // $99/month
      yearlyPriceCents: 99000, // $990/year (~17% discount)
      stripePriceIds: {
        monthly: 'price_enterprise_monthly',
        yearly: 'price_enterprise_yearly',
      },
    },
    isActive: true,
    sortOrder: 3,
  },
]);

// ============================================================================
// Trial Configuration (Milestone-Based)
// ============================================================================

/**
 * Configuration for trial days calculation.
 */
export interface TrialDaysConfig {
  /** Base trial days */
  baseDays: number;
  /** Maximum trial days (including bonuses) */
  maxDays: number;
  /** Milestone bonus days mapping */
  milestoneBonuses: Record<string, number>;
}

/**
 * Default trial configuration per C1266 ADR.
 */
export const DEFAULT_TRIAL_CONFIG: Readonly<TrialDaysConfig> = Object.freeze({
  baseDays: 7,
  maxDays: 42,
  milestoneBonuses: {
    first_dispatch: 7,
    magic_moment: 7,
    five_cycles: 7,
    pr_merged: 14,
    twenty_cycles: 0, // Feature unlock, not days
  },
});

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a plan tier is the free tier.
 */
export function isFreePlanTier(tier: PlanTier): tier is 'free' {
  return tier === 'free';
}

/**
 * Check if a trial has milestone bonuses.
 */
export function hasTrialBonuses(trial: MilestoneTrialInfo): boolean {
  return trial.milestoneBonuses.length > 0;
}

/**
 * Get a plan by ID from the default plans.
 */
export function getPlanById(planId: string): Plan | undefined {
  return DEFAULT_PLANS.find(p => p.id === planId);
}

/**
 * Get a plan by tier from the default plans.
 */
export function getPlanByTier(tier: PlanTier): Plan | undefined {
  return DEFAULT_PLANS.find(p => p.tier === tier);
}
