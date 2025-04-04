// Configuration for model token cost multipliers
// Used to calculate adjusted token costs for billing/quota purposes

interface ModelCostConfig {
  // Default multiplier is 1.0 (no adjustment)
  defaultMultiplier: number;
  // Model-specific multipliers
  modelMultipliers: Record<string, number>;
  // Provider-specific multipliers (applied if no model-specific multiplier found)
  providerMultipliers: Record<string, number>;
}

// Easy to edit cost multipliers for different models
export const modelCostConfig: ModelCostConfig = {
  defaultMultiplier: 1.0,
  
  // Set specific model multipliers (model name as key)
  modelMultipliers: {
    'o3-mini': 2.0,
    'o1-mini': 2.0,
    'gpt-4o': 2.0,
    'claude-3-opus': 8.0,
    'claude-3.7-sonnet': 2.3,
    'gemini-pro': 1.0,
    'gemini-ultra': 2.5,
    // Add more models as needed
  },
  
  // Set provider-level multipliers (fallback if model not found)
  providerMultipliers: {
    'openai': 1.0,
    'anthropic': 1.5,
    'google': 1.0,
    'deepseek': 0.8,
    // Add more providers as needed
  }
};

/**
 * Gets the cost multiplier for a specific model and provider
 * @param model The model name
 * @param provider The provider name
 * @returns The applicable cost multiplier
 */
export function getModelCostMultiplier(model?: string, provider?: string): number {
  if (!model && !provider) return modelCostConfig.defaultMultiplier;
  
  // Check if we have a model-specific multiplier
  if (model && modelCostConfig.modelMultipliers[model]) {
    return modelCostConfig.modelMultipliers[model];
  }
  
  // Fall back to provider multiplier
  if (provider && modelCostConfig.providerMultipliers[provider]) {
    return modelCostConfig.providerMultipliers[provider];
  }
  
  // Default multiplier if nothing matches
  return modelCostConfig.defaultMultiplier;
} 