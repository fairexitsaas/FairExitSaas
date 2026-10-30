const fs = require('fs')
const path = require('path')
const { Client } = require('pg')
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') })
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') })

async function pushDatabase() {
  const dbUrl =
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    process.env.POSTGRES_URL

  if (!dbUrl) {
    console.error(`
❌ DATABASE_URL is not set in backend/.env.

To push migrations directly from terminal:
1. Go to your Supabase Dashboard -> Project Settings -> Database -> Connection string -> URI.
2. Add DATABASE_URL to your backend/.env:
   DATABASE_URL=postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
3. Run: npm run db:push

Alternatively, you can copy the SQL script from:
backend/sql/001_create_profiles.sql
and paste it directly into Supabase Dashboard -> SQL Editor!
`)
    process.exit(1)
  }

  const sqlPath = path.resolve(__dirname, '..', 'sql', '001_create_profiles.sql')
  const sqlContent = fs.readFileSync(sqlPath, 'utf8')

  console.log('Connecting to Supabase PostgreSQL database...')
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  })

  try {
    await client.connect()
    console.log('Connected! Executing 001_create_profiles.sql...')
    await client.query(sqlContent)
    console.log('✅ Migration executed successfully! profiles table with ADMIN/USER role created.')
  } catch (err) {
    console.error('❌ Database migration failed:', err.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

pushDatabase()

