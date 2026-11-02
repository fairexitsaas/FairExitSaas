/**
 * Make a signed-up user an admin (or back to a normal user).
 *   npm run set-role -- someone@example.com ADMIN
 *   npm run set-role -- someone@example.com USER
 * Needs DATABASE_URL in backend/.env (same as db:push). The person must have signed up first.
 * Same as running in the Supabase SQL editor:  select public.set_user_role('someone@example.com', 'ADMIN');
 * The person must sign out and in again (or refresh their session) to get the new role in their token.
 */
const path = require('path')
const { Client } = require('pg')
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') })

async function main() {
  const [email, role = 'ADMIN'] = process.argv.slice(2)
  if (!email) {
    console.error('Usage: npm run set-role -- someone@example.com ADMIN|USER')
    process.exit(1)
  }
  const url = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || process.env.POSTGRES_URL
  if (!url) {
    console.error('DATABASE_URL is not set in backend/.env')
    process.exit(1)
  }
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    const r = await client.query('select public.set_user_role($1, $2) as msg', [email, role])
    console.log('✅ ' + r.rows[0].msg)
  } catch (e) {
    console.error('❌ ' + e.message)
    process.exitCode = 1
  } finally {
    await client.end()
  }
}
main()
