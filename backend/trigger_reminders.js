import 'dotenv/config';
import { runOnce } from './src/jobs/reminder24h.js';

// Manually trigger the job
// Use simulated date if provided, otherwise defaults to real today
// Example: node trigger_reminders.js 2026-01-07
// This will look for appointments on 2026-01-08

const simulatedToday = process.argv[2] || process.env.REMINDER_SIMULATED_TODAY || '2026-01-07';

console.log(`[MANUAL TRIGGER] Starting reminder job (Simulated Today: ${simulatedToday})...`);

runOnce({ simulateToday: simulatedToday })
  .then(() => {
    console.log('[MANUAL TRIGGER] Job completed.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[MANUAL TRIGGER] Job failed:', err);
    process.exit(1);
  });
