// Ensures usage dashboard routes are testable in CI (override in shell if needed)
if (!process.env.ROISALEN_ADMIN_SECRET) {
  process.env.ROISALEN_ADMIN_SECRET = 'jest-test-admin-secret-ok';
}
