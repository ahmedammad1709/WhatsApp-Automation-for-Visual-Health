import 'dotenv/config';
import { runOnce } from './reminder24h.js';

// Allow passing simulated today as first argument (YYYY-MM-DD)
const simulateTodayArg = process.argv[2] || process.env.REMINDER_SIMULATED_TODAY || null;

runOnce({ simulateToday: simulateTodayArg })
  .then(() => {
    console.log('[REMINDER 24H] Manual run completed.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[REMINDER 24H] Manual run failed:', err);
    process.exit(1);
  });

