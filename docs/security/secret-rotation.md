# Credential review and rotation

## Current state

The evaluation Admin password was shared in a conversation and must be treated as compromised. Do not reuse or send it. No production credential was read or changed in this audit. The owner previously confirmed the Wialon token was supplied by GPS Control and was not published; this audit did not inspect or rotate it.

## Rotate Admin access without lockout

1. Over HTTPS, while signed in to the existing Admin account, create a second Admin backup account. Use a unique temporary password with at least 12 characters, a letter and a number. Require password change at first sign-in. Never place the password in this document, repository, screenshot or shell history.
2. Sign out and sign in with the backup account. Complete the required password change. Confirm the account role and that Administration is accessible.
3. While keeping the backup account available, sign in to the primary Admin account and change its password in the application. Password change revokes sessions; sign in again with the new password and confirm Admin access. If that fails, recover through the backup account.
4. With Admin, create a temporary non-admin user and verify first-login password change. Sign in as that user and confirm the forced change before using the app. Verify Viewer/Operator cannot perform an Admin-only action. Then deactivate or remove the temporary user.
5. Send only the newly verified evaluation credential over a private channel. Keep the backup Admin until evaluation is complete.
6. Changing ADMIN_PASSWORD in hosting settings does not update an already-created database user; it is not the rotation mechanism for an existing account.

## Other provider credentials

- Neon: if the database password is rotated, update the provider variable, retain TLS and verify DB connection/migrations.
- JWT: use distinct random values per environment; rotation invalidates sessions.
- Do not copy secrets into tickets, shell history, screenshots, docs or commits. Enter them only in the hosting dashboard or ignored local files.

## Verification

After a rotation, verify health, database connection/migrations, Admin login, refresh and logout. Do not record rotation as complete without owner confirmation and service verification. Do not rotate the Wialon token as part of this audit.
