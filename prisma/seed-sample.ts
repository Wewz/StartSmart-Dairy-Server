/**
 * SmartStart Dairy — Sample Data Seed (Phase 6)
 * Adds gamification data, certificates, daily activities, and student notes
 * on top of the base seed data.
 *
 * Run: cd server && npx tsx prisma/seed-sample.ts
 */

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config()

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Seeding sample gamification data...\n')

  // Find existing users
  const students = await prisma.user.findMany({
    where: { role: 'STUDENT' },
    take: 5,
    orderBy: { createdAt: 'asc' },
  })

  const admins = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
    take: 2,
  })

  if (students.length === 0) {
    console.log('⚠ No students found. Run the base seed first: npx tsx prisma/seed.ts')
    return
  }

  console.log(`Found ${students.length} students, ${admins.length} admins`)

  // ─── Update User Gamification Fields ─────────────────────────────────
  const gamificationProfiles = [
    { index: 0, currentStreak: 14, longestStreak: 21, xp: 680, level: 4, totalMinutes: 2832 },
    { index: 1, currentStreak: 3, longestStreak: 7, xp: 150, level: 2, totalMinutes: 480 },
    { index: 2, currentStreak: 0, longestStreak: 2, xp: 20, level: 1, totalMinutes: 45 },
    { index: 3, currentStreak: 0, longestStreak: 0, xp: 0, level: 1, totalMinutes: 0 },
    { index: 4, currentStreak: 5, longestStreak: 10, xp: 350, level: 3, totalMinutes: 1200 },
  ]

  for (const profile of gamificationProfiles) {
    if (!students[profile.index]) continue
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const lastActive = profile.currentStreak > 0
      ? new Date(today.getTime() - (profile.currentStreak > 1 ? 0 : 86400000))
      : null

    await prisma.user.update({
      where: { id: students[profile.index].id },
      data: {
        currentStreak: profile.currentStreak,
        longestStreak: profile.longestStreak,
        xp: profile.xp,
        level: profile.level,
        totalMinutes: profile.totalMinutes,
        lastActiveDate: lastActive,
      },
    })
    console.log(`  ✓ ${students[profile.index].name ?? students[profile.index].email}: Lv ${profile.level}, ${profile.xp} XP, ${profile.currentStreak}d streak`)
  }

  // ─── Create Daily Activities (for heatmap) ──────────────────────────
  console.log('\n📊 Creating daily activity records...')

  const primaryStudent = students[0]
  if (primaryStudent) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = 0; i < 84; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)

      const isWeekend = date.getDay() === 0 || date.getDay() === 6
      const hasActivity = Math.random() > (isWeekend ? 0.6 : 0.2)

      if (hasActivity) {
        const actions = Math.floor(Math.random() * 15) + 1
        const minutes = Math.floor(Math.random() * 90) + 10

        await prisma.dailyActivity.upsert({
          where: { userId_date: { userId: primaryStudent.id, date } },
          update: { actions, minutesActive: minutes },
          create: { userId: primaryStudent.id, date, actions, minutesActive: minutes },
        })
      }
    }
    console.log(`  ✓ Created ~84 days of activity for ${primaryStudent.name}`)
  }

  // Secondary student — lighter activity
  if (students[1]) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = 0; i < 21; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)

      if (Math.random() > 0.5) {
        await prisma.dailyActivity.upsert({
          where: { userId_date: { userId: students[1].id, date } },
          update: { actions: Math.floor(Math.random() * 5) + 1, minutesActive: Math.floor(Math.random() * 30) + 5 },
          create: { userId: students[1].id, date, actions: Math.floor(Math.random() * 5) + 1, minutesActive: Math.floor(Math.random() * 30) + 5 },
        })
      }
    }
    console.log(`  ✓ Created ~21 days of activity for ${students[1].name}`)
  }

  // ─── Create Certificates ────────────────────────────────────────────
  console.log('\n🏆 Creating certificates...')

  const completedEnrollments = await prisma.enrollment.findMany({
    where: { status: 'COMPLETED' },
    include: { course: { select: { id: true, slug: true, titleEn: true } }, user: true },
  })

  for (const enrollment of completedEnrollments) {
    const courseCode = enrollment.course.slug
      .split('-')
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('')
      .slice(0, 3)

    const verificationId = `SSD-${courseCode}-${new Date().getFullYear().toString().slice(-2)}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`

    try {
      await prisma.certificate.upsert({
        where: { userId_courseId: { userId: enrollment.userId, courseId: enrollment.courseId } },
        update: {},
        create: {
          userId: enrollment.userId,
          courseId: enrollment.courseId,
          score: 85 + Math.floor(Math.random() * 15),
          verificationId,
        },
      })
      console.log(`  ✓ Certificate for ${enrollment.user.name}: ${enrollment.course.titleEn}`)
    } catch {
      // verification ID collision — skip
    }
  }

  // Also create a certificate for the primary student's first course if they're advanced enough
  if (primaryStudent) {
    const firstEnrollment = await prisma.enrollment.findFirst({
      where: { userId: primaryStudent.id },
      include: { course: { select: { id: true, slug: true, titleEn: true } } },
    })

    if (firstEnrollment) {
      try {
        await prisma.certificate.upsert({
          where: { userId_courseId: { userId: primaryStudent.id, courseId: firstEnrollment.courseId } },
          update: {},
          create: {
            userId: primaryStudent.id,
            courseId: firstEnrollment.courseId,
            score: 94,
            verificationId: `SSD-MHH-26-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
          },
        })
        console.log(`  ✓ Certificate for ${primaryStudent.name}: ${firstEnrollment.course.titleEn}`)
      } catch {
        // already exists
      }
    }
  }

  // ─── Create Student Notes ───────────────────────────────────────────
  console.log('\n📝 Creating student notes...')

  const lessons = await prisma.lesson.findMany({
    where: { youtubeId: { not: null } },
    take: 3,
    select: { id: true, titleEn: true },
  })

  if (primaryStudent && lessons.length > 0) {
    const sampleNotes = [
      { timestampMs: 32000, text: 'Important: always wear PPE before entering the parlour.' },
      { timestampMs: 108000, text: 'The alkaline dosage should be 0.8%, not 0.5% — double check this.' },
      { timestampMs: 175000, text: 'Good narration technique here — try this approach for my submission.' },
      { timestampMs: 255000, text: 'Water temperature 38-42°C for pre-rinse. Write this down.' },
      { timestampMs: 350000, text: 'CIP cycle: pre-rinse → alkaline wash → acid wash → final rinse.' },
    ]

    for (const note of sampleNotes) {
      await prisma.studentNote.create({
        data: {
          userId: primaryStudent.id,
          lessonId: lessons[0].id,
          timestampMs: note.timestampMs,
          text: note.text,
        },
      })
    }
    console.log(`  ✓ Created ${sampleNotes.length} notes for ${primaryStudent.name} on "${lessons[0].titleEn}"`)
  }

  // ─── Create Notifications ──────────────────────────────────────────
  console.log('\n🔔 Creating sample notifications...')

  if (primaryStudent) {
    const notifications = [
      {
        type: 'SUBMISSION_GRADED' as const,
        titleEn: 'Task graded: Parlour walk-through',
        titleFil: 'Na-grade na: Parlour walk-through',
        bodyEn: 'Your submission scored 3.2/4.0 — Proficient. Great work on the pre-rinse technique!',
        bodyFil: 'Ang iyong submission ay nakakuha ng 3.2/4.0 — Proficient.',
        link: '/dashboard',
        isRead: false,
      },
      {
        type: 'TRAINER_FEEDBACK' as const,
        titleEn: 'Trainer Luz left feedback',
        titleFil: 'Nag-iwan ng feedback si Trainer Luz',
        bodyEn: 'Great technique on the pre-rinse! Consider the water temperature next time — aim for 38–42°C.',
        bodyFil: 'Magaling ang technique sa pre-rinse! Isaalang-alang ang temperatura ng tubig — 38–42°C.',
        link: '/dashboard',
        isRead: false,
      },
      {
        type: 'DEADLINE_REMINDER' as const,
        titleEn: 'Task due Friday: Parlour walk-through video',
        titleFil: 'Due na sa Biyernes: Parlour walk-through video',
        bodyEn: 'Submit your parlour walk-through video for Module 3, Task 2 by Friday.',
        bodyFil: 'I-submit ang parlour walk-through video para sa Module 3, Task 2 bago mag-Biyernes.',
        link: '/dashboard',
        isRead: true,
      },
      {
        type: 'ACHIEVEMENT' as const,
        titleEn: 'Achievement unlocked: 14-day streak!',
        titleFil: 'Achievement unlocked: 14-day streak!',
        bodyEn: 'You have maintained a 14-day learning streak. Next badge at 21 days — Early Riser.',
        bodyFil: 'Mayroon kang 14-day learning streak. Susunod na badge sa 21 days — Early Riser.',
        link: '/profile',
        isRead: true,
      },
    ]

    for (const n of notifications) {
      await prisma.notification.create({
        data: { userId: primaryStudent.id, ...n },
      })
    }
    console.log(`  ✓ Created ${notifications.length} notifications for ${primaryStudent.name}`)
  }

  // ─── Summary ────────────────────────────────────────────────────────
  console.log('\n✅ Sample data seed complete!')
  console.log('   Run the server and client to see the data in action.')
}

main()
  .catch((e) => {
    console.error('❌ Sample seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
