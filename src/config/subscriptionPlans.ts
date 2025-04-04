// Subscription plan definitions and token limits

export enum PlanType {
  Free = 'free',
  Basic = 'basic',
  Pro = 'pro',
  Enterprise = 'enterprise',
}

export interface SubscriptionPlan {
  id: PlanType;
  name: string;
  description: string;
  monthlyTokenLimit: number;
  toolCallLimit: number;
  price: {
    monthly: number;
    yearly: number;
  };
  features: string[];
  extraTokenPrice: number; // Price per 1000 additional tokens
  extraToolCallPrice: number; // Price per additional tool call
}

// Default plans configuration
export const subscriptionPlans: Record<PlanType, SubscriptionPlan> = {
  [PlanType.Free]: {
    id: PlanType.Free,
    name: 'Free',
    description: 'Limited access for personal use',
    monthlyTokenLimit: 100000, // 100k tokens per month
    toolCallLimit: 50, // 50 tool calls per month
    price: {
      monthly: 0,
      yearly: 0,
    },
    features: [
      'Access to basic models',
      'Limited to 100k tokens/month',
      '50 tool calls per month',
      'No priority support',
    ],
    extraTokenPrice: 0, // Free users can't purchase extra tokens
    extraToolCallPrice: 0, // Free users can't purchase extra tool calls
  },
  [PlanType.Basic]: {
    id: PlanType.Basic,
    name: 'Basic',
    description: 'Perfect for casual users',
    monthlyTokenLimit: 500000, // 500k tokens per month
    toolCallLimit: 200, // 200 tool calls per month
    price: {
      monthly: 9.99,
      yearly: 99.99,
    },
    features: [
      'Access to all available models',
      '500k tokens per month',
      '200 tool calls per month',
      'Email support',
      'Ability to purchase extra tokens',
    ],
    extraTokenPrice: 2.99, // $2.99 per 1000 extra tokens
    extraToolCallPrice: 0.10, // $0.10 per extra tool call
  },
  [PlanType.Pro]: {
    id: PlanType.Pro,
    name: 'Pro',
    description: 'For professionals and power users',
    monthlyTokenLimit: 2000000, // 2M tokens per month
    toolCallLimit: 1000, // 1000 tool calls per month
    price: {
      monthly: 29.99,
      yearly: 299.99,
    },
    features: [
      'Priority access to all models',
      '2M tokens per month',
      '1000 tool calls per month',
      'Priority support',
      'Discounted extra tokens',
      'API access',
    ],
    extraTokenPrice: 1.99, // $1.99 per 1000 extra tokens
    extraToolCallPrice: 0.05, // $0.05 per extra tool call
  },
  [PlanType.Enterprise]: {
    id: PlanType.Enterprise,
    name: 'Enterprise',
    description: 'Custom solution for teams and organizations',
    monthlyTokenLimit: 10000000, // 10M tokens per month
    toolCallLimit: 5000, // 5000 tool calls per month
    price: {
      monthly: 99.99,
      yearly: 999.99,
    },
    features: [
      'Unlimited access to all models',
      '10M tokens per month',
      '5000 tool calls per month',
      'Dedicated support',
      'Heavily discounted extra tokens',
      'Advanced API access',
      'Custom integrations',
    ],
    extraTokenPrice: 0.99, // $0.99 per 1000 extra tokens
    extraToolCallPrice: 0.02, // $0.02 per extra tool call
  },
};

export interface UserSubscription {
  plan: PlanType;
  expiresAt: Date;
  extraTokens: number; // Additional purchased tokens
  extraToolCalls: number; // Additional purchased tool calls
}

// Mock function to get user subscription - to be replaced with actual implementation
export const getUserSubscription = async (userId: string): Promise<UserSubscription> => {
  // This would typically fetch from your database
  return {
    plan: PlanType.Basic, // Default to Basic for testing
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    extraTokens: 5000, // 5000 additional tokens
    extraToolCalls: 20, // 20 additional tool calls
  };
};

// Calculate total available tokens for a user (plan limit + extra purchased tokens)
export const calculateUserTokenLimit = (subscription: UserSubscription): number => {
  const plan = subscriptionPlans[subscription.plan];
  return plan.monthlyTokenLimit + subscription.extraTokens;
};

// Calculate total available tool calls for a user (plan limit + extra purchased calls)
export const calculateUserToolCallLimit = (subscription: UserSubscription): number => {
  const plan = subscriptionPlans[subscription.plan];
  return plan.toolCallLimit + subscription.extraToolCalls;
}; 