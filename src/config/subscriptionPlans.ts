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
  extraTokenPrice: number;
  extraToolCallPrice: number;
  price: {
    monthly: number;
    yearly: number;
  };
  features: string[];
}

// Default plans configuration
export const subscriptionPlans: Record<PlanType, SubscriptionPlan> = {
  [PlanType.Free]: {
    id: PlanType.Free,
    name: 'Free Plan',
    description: 'Get started with basic access to AI assistants',
    monthlyTokenLimit: 500000, // 500K tokens
    toolCallLimit: 50,
    extraTokenPrice: 0.002, // $2 per 1000 tokens
    extraToolCallPrice: 0.1, // $0.10 per tool call
    price: {
      monthly: 0,
      yearly: 0,
    },
    features: [
      'Access to basic models',
      'Limited monthly tokens',
      'Limited tool calls',
      'Standard response times',
    ],
  },
  [PlanType.Basic]: {
    id: PlanType.Basic,
    name: 'Basic Plan',
    description: 'Ideal for personal or light professional use',
    monthlyTokenLimit: 2000000, // 2M tokens
    toolCallLimit: 300,
    extraTokenPrice: 0.0015, // $1.50 per 1000 tokens
    extraToolCallPrice: 0.08, // $0.08 per tool call
    price: {
      monthly: 9.99,
      yearly: 99.90,
    },
    features: [
      'All Free features',
      'Access to standard models',
      'Increased token limit',
      'More tool calls',
      'Priority response times',
    ],
  },
  [PlanType.Pro]: {
    id: PlanType.Pro,
    name: 'Pro Plan',
    description: 'For power users and professionals',
    monthlyTokenLimit: 5000000, // 5M tokens
    toolCallLimit: 1000,
    extraTokenPrice: 0.001, // $1 per 1000 tokens
    extraToolCallPrice: 0.05, // $0.05 per tool call
    price: {
      monthly: 19.99,
      yearly: 199.90,
    },
    features: [
      'All Basic features',
      'Access to advanced models',
      'High token limit',
      'Extensive tool calls',
      'Faster response times',
      'Early access to new features',
    ],
  },
  [PlanType.Enterprise]: {
    id: PlanType.Enterprise,
    name: 'Enterprise Plan',
    description: 'Custom solutions for teams and organizations',
    monthlyTokenLimit: 20000000, // 20M tokens
    toolCallLimit: 5000,
    extraTokenPrice: 0.0008, // $0.80 per 1000 tokens
    extraToolCallPrice: 0.03, // $0.03 per tool call
    price: {
      monthly: 49.99,
      yearly: 499.90,
    },
    features: [
      'All Pro features',
      'Access to all models',
      'Custom token limit',
      'Unlimited tool calls',
      'Dedicated support',
      'Custom feature development',
      'Team management',
    ],
  },
};

import { Pool } from '@neondatabase/serverless';
import { createPool } from '@vercel/postgres';

// Initialize database connection
const pool = process.env.POSTGRES_URL 
  ? createPool({ connectionString: process.env.POSTGRES_URL })
  : new Pool({ connectionString: process.env.DATABASE_URL });

// Define the user subscription interface
export interface UserSubscription {
  plan: PlanType;
  expiresAt: Date;
  extraTokens: number;
  extraToolCalls: number;
}

// Function to get user subscription data from the database
export const getUserSubscription = async (userId: string): Promise<UserSubscription> => {
  try {
    console.log(`[SUBSCRIPTION] Getting subscription data for user: ${userId}`);
    
    // Query the users table for subscription information
    const result = await pool.query(`
      SELECT subscription_tier, xtra_token, xtra_tool
      FROM users
      WHERE id = $1
    `, [userId]);
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      const plan = user.subscription_tier as PlanType || PlanType.Free;
      
      // Set expiration date to end of current month by default
      const now = new Date();
      const expiresAt = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of current month
      
      return {
        plan,
        expiresAt,
        extraTokens: user.xtra_token || 0,
        extraToolCalls: user.xtra_tool || 0,
      };
    }
    
    // Return default free subscription if user not found
    console.log(`[SUBSCRIPTION] User not found, returning default Free subscription`);
    const now = new Date();
    const expiresAt = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    return {
      plan: PlanType.Free,
      expiresAt,
      extraTokens: 0,
      extraToolCalls: 0,
    };
  } catch (error) {
    console.error('[SUBSCRIPTION] Error fetching user subscription data:', error);
    
    // Return default free subscription on error
    const now = new Date();
    const expiresAt = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    return {
      plan: PlanType.Free,
      expiresAt,
      extraTokens: 0,
      extraToolCalls: 0,
    };
  }
};

// Helper function to get total available tokens for a user
export const getUserTokenLimit = (tierName: string, extraTokens: number = 0) => {
  const tier = tierName as PlanType;
  if (!subscriptionPlans[tier]) return subscriptionPlans[PlanType.Free].monthlyTokenLimit + extraTokens;
  return subscriptionPlans[tier].monthlyTokenLimit + extraTokens;
};

// Helper function to get total available tool calls for a user
export const getUserToolCallLimit = (tierName: string, extraToolCalls: number = 0) => {
  const tier = tierName as PlanType;
  if (!subscriptionPlans[tier]) return subscriptionPlans[PlanType.Free].toolCallLimit + extraToolCalls;
  return subscriptionPlans[tier].toolCallLimit + extraToolCalls;
}; 