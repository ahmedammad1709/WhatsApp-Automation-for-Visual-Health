// Legacy AI flow helper is no longer used. Time slots and time-based capacity
// logic have been removed in favor of date-only, capacity-based scheduling.
// This file is kept minimal for backward compatibility but exports only the
// processUserMessage passthrough.

async function processUserMessage(from, text) {
  const { processUserMessage: processMessage } = await import('./whatsappService.js');
  return processMessage(from, text);
}

export { processUserMessage };
