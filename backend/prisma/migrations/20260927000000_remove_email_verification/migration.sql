-- Email verification and emailed password-reset links are gone: accounts are
-- created by the school administrator (no self-registration, no verification
-- email), and forgotten passwords are recovered through an in-app request the
-- administrator fulfils with a default password.
ALTER TABLE "Account"
  DROP COLUMN "emailVerifiedAt",
  DROP COLUMN "verificationTokenHash",
  DROP COLUMN "verificationExpiresAt",
  DROP COLUMN "passwordResetTokenHash",
  DROP COLUMN "passwordResetExpiresAt";

-- The replacement: a flag the admin portal surfaces as a badge/list so the
-- administrator can see who asked for a reset.
ALTER TABLE "Account" ADD COLUMN "passwordResetRequestedAt" TIMESTAMP(3);
