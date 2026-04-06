/**
 * Configurable system prompts for AI behavior customization
 */

export interface SystemPromptConfig {
  includeDate?: boolean
  responseStyle?: 'professional' | 'friendly' | 'concise' | 'detailed'
  language?: 'auto' | 'en' | 'ja' | 'multilingual'
  specialization?: string[]
  outputFormat?: 'markdown' | 'plain' | 'structured'
  customInstructions?: string
}

/**
 * Generate a system prompt based on configuration
 */
export function generateSystemPrompt(config: SystemPromptConfig = {}): string {
  const parts: string[] = []
  
  // Current date context
  if (config.includeDate !== false) {
    const currentDate = new Date()
    parts.push(
      `Today's date is ${currentDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}, ${currentDate.getFullYear()}.`,
      `The current year is ${currentDate.getFullYear()}.`,
      `When referring to "latest" or "current" information, prioritize ${currentDate.getFullYear()} content.`
    )
  }
  
  // Response style
  if (config.responseStyle) {
    const stylePrompts = {
      professional: 'Maintain a professional, formal tone in all responses.',
      friendly: 'Be friendly and approachable. Use a conversational tone.',
      concise: 'Provide brief, direct answers. Avoid unnecessary elaboration.',
      detailed: 'Provide comprehensive, detailed explanations with examples.'
    }
    parts.push(stylePrompts[config.responseStyle])
  }
  
  // Language preference
  if (config.language) {
    const languagePrompts = {
      auto: 'Always respond in the same language as the user\'s message.',
      en: 'Always respond in English.',
      ja: 'Always respond in Japanese (日本語で応答してください).',
      multilingual: 'Detect the user\'s language and respond accordingly. Support English, Japanese, and other major languages.'
    }
    parts.push(languagePrompts[config.language])
  }
  
  // Specialization
  if (config.specialization && config.specialization.length > 0) {
    parts.push(
      `You are specialized in: ${config.specialization.join(', ')}.`,
      'Leverage this expertise in your responses when relevant.'
    )
  }
  
  // Output format
  if (config.outputFormat) {
    const formatPrompts = {
      markdown: 'Format responses using Markdown. Use headers, lists, code blocks, and emphasis appropriately.',
      plain: 'Use plain text without any formatting.',
      structured: 'Structure responses with clear sections: Overview, Details, Examples (if applicable), and Summary.'
    }
    parts.push(formatPrompts[config.outputFormat])
  }
  
  // Custom instructions
  if (config.customInstructions) {
    parts.push(config.customInstructions)
  }
  
  return parts.join('\n')
}

/**
 * Preset configurations for common use cases
 */
export const SystemPromptPresets = {
  // Default: Balanced assistant
  default: {
    includeDate: true,
    responseStyle: 'friendly' as const,
    language: 'auto' as const,
    outputFormat: 'markdown' as const
  },
  
  // Technical: For coding assistance
  technical: {
    includeDate: true,
    responseStyle: 'concise' as const,
    language: 'auto' as const,
    specialization: ['software development', 'debugging', 'code optimization'],
    outputFormat: 'markdown' as const,
    customInstructions: 'Always include code examples when relevant. Explain technical concepts clearly.'
  },
  
  // Business: Professional communication
  business: {
    includeDate: true,
    responseStyle: 'professional' as const,
    language: 'auto' as const,
    outputFormat: 'structured' as const,
    customInstructions: 'Focus on actionable insights and strategic recommendations.'
  },
  
  // Creative: For creative tasks
  creative: {
    includeDate: true,
    responseStyle: 'friendly' as const,
    language: 'auto' as const,
    customInstructions: 'Be creative and think outside the box. Offer multiple perspectives and innovative solutions.'
  },
  
  // Educational: For learning and teaching
  educational: {
    includeDate: true,
    responseStyle: 'detailed' as const,
    language: 'auto' as const,
    outputFormat: 'structured' as const,
    customInstructions: 'Explain concepts step-by-step. Use analogies and examples to clarify complex topics. Check understanding with follow-up questions.'
  }
}

/**
 * User preference-based system prompt
 * This can be stored in user_profiles table
 */
export interface UserSystemPromptPreferences {
  userId: string
  preset?: keyof typeof SystemPromptPresets
  customConfig?: SystemPromptConfig
  enabled: boolean
}

/**
 * Get system prompt for a specific user
 */
export function getUserSystemPrompt(
  preferences?: UserSystemPromptPreferences
): string {
  if (!preferences || !preferences.enabled) {
    return generateSystemPrompt(SystemPromptPresets.default)
  }
  
  if (preferences.preset) {
    const presetConfig = SystemPromptPresets[preferences.preset]
    const mergedConfig = {
      ...presetConfig,
      ...preferences.customConfig
    }
    return generateSystemPrompt(mergedConfig)
  }
  
  return generateSystemPrompt(preferences.customConfig || SystemPromptPresets.default)
}