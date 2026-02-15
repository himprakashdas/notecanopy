/**
 * Converts technical error messages into simple, human-readable one-liners
 */
export function getReadableErrorMessage(error: unknown): string {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();

  // Network/connectivity errors
  if (
    lowerMessage.includes('fetch failed') ||
    lowerMessage.includes('network error') ||
    lowerMessage.includes('failed to fetch') ||
    lowerMessage.includes('deadline exceeded') ||
    lowerMessage.includes('timeout')
  ) {
    return 'Connection issue. Please check your internet.';
  }

  // Authentication errors
  if (
    lowerMessage.includes('unauthorized') ||
    lowerMessage.includes('api key') ||
    lowerMessage.includes('authentication') ||
    lowerMessage.includes('invalid key')
  ) {
    return 'Invalid API key. Check your settings.';
  }

  // Quota/rate limit errors
  if (
    lowerMessage.includes('quota') ||
    lowerMessage.includes('rate limit') ||
    lowerMessage.includes('too many requests')
  ) {
    return 'API quota exceeded. Try again later.';
  }

  // Safety/content filtering
  if (lowerMessage.includes('safety') || lowerMessage.includes('blocked')) {
    return 'Content was blocked by safety filters.';
  }

  // Model/availability errors
  if (
    lowerMessage.includes('model not found') ||
    lowerMessage.includes('unavailable') ||
    lowerMessage.includes('service unavailable')
  ) {
    return 'AI service temporarily unavailable.';
  }

  // Generic fallback
  return 'Something went wrong. Please try again.';
}
