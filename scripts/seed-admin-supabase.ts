/**
 * Seed script to create admin in database
 * Note: Admin must already exist in Supabase Auth
 * This script links the Supabase user to the database
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Replace with actual Supabase UID from Supabase Dashboard > Authentication
  const supabaseUid = process.env.SUPABASE_ADMIN_UID || 'your-supabase-uid-here'
  const email = process.env.ADMIN_EMAIL || 'admin@luxelineage.com'

  if (supabaseUid === 'your-supabase-uid-here') {
    console.error('❌ Please set SUPABASE_ADMIN_UID in .env or pass it as environment variable')
    console.log('\nTo get Supabase UID:')
    console.log('1. Go to Supabase Dashboard > Authentication > Users')
    console.log('2. Create a user or find existing user')
    console.log('3. Copy the User UID')
    console.log('4. Run: SUPABASE_ADMIN_UID=your-uid npm run db:seed')
    process.exit(1)
  }

  const admin = await prisma.admin.upsert({
    where: { firebaseUid: supabaseUid }, // Field name is still firebaseUid but stores Supabase UID
    update: {
      email
    },
    create: {
      firebaseUid: supabaseUid, // Storing Supabase UID in this field
      email
    }
  })

  console.log('✅ Admin created in database:')
  console.log(`   ID: ${admin.id}`)
  console.log(`   Email: ${admin.email}`)
  console.log(`   Supabase UID: ${admin.firebaseUid}`)
  console.log('\n📝 Next steps:')
  console.log('1. Ensure this user exists in Supabase Auth (Dashboard > Authentication)')
  console.log('2. User can now login with Supabase Auth')
  console.log('3. Backend will verify Supabase token and link to this admin record')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

