const app = require('./app');
const env = require('./config/env');
const { connectDatabase } = require('./config/database');
const { migrateLegacyBookingStatuses } = require('./services/booking-migration.service');
const { syncBookingStatusesByDate } = require('./services/booking-status.service');

async function bootstrap() {
  await connectDatabase();
  const migratedCount = await migrateLegacyBookingStatuses();
  if (migratedCount > 0) {
    // eslint-disable-next-line no-console
    console.log(`[Startup] Migrated ${migratedCount} legacy booking statuses.`);
  }

  setInterval(async () => {
    try {
      const updated = await syncBookingStatusesByDate();
      if (updated > 0) {
        // eslint-disable-next-line no-console
        console.log(`[Cron] Updated ${updated} booking statuses by date.`);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[Cron] Failed to update booking statuses:', error);
    }
  }, 10 * 60 * 1000);

  const server = app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`connected and runs on port: ${env.port}`);
  });

  server.on('error', (error) => {
    if (error && error.code === 'EADDRINUSE') {
      // eslint-disable-next-line no-console
      console.error(
        `[Startup] Port ${env.port} is already in use. Stop the existing process or change PORT in Backend/.env`
      );
      process.exit(1);
      return;
    }

    // eslint-disable-next-line no-console
    console.error('[Startup] Server failed to start:', error);
    process.exit(1);
  });
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server:', error);
  process.exit(1);
});
