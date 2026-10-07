# send-reminders

Push notifications for bills and debts coming due, budgets past 80% / 100%, and the
evening check-in. pg_cron calls this function every hour; it asks `due_reminders()` what's
due, sends it with Web Push and records it in `notification_log`.

## Setup (once)

1. **VAPID keys** — the key pair that signs pushes:

   ```sh
   npx web-push generate-vapid-keys
   ```

2. **App env** (Vercel and `.env`): `VITE_VAPID_PUBLIC_KEY=<public key>`, then redeploy.
   Without it the Notifications row says it isn't available.

3. **Function secrets** and deploy (Supabase CLI, linked to the project):

   ```sh
   supabase secrets set VAPID_PUBLIC_KEY=<public> VAPID_PRIVATE_KEY=<private> \
     VAPID_SUBJECT=mailto:you@example.com REMINDERS_SECRET=<long random string>
   supabase functions deploy send-reminders --no-verify-jwt
   ```

   `--no-verify-jwt` because the cron job has no user token; the function checks
   `REMINDERS_SECRET` itself, and a test from the app checks the user's token.

4. **Migration** `20261008000100_reminders.sql` in the SQL editor, then the two Vault
   secrets the hourly job reads:

   ```sql
   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
   select vault.create_secret('<same REMINDERS_SECRET>', 'reminders_secret');
   ```

## Checking it

- Menu → Notifications → Turn on, then **Send a test**.
- Job runs: `select * from cron.job_run_details order by start_time desc limit 5;`
- Responses: `select * from net._http_response order by created desc limit 5;`
- What would go out now: `select * from due_reminders();`
