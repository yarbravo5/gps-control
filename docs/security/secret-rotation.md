# Credential review and rotation

## Current state

The account shared earlier was a test Admin account. The owner clarified that the real evaluation Admin account has different credentials and they were not shared in the conversation. Do not label the real account compromised and do not change its password automatically. This audit did not read or change any production credential. If the shared test account remains active, the owner should disable or rotate it from an authorized session.

## Verify the real evaluation Admin account

1. From the owner's secure device and network, open the production URL and sign in with the real evaluation Admin credentials. Never enter them into this agent, a shell command, a screenshot or a repository file.
2. Confirm the account can open user administration and has permission to create users. The owner can inspect the current user profile and role without sharing the password.
3. Create a temporary non-admin test user with a unique 12+ character password that meets the letter/number policy and mandatory first-login change. Deliver that temporary password only to the tester through a private channel.
4. Sign in with the test user, confirm the forced password-change page, then verify the permitted Viewer/Operator actions and that an Admin-only action is denied. Remove or deactivate this test user after the check.
5. If a password rotation of the real account is desired, first create and verify a second Admin account as backup, then rotate the primary through the application, sign in again and confirm the role. Do this only on the owner's instruction; the real account is not known to be compromised.
6. If the earlier shared test Admin account is still active, disable it or rotate it from an authorized Admin session. Do not use it as the evaluator account.
7. Changing ADMIN_PASSWORD in hosting settings does not update an already-created database user; it is not a rotation method for an existing account.

## Other provider credentials

- Neon: if the database password is rotated, update the provider variable, retain TLS and verify DB connection/migrations.
- JWT: use distinct random values per environment; rotation invalidates sessions.
- Do not copy secrets into tickets, shell history, screenshots, docs or commits. Enter them only in the hosting dashboard or ignored local files.

## Verification

After the owner verifies access, confirm health, database-backed Admin login, refresh/logout, user creation, forced first-login password change and role denials. Do not record account validation as complete without owner confirmation. Do not rotate the Wialon token as part of this audit.
