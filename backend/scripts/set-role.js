/**
 * Make a signed-up user an admin (or back to a normal user).
 *   npm run set-role -- someone@example.com ADMIN
 *   npm run set-role -- someone@example.com USER
 * 
 * Works with either:
 *   1. SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in backend/.env (Supabase Admin API)
 *   2. DATABASE_URL in backend/.env (direct PostgreSQL connection)
 */
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') })

async function updateViaSupabase(email, role) {
  const { createClient } = require('@supabase/supabase-js')
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Neither DATABASE_URL nor SUPABASE_SERVICE_ROLE_KEY is set in backend/.env')
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 1. Locate auth user
  const { data: userList, error: listErr } = await supabase.auth.admin.listUsers()
  if (listErr) throw listErr
  const targetUser = userList?.users?.find(
    (u) => (u.email || '').toLowerCase() === email.toLowerCase()
  )

  if (!targetUser) {
    throw new Error(`User with email "${email}" has not signed up in Supabase Auth yet.`)
  }

  // 2. Update auth user app_metadata & user_metadata
  const { error: authErr } = await supabase.auth.admin.updateUserById(targetUser.id, {
    app_metadata: { ...targetUser.app_metadata, role },
    user_metadata: { ...targetUser.user_metadata, role },
  })
  if (authErr) throw authErr

  // 3. Update public.profiles
  const { error: profErr } = await supabase
    .from('profiles')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', targetUser.id)

  if (profErr) {
    console.warn('Note: profiles table update error:', profErr.message)
  }

  console.log(`✅ User ${email} role successfully updated to ${role}.`)
}

async function updateViaPg(email, role, url) {
  const { Client } = require('pg')
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    const r = await client.query('select public.set_user_role($1, $2) as msg', [email, role])
    console.log('✅ ' + (r.rows?.[0]?.msg || `Role set to ${role}`))
  } finally {
    await client.end()
  }
}

async function main() {
  const [email, rawRole = 'ADMIN'] = process.argv.slice(2)
  if (!email) {
    console.error('Usage: npm run set-role -- someone@example.com ADMIN|USER')
    process.exit(1)
  }

  const role = rawRole.toUpperCase()
  if (role !== 'ADMIN' && role !== 'USER') {
    console.error('Role must be either ADMIN or USER')
    process.exit(1)
  }

  const url = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || process.env.POSTGRES_URL

  try {
    if (url) {
      try {
        await updateViaPg(email, role, url)
        return
      } catch (e) {
        console.warn('Direct PG connection failed, falling back to Supabase Admin API:', e.message)
      }
    }
    await updateViaSupabase(email, role)
  } catch (err) {
    console.error('❌ Failed to update role:', err.message)
    process.exitCode = 1
  }
}

main()
