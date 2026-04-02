/**
 * SmartStart Dairy — Database Seed
 * Creates two complete demo courses with modules, lessons, sections,
 * quizzes, tasks, discussion threads, and invite codes.
 *
 * Run: npx ts-node -r tsconfig-paths/register prisma/seed.ts
 */

import { PrismaClient, QuizType, QuestionType, TaskType, ModuleItemType, LessonStatus, CourseStatus, MaterialType } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config()

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// ─── Helper ──────────────────────────────────────────────────────────────────

async function getOrCreateAdmin(): Promise<string> {
  const admin = await prisma.user.findFirst({
    where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
    select: { id: true },
  })
  if (admin) return admin.id

  // Create a placeholder admin if none exists
  const created = await prisma.user.create({
    data: {
      email: 'admin@smartstart-dairy.ph',
      name: 'SmartStart Admin',
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  })
  return created.id
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding SmartStart Dairy database...\n')

  const adminId = await getOrCreateAdmin()
  console.log(`✓ Admin user: ${adminId}`)

  await seedCourse1(adminId)
  await seedCourse2(adminId)

  console.log('\n✅ Seeding complete.')
  console.log('   Invite codes:')
  console.log('   • DAIRY-INTRO-2025  → Introduction to Dairy Farming')
  console.log('   • DAIRY-HEALTH-2025 → Dairy Cattle Health Management')
}

// ═══════════════════════════════════════════════════════════════════════════════
// COURSE 1 — Introduction to Dairy Farming
// ═══════════════════════════════════════════════════════════════════════════════

async function seedCourse1(adminId: string) {
  console.log('\n📚 Course 1: Introduction to Dairy Farming')

  const course = await prisma.course.upsert({
    where: { slug: 'introduction-to-dairy-farming' },
    update: {},
    create: {
      slug: 'introduction-to-dairy-farming',
      titleEn: 'Introduction to Dairy Farming',
      titleFil: 'Panimula sa Pagpapalaki ng Gatas',
      descriptionEn: '<p>This foundational course covers the history, importance, and basic principles of dairy farming in the Philippine context. Learn about different dairy cattle breeds, their characteristics, and how the dairy industry contributes to food security and livelihood in rural communities.</p>',
      descriptionFil: '<p>Ang kursong ito ay sumasaklaw sa kasaysayan, kahalagahan, at mga pangunahing prinsipyo ng pagpapalaki ng gatas sa konteksto ng Pilipinas. Matuto tungkol sa iba\'t ibang uri ng mga baka na nagbibigay ng gatas, ang kanilang mga katangian, at kung paano nag-aambag ang industriya ng gatas sa seguridad sa pagkain at kabuhayan sa mga komunidad sa kanayunan.</p>',
      status: CourseStatus.PUBLISHED,
      isInviteOnly: true,
      order: 1,
      createdById: adminId,
    },
  })
  console.log(`  ✓ Course: ${course.titleEn}`)

  // Invite code
  const inviteCode1 = await prisma.inviteCode.upsert({
    where: { code: 'DAIRY-INTRO-2025' },
    update: {},
    create: {
      code: 'DAIRY-INTRO-2025',
      createdById: adminId,
      usageLimit: 100,
      isActive: true,
      note: 'Demo invite code for Introduction course',
    },
  })
  await prisma.inviteCodeCourse.upsert({
    where: { inviteCodeId_courseId: { inviteCodeId: inviteCode1.id, courseId: course.id } },
    update: {},
    create: { inviteCodeId: inviteCode1.id, courseId: course.id },
  })
  console.log(`  ✓ Invite code: DAIRY-INTRO-2025`)

  await seedCourse1Module1(course.id, adminId)
  await seedCourse1Module2(course.id, adminId)
}

// ─── Course 1 / Module 1 ──────────────────────────────────────────────────────

async function seedCourse1Module1(courseId: string, adminId: string) {
  console.log('  📦 Module 1: History and Importance')

  const module = await prisma.module.upsert({
    where: { id: 'seed-c1-m1' },
    update: {},
    create: {
      id: 'seed-c1-m1',
      courseId,
      titleEn: 'History and Importance of Dairy Farming',
      titleFil: 'Kasaysayan at Kahalagahan ng Pagpapalaki ng Gatas',
      descriptionEn: '<p>Understand where dairy farming in the Philippines came from, why it matters today, and how it connects to the broader agricultural sector.</p>',
      descriptionFil: '<p>Alamin kung saan nanggaling ang pagpapalaki ng gatas sa Pilipinas, bakit ito mahalaga ngayon, at kung paano ito konektado sa mas malawak na sektor ng agrikultura.</p>',
      order: 1,
      requiresPreTest: true,
      requiresAllLessons: true,
      requiresPostTest: true,
      passingScoreToUnlock: 70,
    },
  })

  // Pre-Test
  const preTest = await upsertQuiz({
    id: 'seed-c1-m1-pre',
    moduleId: module.id,
    titleEn: 'Pre-Test: History of Dairy Farming',
    titleFil: 'Pre-Test: Kasaysayan ng Pagpapalaki ng Gatas',
    type: QuizType.PRE_TEST,
    passingScore: 60,
    maxAttempts: 2,
    order: 1,
  })
  await seedPreTestQuestions(preTest.id, 'dairy-history')
  console.log('    ✓ Pre-test')

  // Lesson 1
  const lesson1 = await upsertLesson({
    id: 'seed-c1-m1-l1',
    moduleId: module.id,
    titleEn: 'The History of Dairy Farming in the Philippines',
    titleFil: 'Kasaysayan ng Pagpapalaki ng Gatas sa Pilipinas',
    bodyEn: '<h2>Origins of Dairy in the Philippines</h2><p>Dairy farming in the Philippines has a rich history that dates back to the Spanish colonial period. The introduction of cattle from Mexico and Spain laid the foundation for the local dairy industry we know today.</p><p>The early farmers quickly discovered that certain breeds adapted well to the tropical climate, particularly in the highland areas of Benguet, Bukidnon, and Nueva Ecija.</p>',
    bodyFil: '<h2>Pinagmulan ng Gatas sa Pilipinas</h2><p>Ang pagpapalaki ng gatas sa Pilipinas ay may mayamang kasaysayan na nagmumula pa sa panahon ng pananakop ng Espanya. Ang pagpapakilala ng mga baka mula sa Mexico at Espanya ay naglatag ng pundasyon para sa lokal na industriya ng gatas na ating kilala ngayon.</p><p>Mabilis na natuklasan ng mga magsasaka na ang ilang mga uri ay nag-angkop nang mabuti sa tropikal na klima, lalo na sa mga kabundukan ng Benguet, Bukidnon, at Nueva Ecija.</p>',
    youtubeId: 'dQw4w9WgXcQ',
    durationSecs: 900,
    status: LessonStatus.PUBLISHED,
    order: 2,
  })
  await seedLesson1Sections(lesson1.id)
  console.log('    ✓ Lesson 1: History')

  // Lesson 2
  const lesson2 = await upsertLesson({
    id: 'seed-c1-m1-l2',
    moduleId: module.id,
    titleEn: 'Why Dairy Farming Matters Today',
    titleFil: 'Bakit Mahalaga ang Pagpapalaki ng Gatas Ngayon',
    bodyEn: '<h2>Economic Importance</h2><p>The dairy industry contributes significantly to the Philippine economy, providing livelihoods for thousands of smallholder farmers across the country. Fresh milk production supports local food security and reduces dependence on imported dairy products.</p><p>According to the Bureau of Animal Industry, the Philippines imports about 99% of its dairy requirements, creating a massive opportunity for domestic production growth.</p>',
    bodyFil: '<h2>Kahalagahang Pang-ekonomiya</h2><p>Ang industriya ng gatas ay malaki ang kontribusyon sa ekonomiya ng Pilipinas, nagbibigay ng kabuhayan sa libu-libong maliliit na magsasaka sa buong bansa. Ang produksyon ng sariwang gatas ay sumusuporta sa lokal na seguridad sa pagkain at nagbabawas ng pag-asa sa mga na-import na produktong gatas.</p><p>Ayon sa Bureau of Animal Industry, nag-i-import ang Pilipinas ng humigit-kumulang 99% ng kanyang mga pangangailangan sa gatas, na lumilikha ng napakalaking pagkakataon para sa paglago ng produksyon sa lokal.</p>',
    durationSecs: 720,
    status: LessonStatus.PUBLISHED,
    order: 3,
  })
  await seedLesson2Sections(lesson2.id)
  console.log('    ✓ Lesson 2: Importance')

  // Task
  const task = await upsertTask({
    id: 'seed-c1-m1-t1',
    moduleId: module.id,
    titleEn: 'Reflection: Dairy Farming in Your Community',
    titleFil: 'Repleksyon: Pagpapalaki ng Gatas sa Inyong Komunidad',
    descriptionEn: '<p>Think about your own community or region. Have you seen any dairy farms nearby? What do you know about the people who raise dairy cattle in your area? Write a short reflection (at least 100 words) about the role of dairy farming in your community and what you hope to learn from this course.</p>',
    descriptionFil: '<p>Pag-isipan ang inyong sariling komunidad o rehiyon. Nakakita na ba kayo ng mga sakahan ng gatas sa malapit? Ano ang alam ninyo tungkol sa mga taong nagpapalaki ng mga baka ng gatas sa inyong lugar? Sumulat ng maikling repleksyon (hindi bababa sa 100 salita) tungkol sa papel ng pagpapalaki ng gatas sa inyong komunidad at kung ano ang inyong inaasahang matututunan mula sa kursong ito.</p>',
    taskType: TaskType.REFLECTION,
    maxScore: 20,
    isRequired: true,
    order: 4,
  })
  console.log('    ✓ Task: Community reflection')

  // Post-Test
  const postTest = await upsertQuiz({
    id: 'seed-c1-m1-post',
    moduleId: module.id,
    titleEn: 'Post-Test: History of Dairy Farming',
    titleFil: 'Post-Test: Kasaysayan ng Pagpapalaki ng Gatas',
    type: QuizType.POST_TEST,
    passingScore: 70,
    maxAttempts: 3,
    order: 5,
  })
  await seedPostTestQuestions(postTest.id, 'dairy-history')
  console.log('    ✓ Post-test')

  // Module flow items
  await upsertModuleItems(module.id, [
    { id: 'seed-mi-c1m1-pre', type: ModuleItemType.QUIZ, quizId: preTest.id, order: 1 },
    { id: 'seed-mi-c1m1-l1', type: ModuleItemType.LESSON, lessonId: lesson1.id, order: 2 },
    { id: 'seed-mi-c1m1-l2', type: ModuleItemType.LESSON, lessonId: lesson2.id, order: 3 },
    { id: 'seed-mi-c1m1-t1', type: ModuleItemType.TASK, taskId: task.id, order: 4 },
    { id: 'seed-mi-c1m1-post', type: ModuleItemType.QUIZ, quizId: postTest.id, order: 5 },
  ])
  console.log('    ✓ Module flow wired')
}

// ─── Course 1 / Module 2 ──────────────────────────────────────────────────────

async function seedCourse1Module2(courseId: string, adminId: string) {
  console.log('  📦 Module 2: Dairy Cattle Breeds')

  const module = await prisma.module.upsert({
    where: { id: 'seed-c1-m2' },
    update: {},
    create: {
      id: 'seed-c1-m2',
      courseId,
      titleEn: 'Dairy Cattle Breeds',
      titleFil: 'Mga Uri ng Baka para sa Gatas',
      descriptionEn: '<p>Learn to identify and understand the key characteristics of the major dairy cattle breeds used in the Philippines — from imported Holstein-Friesians to locally adapted crossbreeds.</p>',
      descriptionFil: '<p>Matuto kung paano makilala at maunawaan ang mga pangunahing katangian ng mga pangunahing uri ng baka na nagbibigay ng gatas na ginagamit sa Pilipinas — mula sa mga in-import na Holstein-Friesian hanggang sa mga locally adapted na crossbreeds.</p>',
      order: 2,
      requiresPreTest: true,
      requiresAllLessons: true,
      requiresPostTest: true,
      passingScoreToUnlock: 70,
    },
  })

  const preTest = await upsertQuiz({
    id: 'seed-c1-m2-pre',
    moduleId: module.id,
    titleEn: 'Pre-Test: Dairy Breeds',
    titleFil: 'Pre-Test: Mga Uri ng Baka ng Gatas',
    type: QuizType.PRE_TEST,
    passingScore: 60,
    maxAttempts: 2,
    order: 1,
  })
  await seedBreedQuizQuestions(preTest.id)
  console.log('    ✓ Pre-test')

  const lesson3 = await upsertLesson({
    id: 'seed-c1-m2-l1',
    moduleId: module.id,
    titleEn: 'Major Dairy Breeds: Holstein, Brown Swiss, and Jersey',
    titleFil: 'Mga Pangunahing Uri ng Baka: Holstein, Brown Swiss, at Jersey',
    bodyEn: '<h2>Understanding Dairy Breeds</h2><p>Choosing the right breed is one of the most important decisions a dairy farmer makes. Each breed has unique characteristics in terms of milk production, adaptability to climate, disease resistance, and feed requirements.</p><p>In the Philippines, three imported breeds dominate the commercial dairy sector: the Holstein-Friesian, Brown Swiss, and Jersey. Each has its strengths and is suited to different farming conditions.</p>',
    bodyFil: '<h2>Pag-unawa sa mga Uri ng Baka ng Gatas</h2><p>Ang pagpili ng tamang uri ay isa sa mga pinakamahalagang desisyon na ginagawa ng isang magsasaka ng gatas. Ang bawat uri ay may natatanging katangian sa mga tuntunin ng produksyon ng gatas, kakayahang mag-angkop sa klima, resistensya sa sakit, at mga pangangailangan sa pagkain.</p><p>Sa Pilipinas, tatlong imported na uri ang nangunguna sa komersyal na sektor ng gatas: ang Holstein-Friesian, Brown Swiss, at Jersey.</p>',
    youtubeId: 'dQw4w9WgXcQ',
    durationSecs: 1080,
    status: LessonStatus.PUBLISHED,
    order: 2,
  })
  await seedBreedLesson1Sections(lesson3.id)
  console.log('    ✓ Lesson 3: Imported breeds')

  const lesson4 = await upsertLesson({
    id: 'seed-c1-m2-l2',
    moduleId: module.id,
    titleEn: 'Local and Crossbred Cattle for Philippine Conditions',
    titleFil: 'Lokal at Crossbred na Baka para sa Kondisyon ng Pilipinas',
    bodyEn: '<h2>The Case for Local Breeds</h2><p>While imported breeds produce more milk, locally adapted cattle and crossbreeds offer significant advantages for smallholder farmers — particularly their hardiness in hot, humid conditions and resistance to tropical diseases.</p><p>The Philippine government, through the National Dairy Authority (NDA), has developed programs to improve local breeds through selective crossbreeding while maintaining their natural adaptability.</p>',
    bodyFil: '<h2>Ang Kaso para sa mga Lokal na Uri</h2><p>Bagaman ang mga imported na uri ay gumagawa ng mas maraming gatas, ang mga lokal na naka-angkop na baka at crossbreeds ay nag-aalok ng makabuluhang mga kalamangan para sa mga maliliit na magsasaka — lalo na ang kanilang tibay sa mainit at mahalumigmig na kondisyon at resistensya sa mga tropikal na sakit.</p>',
    durationSecs: 840,
    status: LessonStatus.PUBLISHED,
    order: 3,
  })
  await seedBreedLesson2Sections(lesson4.id)
  console.log('    ✓ Lesson 4: Local breeds')

  const task2 = await upsertTask({
    id: 'seed-c1-m2-t1',
    moduleId: module.id,
    titleEn: 'Activity: Identify Breeds in Your Area',
    titleFil: 'Aktibidad: Tukuyin ang mga Uri sa Inyong Lugar',
    descriptionEn: '<p>If possible, visit a nearby dairy farm or livestock market. Observe the cattle and try to identify which breeds you see based on what you learned in this module. Take note of their physical characteristics (color, body size, ear shape, etc.).</p><p>If you cannot visit a farm, research online or in your local community about which breeds are commonly raised in your region.</p><p>Write a short report (at least 150 words) describing what you observed or researched, including: breed name, physical characteristics you noticed, approximate number of animals, and the type of farm operation.</p>',
    descriptionFil: '<p>Kung posible, bisitahin ang isang sakahan ng gatas o palengke ng hayop malapit sa inyo. Obserbahan ang mga baka at subukang tukuyin kung aling mga uri ang inyong nakita batay sa natutunan ninyo sa module na ito.</p><p>Kung hindi kayo makabisita sa isang sakahan, magsaliksik online o sa inyong lokal na komunidad tungkol sa kung aling mga uri ang karaniwang pinalaki sa inyong rehiyon.</p>',
    taskType: TaskType.ACTIVITY,
    maxScore: 30,
    isRequired: true,
    order: 4,
  })
  console.log('    ✓ Task: Breed identification activity')

  const postTest2 = await upsertQuiz({
    id: 'seed-c1-m2-post',
    moduleId: module.id,
    titleEn: 'Post-Test: Dairy Breeds',
    titleFil: 'Post-Test: Mga Uri ng Baka ng Gatas',
    type: QuizType.POST_TEST,
    passingScore: 70,
    maxAttempts: 3,
    order: 5,
  })
  await seedBreedPostTestQuestions(postTest2.id)
  console.log('    ✓ Post-test')

  await upsertModuleItems(module.id, [
    { id: 'seed-mi-c1m2-pre', type: ModuleItemType.QUIZ, quizId: preTest.id, order: 1 },
    { id: 'seed-mi-c1m2-l1', type: ModuleItemType.LESSON, lessonId: lesson3.id, order: 2 },
    { id: 'seed-mi-c1m2-l2', type: ModuleItemType.LESSON, lessonId: lesson4.id, order: 3 },
    { id: 'seed-mi-c1m2-t1', type: ModuleItemType.TASK, taskId: task2.id, order: 4 },
    { id: 'seed-mi-c1m2-post', type: ModuleItemType.QUIZ, quizId: postTest2.id, order: 5 },
  ])
  console.log('    ✓ Module flow wired')
}

// ═══════════════════════════════════════════════════════════════════════════════
// COURSE 2 — Dairy Cattle Health Management
// ═══════════════════════════════════════════════════════════════════════════════

async function seedCourse2(adminId: string) {
  console.log('\n📚 Course 2: Dairy Cattle Health Management')

  const course = await prisma.course.upsert({
    where: { slug: 'dairy-cattle-health-management' },
    update: {},
    create: {
      slug: 'dairy-cattle-health-management',
      titleEn: 'Dairy Cattle Health Management',
      titleFil: 'Pamamahala ng Kalusugan ng Baka ng Gatas',
      descriptionEn: '<p>A practical course on keeping your dairy herd healthy and productive. Topics include basic sanitation, vaccination schedules, disease recognition, biosecurity measures, and when to call the veterinarian. Designed for smallholder farmers across the Philippines.</p>',
      descriptionFil: '<p>Isang praktikal na kurso sa pagpapanatiling malusog at produktibo ang inyong kawan ng gatas. Ang mga paksa ay kinabibilangan ng pangunahing kalinisan, mga iskedyul ng pagbabakuna, pagkilala sa sakit, mga hakbang sa biosekuridad, at kung kailan dapat tumawag sa veterinarian.</p>',
      status: CourseStatus.PUBLISHED,
      isInviteOnly: true,
      order: 2,
      createdById: adminId,
    },
  })
  console.log(`  ✓ Course: ${course.titleEn}`)

  const inviteCode2 = await prisma.inviteCode.upsert({
    where: { code: 'DAIRY-HEALTH-2025' },
    update: {},
    create: {
      code: 'DAIRY-HEALTH-2025',
      createdById: adminId,
      usageLimit: 100,
      isActive: true,
      note: 'Demo invite code for Health Management course',
    },
  })
  await prisma.inviteCodeCourse.upsert({
    where: { inviteCodeId_courseId: { inviteCodeId: inviteCode2.id, courseId: course.id } },
    update: {},
    create: { inviteCodeId: inviteCode2.id, courseId: course.id },
  })
  console.log(`  ✓ Invite code: DAIRY-HEALTH-2025`)

  await seedCourse2Module1(course.id, adminId)
  await seedCourse2Module2(course.id, adminId)
}

// ─── Course 2 / Module 1 ──────────────────────────────────────────────────────

async function seedCourse2Module1(courseId: string, adminId: string) {
  console.log('  📦 Module 1: Basic Health and Sanitation')

  const module = await prisma.module.upsert({
    where: { id: 'seed-c2-m1' },
    update: {},
    create: {
      id: 'seed-c2-m1',
      courseId,
      titleEn: 'Basic Health and Sanitation',
      titleFil: 'Pangunahing Kalusugan at Kalinisan',
      descriptionEn: '<p>Learn the fundamental practices that keep a dairy herd healthy — proper housing, hygiene routines, water quality, and daily health monitoring. Prevention is always better than cure.</p>',
      descriptionFil: '<p>Matuto ng mga pangunahing kasanayan na nagpapanatiling malusog ang isang kawan ng gatas — tamang tirahan, mga gawi sa kalinisan, kalidad ng tubig, at araw-araw na pagmamasid sa kalusugan.</p>',
      order: 1,
      requiresPreTest: true,
      requiresAllLessons: true,
      requiresPostTest: true,
      passingScoreToUnlock: 70,
    },
  })

  const preTest = await upsertQuiz({
    id: 'seed-c2-m1-pre',
    moduleId: module.id,
    titleEn: 'Pre-Test: Cattle Health Basics',
    titleFil: 'Pre-Test: Mga Pangunahing Kaalaman sa Kalusugan ng Baka',
    type: QuizType.PRE_TEST,
    passingScore: 60,
    maxAttempts: 2,
    order: 1,
  })
  await seedHealthPreTestQuestions(preTest.id)
  console.log('    ✓ Pre-test')

  const lesson5 = await upsertLesson({
    id: 'seed-c2-m1-l1',
    moduleId: module.id,
    titleEn: 'Daily Health Monitoring and Hygiene Practices',
    titleFil: 'Araw-araw na Pagmamasid sa Kalusugan at mga Gawi sa Kalinisan',
    bodyEn: '<h2>Why Daily Monitoring Matters</h2><p>A healthy dairy cow is a productive dairy cow. Experienced farmers develop the habit of observing their animals every day — watching for changes in behavior, appetite, milk production, and physical appearance that might signal a health problem before it becomes serious.</p><p>Early detection is critical. A cow that is slightly off her feed today could be seriously ill tomorrow. Building good observation habits protects your investment and prevents disease from spreading to the rest of the herd.</p>',
    bodyFil: '<h2>Bakit Mahalaga ang Araw-araw na Pagmamasid</h2><p>Ang isang malusog na baka ng gatas ay isang produktibong baka ng gatas. Ang mga may karanasang magsasaka ay nagkakaroon ng gawi ng pagmamasid sa kanilang mga hayop araw-araw — nagmamasid ng mga pagbabago sa pag-uugali, gana sa pagkain, produksyon ng gatas, at pisikal na anyo na maaaring magpahiwatig ng problema sa kalusugan bago pa ito lumala.</p>',
    youtubeId: 'dQw4w9WgXcQ',
    durationSecs: 960,
    status: LessonStatus.PUBLISHED,
    order: 2,
  })
  await seedHealthLesson1Sections(lesson5.id)
  console.log('    ✓ Lesson 5: Daily monitoring')

  const lesson6 = await upsertLesson({
    id: 'seed-c2-m1-l2',
    moduleId: module.id,
    titleEn: 'Housing, Water, and Feed Hygiene',
    titleFil: 'Tirahan, Tubig, at Kalinisan ng Pagkain',
    bodyEn: '<h2>The Environment Shapes Animal Health</h2><p>Up to 60% of cattle health problems can be prevented through proper housing and hygiene. The barn design, bedding quality, drainage, ventilation, and cleanliness of water troughs and feeding areas all directly affect whether pathogens thrive or are kept under control.</p>',
    bodyFil: '<h2>Ang Kapaligiran ay Humuhubog sa Kalusugan ng Hayop</h2><p>Hanggang 60% ng mga problema sa kalusugan ng baka ay maaaring maiwasan sa pamamagitan ng tamang tirahan at kalinisan. Ang disenyo ng kural, kalidad ng higaan, drainage, bentilasyon, at kalinisan ng mga lalagyan ng tubig at mga lugar ng pagkain ay direktang nakakaapekto kung ang mga pathogen ay umunlad o pinigilan.</p>',
    durationSecs: 780,
    status: LessonStatus.PUBLISHED,
    order: 3,
  })
  await seedHealthLesson2Sections(lesson6.id)
  console.log('    ✓ Lesson 6: Housing and hygiene')

  const task3 = await upsertTask({
    id: 'seed-c2-m1-t1',
    moduleId: module.id,
    titleEn: 'Activity: Farm Sanitation Checklist',
    titleFil: 'Aktibidad: Checklist ng Kalinisan ng Sakahan',
    descriptionEn: '<p>Using what you learned in this module, create a daily sanitation checklist for a dairy farm. Your checklist should cover at minimum: housing/barn cleaning, water trough cleaning, feed area hygiene, and animal observation points.</p><p>Format your checklist clearly with yes/no checkboxes. Write a brief explanation (2-3 sentences) for why each item on your checklist is important for cattle health.</p><p>Submit your checklist as text in the box below, or describe what you would include and why.</p>',
    descriptionFil: '<p>Gamit ang natutunan ninyo sa module na ito, lumikha ng araw-araw na checklist ng kalinisan para sa isang sakahan ng gatas. Ang inyong checklist ay dapat sumasaklaw sa hindi bababa sa: paglilinis ng tirahan/kural, paglilinis ng lalagyan ng tubig, kalinisan ng lugar ng pagkain, at mga punto ng pagmamasid sa hayop.</p>',
    taskType: TaskType.ACTIVITY,
    maxScore: 25,
    isRequired: true,
    order: 4,
  })
  console.log('    ✓ Task: Sanitation checklist')

  const postTest = await upsertQuiz({
    id: 'seed-c2-m1-post',
    moduleId: module.id,
    titleEn: 'Post-Test: Health and Sanitation',
    titleFil: 'Post-Test: Kalusugan at Kalinisan',
    type: QuizType.POST_TEST,
    passingScore: 70,
    maxAttempts: 3,
    order: 5,
  })
  await seedHealthPostTestQuestions(postTest.id)
  console.log('    ✓ Post-test')

  await upsertModuleItems(module.id, [
    { id: 'seed-mi-c2m1-pre', type: ModuleItemType.QUIZ, quizId: preTest.id, order: 1 },
    { id: 'seed-mi-c2m1-l1', type: ModuleItemType.LESSON, lessonId: lesson5.id, order: 2 },
    { id: 'seed-mi-c2m1-l2', type: ModuleItemType.LESSON, lessonId: lesson6.id, order: 3 },
    { id: 'seed-mi-c2m1-t1', type: ModuleItemType.TASK, taskId: task3.id, order: 4 },
    { id: 'seed-mi-c2m1-post', type: ModuleItemType.QUIZ, quizId: postTest.id, order: 5 },
  ])
  console.log('    ✓ Module flow wired')
}

// ─── Course 2 / Module 2 ──────────────────────────────────────────────────────

async function seedCourse2Module2(courseId: string, adminId: string) {
  console.log('  📦 Module 2: Common Cattle Diseases')

  const module = await prisma.module.upsert({
    where: { id: 'seed-c2-m2' },
    update: {},
    create: {
      id: 'seed-c2-m2',
      courseId,
      titleEn: 'Common Cattle Diseases and Prevention',
      titleFil: 'Mga Karaniwang Sakit ng Baka at Pag-iwas',
      descriptionEn: '<p>Recognize the signs of the most common diseases affecting dairy cattle in the Philippines — including Foot and Mouth Disease, mastitis, and bovine respiratory disease. Learn vaccination schedules and when to seek veterinary help.</p>',
      descriptionFil: '<p>Kilalanin ang mga palatandaan ng mga pinakakaraniwang sakit na nakakaapekto sa mga baka ng gatas sa Pilipinas — kabilang ang Foot and Mouth Disease, mastitis, at bovine respiratory disease.</p>',
      order: 2,
      requiresPreTest: true,
      requiresAllLessons: true,
      requiresPostTest: true,
      passingScoreToUnlock: 70,
    },
  })

  const preTest = await upsertQuiz({
    id: 'seed-c2-m2-pre',
    moduleId: module.id,
    titleEn: 'Pre-Test: Common Cattle Diseases',
    titleFil: 'Pre-Test: Mga Karaniwang Sakit ng Baka',
    type: QuizType.PRE_TEST,
    passingScore: 60,
    maxAttempts: 2,
    order: 1,
  })
  await seedDiseasePreTestQuestions(preTest.id)
  console.log('    ✓ Pre-test')

  const lesson7 = await upsertLesson({
    id: 'seed-c2-m2-l1',
    moduleId: module.id,
    titleEn: 'Foot and Mouth Disease, Mastitis, and Respiratory Diseases',
    titleFil: 'Foot and Mouth Disease, Mastitis, at mga Sakit sa Paghinga',
    bodyEn: '<h2>The Three Most Common Threats</h2><p>Philippine dairy farmers face several recurring disease challenges. Among the most economically damaging are Foot and Mouth Disease (FMD), mastitis (udder infection), and Bovine Respiratory Disease (BRD). Understanding how to recognize, prevent, and respond to each is essential knowledge for every dairy farmer.</p>',
    bodyFil: '<h2>Ang Tatlong Pinakakaraniwang Banta</h2><p>Ang mga magsasaka ng gatas sa Pilipinas ay nahaharap sa ilang paulit-ulit na hamon sa sakit. Kabilang sa mga pinaka-mapinsalang pang-ekonomiya ay ang Foot and Mouth Disease (FMD), mastitis (impeksyon sa udder), at Bovine Respiratory Disease (BRD).</p>',
    youtubeId: 'dQw4w9WgXcQ',
    durationSecs: 1200,
    status: LessonStatus.PUBLISHED,
    order: 2,
  })
  await seedDiseaseLesson1Sections(lesson7.id)
  console.log('    ✓ Lesson 7: Major diseases')

  const lesson8 = await upsertLesson({
    id: 'seed-c2-m2-l2',
    moduleId: module.id,
    titleEn: 'Vaccination Schedules and Biosecurity',
    titleFil: 'Mga Iskedyul ng Pagbabakuna at Biosekuridad',
    bodyEn: '<h2>Prevention Through Vaccination</h2><p>Vaccination is the most cost-effective disease prevention tool available to dairy farmers. A proper vaccination schedule, combined with good biosecurity practices, can prevent most of the major diseases that affect dairy cattle in the Philippines.</p><p>The National Dairy Authority and Bureau of Animal Industry provide free or subsidized vaccines for several key diseases. Knowing what is available and how to access these programs is essential for smallholder farmers.</p>',
    bodyFil: '<h2>Pag-iwas sa Pamamagitan ng Pagbabakuna</h2><p>Ang pagbabakuna ay ang pinaka-cost-effective na kagamitan sa pag-iwas sa sakit na magagamit ng mga magsasaka ng gatas. Ang isang wastong iskedyul ng pagbabakuna, kasama ang mabuting mga gawi sa biosekuridad, ay makakaiwas sa karamihan ng mga pangunahing sakit na nakakaapekto sa mga baka ng gatas sa Pilipinas.</p>',
    durationSecs: 900,
    status: LessonStatus.PUBLISHED,
    order: 3,
  })
  await seedDiseaseLesson2Sections(lesson8.id)
  console.log('    ✓ Lesson 8: Vaccination')

  const task4 = await upsertTask({
    id: 'seed-c2-m2-t1',
    moduleId: module.id,
    titleEn: 'Output: Create a Vaccination Schedule',
    titleFil: 'Output: Gumawa ng Iskedyul ng Pagbabakuna',
    descriptionEn: '<p>Based on what you have learned in this module, create a vaccination schedule for a small dairy herd of 10 cows in your region. Your schedule should:</p><ul><li>List the vaccines needed (at minimum: FMD, Hemorrhagic Septicemia, Brucellosis)</li><li>Indicate the recommended frequency (monthly, annual, etc.)</li><li>Note any special considerations for your region or breed</li><li>Include a section on what to do when a new animal is introduced to the herd</li></ul><p>You may submit this as a table, a list, or a written description.</p>',
    descriptionFil: '<p>Batay sa natutunan ninyo sa module na ito, lumikha ng iskedyul ng pagbabakuna para sa isang maliit na kawan ng gatas na may 10 baka sa inyong rehiyon. Ang inyong iskedyul ay dapat: ilista ang mga kinakailangang bakuna, ipahiwatig ang inirerekomendang dalas, tandaan ang anumang espesyal na konsiderasyon para sa inyong rehiyon o uri, at magsama ng seksyon kung ano ang gagawin kapag ang isang bagong hayop ay ipinakilala sa kawan.</p>',
    taskType: TaskType.OUTPUT_SUBMISSION,
    maxScore: 40,
    isRequired: true,
    order: 4,
  })
  console.log('    ✓ Task: Vaccination schedule output')

  const postTest = await upsertQuiz({
    id: 'seed-c2-m2-post',
    moduleId: module.id,
    titleEn: 'Post-Test: Diseases and Vaccination',
    titleFil: 'Post-Test: Mga Sakit at Pagbabakuna',
    type: QuizType.POST_TEST,
    passingScore: 70,
    maxAttempts: 3,
    order: 5,
  })
  await seedDiseasePostTestQuestions(postTest.id)
  console.log('    ✓ Post-test')

  await upsertModuleItems(module.id, [
    { id: 'seed-mi-c2m2-pre', type: ModuleItemType.QUIZ, quizId: preTest.id, order: 1 },
    { id: 'seed-mi-c2m2-l1', type: ModuleItemType.LESSON, lessonId: lesson7.id, order: 2 },
    { id: 'seed-mi-c2m2-l2', type: ModuleItemType.LESSON, lessonId: lesson8.id, order: 3 },
    { id: 'seed-mi-c2m2-t1', type: ModuleItemType.TASK, taskId: task4.id, order: 4 },
    { id: 'seed-mi-c2m2-post', type: ModuleItemType.QUIZ, quizId: postTest.id, order: 5 },
  ])
  console.log('    ✓ Module flow wired')
}

// ═══════════════════════════════════════════════════════════════════════════════
// LESSON SECTIONS
// ═══════════════════════════════════════════════════════════════════════════════

async function seedLesson1Sections(lessonId: string) {
  const sections = [
    {
      id: `${lessonId}-s1`,
      order: 1,
      headingEn: 'Colonial Period: The Introduction of Cattle',
      headingFil: 'Panahon ng Kolonyalismo: Ang Pagpapakilala ng mga Baka',
      bodyEn: '<p>Spanish missionaries and traders brought cattle to the Philippine islands beginning in the 16th century. These animals were primarily used as draft animals for agriculture, but some communities quickly recognized their potential for milk production.</p><p>The mountain communities of the Cordillera region were among the first to develop systematic dairy practices, due to the cooler climate that was more favorable to European breeds.</p>',
      bodyFil: '<p>Ang mga misyonaryo at mangangalakal na Espanyol ay nagdala ng mga baka sa mga pulo ng Pilipinas simula noong ika-16 na siglo. Ang mga hayop na ito ay pangunahing ginagamit bilang mga hayop na pangtrabaho para sa agrikultura, ngunit ilang komunidad ang mabilis na nakilala ang kanilang potensyal para sa produksyon ng gatas.</p><p>Ang mga komunidad sa bundok ng rehiyon ng Cordillera ay kabilang sa mga una na nagbuo ng sistematikong mga gawi sa pagpapalaki ng gatas, dahil sa mas malamig na klima na mas kanais-nais para sa mga European na uri.</p>',
    },
    {
      id: `${lessonId}-s2`,
      order: 2,
      headingEn: 'American Period and the Growth of Commercial Dairy',
      headingFil: 'Panahon ng mga Amerikano at ang Paglago ng Komersyal na Gatas',
      bodyEn: '<p>The American colonial period (1900–1946) brought significant changes to Philippine agriculture. American administrators introduced improved dairy breeds and established the first commercial dairy operations in Nueva Ecija, Bukidnon, and around Manila.</p><p>Dairy cooperatives began forming in the 1920s and 1930s, providing small farmers with access to markets and shared resources. This cooperative model remains important in Philippine dairy farming today.</p>',
      bodyFil: '<p>Ang panahon ng pananakop ng mga Amerikano (1900-1946) ay nagdulot ng malalaking pagbabago sa agrikultura ng Pilipinas. Ang mga tagapangasiwa ng Amerika ay nagpakilala ng mga pinahusay na uri ng gatas at nagtatag ng mga unang komersyal na operasyon ng gatas sa Nueva Ecija, Bukidnon, at paligid ng Maynila.</p>',
    },
    {
      id: `${lessonId}-s3`,
      order: 3,
      headingEn: 'The Modern Philippine Dairy Industry',
      headingFil: 'Ang Modernong Industriya ng Gatas sa Pilipinas',
      bodyEn: '<p>Today, the Philippine dairy industry is guided by the National Dairy Authority (NDA), established in 1986. The NDA coordinates with local government units, cooperatives, and individual farmers to develop the domestic dairy supply chain.</p><p>Key dairy producing areas include: <strong>Bukidnon</strong> (Mindanao), <strong>Batangas and Laguna</strong> (Luzon), <strong>Benguet</strong> (Cordillera), and <strong>Davao</strong> (Mindanao). Together, these areas produce approximately 25 million liters of fresh milk annually — a fraction of national demand.</p>',
      bodyFil: '<p>Ngayon, ang industriya ng gatas ng Pilipinas ay pinatnubayan ng National Dairy Authority (NDA), na itinatag noong 1986. Ang NDA ay nakikipagtulungan sa mga lokal na yunit ng pamahalaan, mga kooperatiba, at mga indibidwal na magsasaka upang mapaunlad ang lokal na supply chain ng gatas.</p><p>Ang mga pangunahing lugar na gumagawa ng gatas ay kinabibilangan ng: <strong>Bukidnon</strong> (Mindanao), <strong>Batangas at Laguna</strong> (Luzon), <strong>Benguet</strong> (Cordillera), at <strong>Davao</strong> (Mindanao).</p>',
    },
  ]
  for (const s of sections) {
    await prisma.lessonSection.upsert({
      where: { id: s.id },
      update: {},
      create: { ...s, lessonId },
    })
  }
}

async function seedLesson2Sections(lessonId: string) {
  const sections = [
    {
      id: `${lessonId}-s1`, order: 1,
      headingEn: 'Food Security and Nutrition',
      headingFil: 'Seguridad sa Pagkain at Nutrisyon',
      bodyEn: '<p>Milk is one of the most nutritionally complete foods available. It provides high-quality protein, calcium, vitamin D, and other essential micronutrients that are often lacking in the typical Filipino diet, particularly among children in rural areas.</p><p>Increasing domestic milk production directly improves nutritional outcomes in communities where fresh milk becomes affordable and accessible.</p>',
      bodyFil: '<p>Ang gatas ay isa sa mga pinakanutrisyosong kumpletong pagkain na magagamit. Nagbibigay ito ng mataas na kalidad na protina, kaltsyum, bitamina D, at iba pang mahahalagang micronutrients na madalas na kulang sa tipikal na pagkain ng mga Pilipino, lalo na sa mga bata sa kanayunan.</p>',
    },
    {
      id: `${lessonId}-s2`, order: 2,
      headingEn: 'Livelihoods for Smallholder Farmers',
      headingFil: 'Kabuhayan para sa mga Maliliit na Magsasaka',
      bodyEn: '<p>A smallholder dairy farm with just 3–5 cows can generate a reliable daily income stream from fresh milk sales. Unlike crop farming which is seasonal, dairy provides year-round cash flow — making it an attractive livelihood option for rural families.</p><p>The NDA estimates that each dairy cow provides employment for approximately 2.5 people across the entire value chain — from farm labor to processing, transport, and retail.</p>',
      bodyFil: '<p>Ang isang maliliit na sakahan ng gatas na may 3-5 baka lamang ay maaaring makabuo ng maaasahang araw-araw na kita mula sa pagbebenta ng sariwang gatas. Hindi tulad ng pagsasaka ng pananim na pana-panahon, ang gatas ay nagbibigay ng daloy ng pera sa buong taon.</p>',
    },
    {
      id: `${lessonId}-s3`, order: 3,
      headingEn: 'The Import Gap: A Massive Opportunity',
      headingFil: 'Ang Import Gap: Isang Malaking Pagkakataon',
      bodyEn: '<p>The Philippines imports approximately <strong>2.4 billion USD</strong> worth of dairy products annually — one of the highest import bills in Southeast Asia for this category. This dependence on imports represents both a challenge and an enormous opportunity.</p><p>Government programs like the Dairy Industry Development Act and NDA\'s farm development programs are designed to help close this gap by supporting new and existing dairy farmers with technical assistance, breeding stock, and market access.</p>',
      bodyFil: '<p>Ang Pilipinas ay nag-i-import ng humigit-kumulang <strong>2.4 bilyong USD</strong> na halaga ng mga produktong gatas bawat taon — isa sa mga pinakamataas na import bill sa Southeast Asia para sa kategoryang ito. Ang pagpapasekura sa mga import ay kumakatawan sa parehong isang hamon at isang napakalaking pagkakataon.</p>',
    },
  ]
  for (const s of sections) {
    await prisma.lessonSection.upsert({
      where: { id: s.id },
      update: {},
      create: { ...s, lessonId },
    })
  }
}

async function seedBreedLesson1Sections(lessonId: string) {
  const sections = [
    {
      id: `${lessonId}-s1`, order: 1,
      headingEn: 'Holstein-Friesian: The High Producer',
      headingFil: 'Holstein-Friesian: Ang Mataas na Prodyuser',
      bodyEn: '<p>The <strong>Holstein-Friesian</strong> is the world\'s most productive dairy breed and the most recognizable — characterized by its distinctive black and white patches. A well-managed Holstein in the Philippines can produce 15–25 liters of milk per day, far exceeding other breeds.</p><p><strong>Strengths:</strong> Highest milk volume, well-established genetics, widely available.</p><p><strong>Challenges:</strong> Sensitive to heat and humidity, higher feed requirements, more susceptible to tropical diseases than local breeds.</p><p><strong>Best suited for:</strong> Farms in highland areas (above 600m elevation) or farms with good cooling infrastructure.</p>',
      bodyFil: '<p>Ang <strong>Holstein-Friesian</strong> ay ang pinaka-produktibong uri ng gatas sa mundo at ang pinakamakilala — na nailalarawan sa pamamagitan ng natatanging itim at puting mga patch. Ang isang maayos na pinamamahalaan na Holstein sa Pilipinas ay maaaring gumawa ng 15-25 litro ng gatas bawat araw.</p>',
    },
    {
      id: `${lessonId}-s2`, order: 2,
      headingEn: 'Brown Swiss: The Dual-Purpose Breed',
      headingFil: 'Brown Swiss: Ang Dual-Purpose na Uri',
      bodyEn: '<p>The <strong>Brown Swiss</strong> is known for its hardiness and adaptability — it handles heat and humidity better than the Holstein while still producing impressive milk volumes of 10–18 liters per day. The milk also has a higher butterfat content, making it excellent for cheese and processed dairy products.</p><p><strong>Strengths:</strong> More heat-tolerant than Holstein, good milk composition, docile temperament, strong hooves suited to Philippine terrain.</p><p><strong>Challenges:</strong> Lower volume than Holstein, imported stock can be expensive.</p>',
      bodyFil: '<p>Ang <strong>Brown Swiss</strong> ay kilala sa tibay at kakayahan nitong mag-angkop — mas kayang harapin ang init at halumigmig kaysa sa Holstein habang gumagawa pa rin ng kahanga-hangang dami ng gatas na 10-18 litro bawat araw.</p>',
    },
    {
      id: `${lessonId}-s3`, order: 3,
      headingEn: 'Jersey: Smaller Body, Richer Milk',
      headingFil: 'Jersey: Mas Maliit na Katawan, Mas Mayamang Gatas',
      bodyEn: '<p>The <strong>Jersey</strong> is the smallest of the major dairy breeds but produces milk with the highest butterfat content (4.5–5.5% fat compared to Holstein\'s 3.5%). Jersey cows are extremely feed-efficient — producing more milk solids per kilogram of feed than any other breed.</p><p><strong>Strengths:</strong> Feed efficiency, high butterfat milk ideal for processed products, adapts well to Philippine conditions, gentle temperament.</p><p><strong>Best suited for:</strong> Smallholder farms, farms producing for cheese or butter manufacturing, hot lowland areas.</p>',
      bodyFil: '<p>Ang <strong>Jersey</strong> ay ang pinakamaliit sa mga pangunahing uri ng gatas ngunit gumagawa ng gatas na may pinakamataas na nilalaman ng butterfat (4.5-5.5% na taba kumpara sa 3.5% ng Holstein). Ang mga baka ng Jersey ay napaka-feed-efficient.</p>',
    },
  ]
  for (const s of sections) {
    await prisma.lessonSection.upsert({
      where: { id: s.id },
      update: {},
      create: { ...s, lessonId },
    })
  }
}

async function seedBreedLesson2Sections(lessonId: string) {
  const sections = [
    {
      id: `${lessonId}-s1`, order: 1,
      headingEn: 'The Philippine Native Cattle (Bos indicus)',
      headingFil: 'Ang Katutubong Baka ng Pilipinas (Bos indicus)',
      bodyEn: '<p>Philippine native cattle (locally called <em>baka</em> or <em>kalabaw</em> in some areas) are small, hardy animals that have evolved over centuries to thrive in tropical conditions. They have natural resistance to many local diseases and parasites, require minimal inputs, and can survive on poor-quality forage.</p><p>While their milk production is low (1–3 liters per day), they serve as an important base for crossbreeding programs that combine their hardiness with the production potential of exotic breeds.</p>',
      bodyFil: '<p>Ang katutubong baka ng Pilipinas ay maliliit, matibay na mga hayop na lumago sa loob ng maraming siglo upang mabuhay sa tropikal na kondisyon. Mayroon silang natural na resistensya sa maraming lokal na sakit at parasito, nangangailangan ng kaunting inputs, at mabubuhay sa mahirap na kalidad na pagkain.</p>',
    },
    {
      id: `${lessonId}-s2`, order: 2,
      headingEn: 'NDA Crossbreeding Programs',
      headingFil: 'Mga Programa ng NDA sa Crossbreeding',
      bodyEn: '<p>The National Dairy Authority operates a systematic crossbreeding program that introduces Holstein or Brown Swiss genetics into local herds over multiple generations. The typical targets are:</p><ul><li><strong>F1 (50% exotic):</strong> 5–8 liters/day, heat tolerant</li><li><strong>F2 (75% exotic):</strong> 8–12 liters/day, needs good management</li><li><strong>F3 (87.5% exotic):</strong> Approaches purebred performance but retains some hardiness</li></ul><p>The NDA provides AI (artificial insemination) services using semen from high-quality imported bulls, making the program accessible to smallholder farmers.</p>',
      bodyFil: '<p>Ang National Dairy Authority ay nagpapatakbo ng sistematikong programa sa crossbreeding na nagpapakilala ng Holstein o Brown Swiss na genetics sa mga lokal na kawan sa maraming henerasyon. Nagbibigay ang NDA ng serbisyo ng AI (artificial insemination) gamit ang semen mula sa mataas na kalidad na mga imported na toro.</p>',
    },
  ]
  for (const s of sections) {
    await prisma.lessonSection.upsert({
      where: { id: s.id },
      update: {},
      create: { ...s, lessonId },
    })
  }
}

async function seedHealthLesson1Sections(lessonId: string) {
  const sections = [
    {
      id: `${lessonId}-s1`, order: 1,
      headingEn: 'The Daily Health Check: What to Look For',
      headingFil: 'Ang Araw-araw na Pagsusuri sa Kalusugan: Ano ang Hahanapin',
      bodyEn: '<p>A thorough daily health check takes only 5–10 minutes per animal but can prevent costly disease outbreaks. Train yourself to observe the following every morning:</p><ul><li><strong>Appetite:</strong> Is the animal eating normally? Reduced appetite is often the first sign of illness.</li><li><strong>Posture and gait:</strong> Is the animal standing normally? Any lameness, stiffness, or reluctance to move?</li><li><strong>Eyes and nose:</strong> Clear and bright eyes? Any discharge from the nose?</li><li><strong>Breathing:</strong> Normal rate (10-30 breaths/min)? No coughing or labored breathing?</li><li><strong>Manure:</strong> Normal consistency and color? Diarrhea or bloody stool is a serious warning sign.</li><li><strong>Milk production:</strong> Any sudden drop in yield? Changes in milk appearance?</li></ul>',
      bodyFil: '<p>Ang masusing araw-araw na pagsusuri sa kalusugan ay tumatagal lamang ng 5-10 minuto bawat hayop ngunit makakaiwas sa mga mahal na outbreak ng sakit. Sanayin ang inyong sarili na obserbahan ang sumusunod tuwing umaga: gana sa pagkain, postura at paglakad, mata at ilong, paghinga, dumi, at produksyon ng gatas.</p>',
    },
    {
      id: `${lessonId}-s2`, order: 2,
      headingEn: 'Milking Hygiene: Preventing Mastitis',
      headingFil: 'Kalinisan sa Paggatás: Pag-iwas sa Mastitis',
      bodyEn: '<p>Mastitis (udder infection) is the most costly disease in dairy farming worldwide, including the Philippines. Up to 80% of mastitis cases are preventable through proper milking hygiene.</p><p><strong>Pre-milking protocol:</strong></p><ol><li>Wash hands thoroughly with soap and water</li><li>Clean the udder with a clean, damp cloth</li><li>Perform a fore-strip test (3 squirts from each teat into a dark cup — check for clots, discoloration)</li><li>Dry the teats completely before attaching milking equipment</li></ol><p><strong>Post-milking:</strong> Apply teat dip immediately after removing milking cups. This is the single most effective mastitis prevention step.</p>',
      bodyFil: '<p>Ang mastitis (impeksyon sa udder) ay ang pinaka-mahal na sakit sa pagpapalaki ng gatas sa buong mundo, kabilang ang Pilipinas. Hanggang 80% ng mga kaso ng mastitis ay maiiwasan sa pamamagitan ng wastong kalinisan sa paggatás.</p>',
    },
    {
      id: `${lessonId}-s3`, order: 3,
      headingEn: 'Temperature, Stress, and Heat Management',
      headingFil: 'Temperatura, Stress, at Pamamahala ng Init',
      bodyEn: '<p>Heat stress is a major productivity killer for dairy cattle in the Philippines, particularly for exotic breeds. When ambient temperature exceeds 25°C with high humidity, cattle begin reducing feed intake and milk production to manage their body temperature.</p><p><strong>Signs of heat stress:</strong> Bunching together in shade, increased respiration rate (>60 breaths/min), reduced eating, increased water consumption, and milk production drops of 10–25%.</p><p><strong>Management strategies:</strong> Shade structures or fans, misting systems for extreme heat, access to clean water at all times (a dairy cow drinks 50–100 liters per day), adjusting feeding times to early morning and evening.</p>',
      bodyFil: '<p>Ang heat stress ay isang pangunahing pumatay ng produktibidad para sa mga baka ng gatas sa Pilipinas, lalo na para sa mga exotic na uri. Kapag ang temperatura ng kapaligiran ay lumampas sa 25°C na may mataas na halumigmig, ang mga baka ay nagsisimulang bawasan ang paggamit ng pagkain at produksyon ng gatas.</p>',
    },
  ]
  for (const s of sections) {
    await prisma.lessonSection.upsert({
      where: { id: s.id },
      update: {},
      create: { ...s, lessonId },
    })
  }
}

async function seedHealthLesson2Sections(lessonId: string) {
  const sections = [
    {
      id: `${lessonId}-s1`, order: 1,
      headingEn: 'Barn Design and Drainage',
      headingFil: 'Disenyo ng Kural at Drainage',
      bodyEn: '<p>The physical design of housing has a direct impact on disease incidence. Key design principles for Philippine conditions:</p><ul><li><strong>Orientation:</strong> East-west orientation minimizes direct sun exposure on animal resting areas</li><li><strong>Ventilation:</strong> Open sides with adjustable curtains allow air flow while protecting from rain</li><li><strong>Flooring:</strong> Concrete with a slight slope (1:20) toward drainage channels prevents pooling and is easy to clean</li><li><strong>Drainage:</strong> Manure channels should allow direct flow away from the animals and into a composting area or biogas digester</li></ul>',
      bodyFil: '<p>Ang pisikal na disenyo ng tirahan ay direktang nakakaapekto sa insidente ng sakit. Mga pangunahing prinsipyo ng disenyo para sa kondisyon ng Pilipinas: oryentasyon, bentilasyon, sahig, at drainage.</p>',
    },
    {
      id: `${lessonId}-s2`, order: 2,
      headingEn: 'Water Quality and Feed Storage',
      headingFil: 'Kalidad ng Tubig at Imbakan ng Pagkain',
      bodyEn: '<p>A dairy cow needs access to 50–100 liters of clean, fresh water every day. Water quality directly affects milk quality and animal health. Contaminated water is a common route of infection for several gastrointestinal diseases.</p><p><strong>Water trough management:</strong> Clean and refill water troughs at least once daily. Scrub with a brush weekly to prevent algae and biofilm buildup. Position troughs away from manure areas.</p><p><strong>Feed storage:</strong> Store all feed (concentrates, hay, silage) off the ground in a dry, rodent-proof area. Moldy feed is a major cause of mycotoxin poisoning. Check stored feed weekly for signs of mold or contamination.</p>',
      bodyFil: '<p>Ang isang baka ng gatas ay nangangailangan ng access sa 50-100 litro ng malinis, sariwang tubig bawat araw. Ang kalidad ng tubig ay direktang nakakaapekto sa kalidad ng gatas at kalusugan ng hayop. Pamahalaan ang mga lalagyan ng tubig: linisin at punan muli araw-araw.</p>',
    },
  ]
  for (const s of sections) {
    await prisma.lessonSection.upsert({
      where: { id: s.id },
      update: {},
      create: { ...s, lessonId },
    })
  }
}

async function seedDiseaseLesson1Sections(lessonId: string) {
  const sections = [
    {
      id: `${lessonId}-s1`, order: 1,
      headingEn: 'Foot and Mouth Disease (FMD)',
      headingFil: 'Foot and Mouth Disease (FMD)',
      bodyEn: '<p>FMD is a highly contagious viral disease that affects cloven-hoofed animals including cattle, pigs, goats, and sheep. It is one of the most economically devastating animal diseases in the world and remains endemic in parts of the Philippines.</p><p><strong>Signs:</strong> Fever, blisters on the tongue, gums, and feet, reluctance to walk or eat, drooling, sudden drop in milk production.</p><p><strong>Transmission:</strong> Direct animal contact, contaminated feed/water, humans on clothing or footwear, birds, and vehicles.</p><p><strong>Treatment:</strong> No cure — supportive care only (wound cleaning, pain relief). Prevention through vaccination is critical.</p><p><strong>What to do:</strong> Isolate affected animals immediately. Report to the local Bureau of Animal Industry office. FMD is a notifiable disease.</p>',
      bodyFil: '<p>Ang FMD ay isang lubos na nakakahawa na viral na sakit na nakakaapekto sa mga hayop na may biyak na kuko kabilang ang mga baka, baboy, kambing, at tupa. Isa ito sa mga pinaka-mapinsalang pang-ekonomiyang sakit ng hayop sa mundo. Mga palatandaan: lagnat, mga paltos sa dila, gilagid, at paa, pag-aalangan na lumakad o kumain, pagdudura, biglaang pagbaba ng produksyon ng gatas.</p>',
    },
    {
      id: `${lessonId}-s2`, order: 2,
      headingEn: 'Mastitis: The Biggest Economic Threat',
      headingFil: 'Mastitis: Ang Pinakamalaking Banta sa Ekonomiya',
      bodyEn: '<p>Mastitis is inflammation of the mammary gland, almost always caused by bacterial infection. It is the single most costly disease in dairy farming — causing an estimated 30–40% reduction in milk production per infected quarter, plus treatment costs and potential culling of severely affected animals.</p><p><strong>Clinical mastitis signs:</strong> Hot, swollen, or painful udder; milk that is watery, clumpy, or blood-tinged; fever; loss of appetite.</p><p><strong>Sub-clinical mastitis</strong> (no visible signs) is even more dangerous because it goes undetected while steadily reducing production and contaminating the milk supply. Use a California Mastitis Test (CMT) monthly to detect sub-clinical cases.</p>',
      bodyFil: '<p>Ang mastitis ay pamamaga ng mammary gland, halos palaging sanhi ng impeksyon ng bakterya. Ito ang pinaka-mahal na sakit sa pagpapalaki ng gatas — nagdudulot ng tinatayang 30-40% na pagbaba ng produksyon ng gatas bawat infected na quarter.</p>',
    },
    {
      id: `${lessonId}-s3`, order: 3,
      headingEn: 'Bovine Respiratory Disease (BRD)',
      headingFil: 'Bovine Respiratory Disease (BRD)',
      bodyEn: '<p>BRD (sometimes called "shipping fever" or pneumonia) is a complex of respiratory diseases caused by a combination of viruses and bacteria. It is particularly common in newly purchased or transported animals and during periods of stress.</p><p><strong>Signs:</strong> Nasal discharge, coughing, labored breathing, fever (39.5°C or higher), depression, reduced feed intake.</p><p><strong>Risk factors in the Philippines:</strong> Purchasing animals from markets (high stress and pathogen exposure), sudden weather changes, poor ventilation in housing, overcrowding.</p><p><strong>Treatment:</strong> Antibiotics (under veterinary prescription) are effective if started early. Advanced cases can result in permanent lung damage.</p>',
      bodyFil: '<p>Ang BRD ay isang kumplikasyon ng mga sakit sa paghinga na sanhi ng kombinasyon ng mga virus at bakterya. Partikular na karaniwan ito sa mga bagong biniling o naangkut na hayop at sa mga panahon ng stress. Mga palatandaan: discharge sa ilong, ubo, hirap na paghinga, lagnat, depresyon, nabawasang paggamit ng pagkain.</p>',
    },
  ]
  for (const s of sections) {
    await prisma.lessonSection.upsert({
      where: { id: s.id },
      update: {},
      create: { ...s, lessonId },
    })
  }
}

async function seedDiseaseLesson2Sections(lessonId: string) {
  const sections = [
    {
      id: `${lessonId}-s1`, order: 1,
      headingEn: 'Core Vaccination Schedule for Philippine Dairy Cattle',
      headingFil: 'Pangunahing Iskedyul ng Pagbabakuna para sa mga Baka ng Gatas sa Pilipinas',
      bodyEn: '<p>The following vaccines are recommended by the Bureau of Animal Industry for dairy cattle in the Philippines:</p><table><thead><tr><th>Disease</th><th>Vaccine Type</th><th>Schedule</th><th>Notes</th></tr></thead><tbody><tr><td>FMD</td><td>Inactivated multivalent</td><td>Every 6 months</td><td>Free from BAI in some regions</td></tr><tr><td>Hemorrhagic Septicemia</td><td>Oil-adjuvanted</td><td>Annual (before rainy season)</td><td>—</td></tr><tr><td>Brucellosis</td><td>Strain 19 or RB51</td><td>Females, once at 3-8 months</td><td>Males not vaccinated</td></tr><tr><td>Black Leg</td><td>Multi-clostridial</td><td>Annual</td><td>Important in wet areas</td></tr><tr><td>Leptospirosis</td><td>Bacterin</td><td>Annual</td><td>Zoonotic — protect workers too</td></tr></tbody></table>',
      bodyFil: '<p>Ang mga sumusunod na bakuna ay inirerekomenda ng Bureau of Animal Industry para sa mga baka ng gatas sa Pilipinas: FMD (bawat 6 na buwan), Hemorrhagic Septicemia (taunan), Brucellosis (mga babae, isang beses sa 3-8 buwan), Black Leg (taunan), Leptospirosis (taunan).</p>',
    },
    {
      id: `${lessonId}-s2`, order: 2,
      headingEn: 'Biosecurity: Preventing Disease Entry',
      headingFil: 'Biosekuridad: Pag-iwas sa Pagpasok ng Sakit',
      bodyEn: '<p>Biosecurity refers to a set of practices designed to prevent the introduction and spread of disease agents into and within your farm. Even a single infected new animal can destroy an entire healthy herd.</p><p><strong>Key biosecurity practices:</strong></p><ol><li><strong>Quarantine new animals</strong> for 21 days before introducing them to the main herd. Monitor daily for signs of disease.</li><li><strong>Foot bath at farm entrance</strong> with disinfectant solution. Change solution regularly.</li><li><strong>Limit visitors</strong> to essential personnel. Require clean clothing and footwear for anyone entering the barn.</li><li><strong>Control wildlife and pests.</strong> Rodents and birds can carry and transmit diseases.</li><li><strong>Proper carcass disposal.</strong> Dead animals must be buried deep (1.5m minimum) or cremated — never left exposed.</li></ol>',
      bodyFil: '<p>Ang biosekuridad ay tumutukoy sa isang hanay ng mga gawi na idinisenyo upang maiwasan ang pagpapakilala at pagkalat ng mga ahente ng sakit sa at sa loob ng inyong sakahan. Kahit isang infected na bagong hayop ay maaaring sirain ang isang buong malusog na kawan.</p>',
    },
  ]
  for (const s of sections) {
    await prisma.lessonSection.upsert({
      where: { id: s.id },
      update: {},
      create: { ...s, lessonId },
    })
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUIZ QUESTIONS
// ═══════════════════════════════════════════════════════════════════════════════

async function seedPreTestQuestions(quizId: string, topic: string) {
  const questions = [
    {
      id: `${quizId}-q1`, order: 1,
      textEn: 'Which country first introduced dairy cattle to the Philippines?',
      textFil: 'Aling bansa ang unang nagpakilala ng mga baka ng gatas sa Pilipinas?',
      questionType: QuestionType.MULTIPLE_CHOICE,
      points: 1,
      options: [
        { id: `${quizId}-q1-a`, textEn: 'Spain', textFil: 'Espanya', isCorrect: true, order: 1 },
        { id: `${quizId}-q1-b`, textEn: 'China', textFil: 'Tsina', isCorrect: false, order: 2 },
        { id: `${quizId}-q1-c`, textEn: 'Japan', textFil: 'Japan', isCorrect: false, order: 3 },
        { id: `${quizId}-q1-d`, textEn: 'United States', textFil: 'Estados Unidos', isCorrect: false, order: 4 },
      ],
    },
    {
      id: `${quizId}-q2`, order: 2,
      textEn: 'The Philippines imports approximately what percentage of its dairy requirements?',
      textFil: 'Humigit-kumulang ilang porsyento ng mga pangangailangan sa gatas ng Pilipinas ang ini-import?',
      questionType: QuestionType.MULTIPLE_CHOICE,
      points: 1,
      options: [
        { id: `${quizId}-q2-a`, textEn: '50%', textFil: '50%', isCorrect: false, order: 1 },
        { id: `${quizId}-q2-b`, textEn: '75%', textFil: '75%', isCorrect: false, order: 2 },
        { id: `${quizId}-q2-c`, textEn: '99%', textFil: '99%', isCorrect: true, order: 3 },
        { id: `${quizId}-q2-d`, textEn: '30%', textFil: '30%', isCorrect: false, order: 4 },
      ],
    },
    {
      id: `${quizId}-q3`, order: 3,
      textEn: 'The National Dairy Authority (NDA) of the Philippines was established in what year?',
      textFil: 'Ang National Dairy Authority (NDA) ng Pilipinas ay naitatag noong anong taon?',
      questionType: QuestionType.MULTIPLE_CHOICE,
      points: 1,
      options: [
        { id: `${quizId}-q3-a`, textEn: '1972', textFil: '1972', isCorrect: false, order: 1 },
        { id: `${quizId}-q3-b`, textEn: '1986', textFil: '1986', isCorrect: true, order: 2 },
        { id: `${quizId}-q3-c`, textEn: '1995', textFil: '1995', isCorrect: false, order: 3 },
        { id: `${quizId}-q3-d`, textEn: '2001', textFil: '2001', isCorrect: false, order: 4 },
      ],
    },
    {
      id: `${quizId}-q4`, order: 4,
      textEn: 'True or False: Dairy farming in the Philippines provides income only during certain seasons.',
      textFil: 'Totoo o Hindi: Ang pagpapalaki ng gatas sa Pilipinas ay nagbibigay ng kita lamang sa ilang panahon ng taon.',
      questionType: QuestionType.TRUE_FALSE,
      points: 1,
      options: [
        { id: `${quizId}-q4-a`, textEn: 'True', textFil: 'Totoo', isCorrect: false, order: 1 },
        { id: `${quizId}-q4-b`, textEn: 'False', textFil: 'Hindi Totoo', isCorrect: true, order: 2 },
      ],
    },
    {
      id: `${quizId}-q5`, order: 5,
      textEn: 'Which Philippine region is NOT commonly associated with dairy farming?',
      textFil: 'Aling rehiyon ng Pilipinas ang HINDI karaniwang nauugnay sa pagpapalaki ng gatas?',
      questionType: QuestionType.MULTIPLE_CHOICE,
      points: 1,
      options: [
        { id: `${quizId}-q5-a`, textEn: 'Bukidnon', textFil: 'Bukidnon', isCorrect: false, order: 1 },
        { id: `${quizId}-q5-b`, textEn: 'Benguet', textFil: 'Benguet', isCorrect: false, order: 2 },
        { id: `${quizId}-q5-c`, textEn: 'Batangas', textFil: 'Batangas', isCorrect: false, order: 3 },
        { id: `${quizId}-q5-d`, textEn: 'Palawan', textFil: 'Palawan', isCorrect: true, order: 4 },
      ],
    },
  ]
  await upsertQuestionsWithOptions(questions)
}

async function seedPostTestQuestions(quizId: string, topic: string) {
  const questions = [
    {
      id: `${quizId}-q1`, order: 1,
      textEn: 'During which colonial period did the first commercial dairy cooperatives form in the Philippines?',
      textFil: 'Sa panahon ng aling pananakop ng dayuhan ang mga unang komersyal na kooperatiba ng gatas na nabuo sa Pilipinas?',
      questionType: QuestionType.MULTIPLE_CHOICE,
      points: 1,
      options: [
        { id: `${quizId}-q1-a`, textEn: 'Spanish period (1565–1898)', textFil: 'Panahon ng Espanyol (1565-1898)', isCorrect: false, order: 1 },
        { id: `${quizId}-q1-b`, textEn: 'American period (1900–1946)', textFil: 'Panahon ng Amerikano (1900-1946)', isCorrect: true, order: 2 },
        { id: `${quizId}-q1-c`, textEn: 'Japanese occupation (1942–1945)', textFil: 'Pananakop ng Japan (1942-1945)', isCorrect: false, order: 3 },
        { id: `${quizId}-q1-d`, textEn: 'Post-independence (1946–1960)', textFil: 'Pagkatapos ng kalayaan (1946-1960)', isCorrect: false, order: 4 },
      ],
    },
    {
      id: `${quizId}-q2`, order: 2,
      textEn: 'Approximately how much does the Philippines spend annually on dairy imports?',
      textFil: 'Humigit-kumulang magkano ang ginagastos ng Pilipinas bawat taon sa mga import ng gatas?',
      questionType: QuestionType.MULTIPLE_CHOICE,
      points: 1,
      options: [
        { id: `${quizId}-q2-a`, textEn: '$500 million USD', textFil: '$500 milyong USD', isCorrect: false, order: 1 },
        { id: `${quizId}-q2-b`, textEn: '$1 billion USD', textFil: '$1 bilyong USD', isCorrect: false, order: 2 },
        { id: `${quizId}-q2-c`, textEn: '$2.4 billion USD', textFil: '$2.4 bilyong USD', isCorrect: true, order: 3 },
        { id: `${quizId}-q2-d`, textEn: '$5 billion USD', textFil: '$5 bilyong USD', isCorrect: false, order: 4 },
      ],
    },
    {
      id: `${quizId}-q3`, order: 3,
      textEn: 'Explain in your own words why the high dairy import dependency in the Philippines is considered both a challenge and an opportunity for farmers.',
      textFil: 'Ipaliwanag sa inyong sariling mga salita kung bakit ang mataas na pag-asa ng Pilipinas sa mga import ng gatas ay itinuturing na parehong isang hamon at pagkakataon para sa mga magsasaka.',
      questionType: QuestionType.SHORT_ANSWER,
      points: 5,
      rubricEn: 'Award full marks if the student identifies: (1) challenge = competition from cheap imports, (2) opportunity = large unmet domestic demand, (3) government programs available to help.',
      rubricFil: 'Ibigay ang buong marka kung natukoy ng mag-aaral ang: (1) hamon = kumpetensya mula sa murang mga import, (2) pagkakataon = malaking hindi pa natutugunang domestic na demand, (3) mga programa ng pamahalaan na magagamit para tumulong.',
    },
    {
      id: `${quizId}-q4`, order: 4,
      textEn: 'True or False: Each dairy cow in the Philippines supports employment for approximately 2.5 people across the value chain.',
      textFil: 'Totoo o Hindi: Ang bawat baka ng gatas sa Pilipinas ay nagtataguyod ng trabaho para sa humigit-kumulang 2.5 tao sa buong value chain.',
      questionType: QuestionType.TRUE_FALSE,
      points: 1,
      options: [
        { id: `${quizId}-q4-a`, textEn: 'True', textFil: 'Totoo', isCorrect: true, order: 1 },
        { id: `${quizId}-q4-b`, textEn: 'False', textFil: 'Hindi Totoo', isCorrect: false, order: 2 },
      ],
    },
    {
      id: `${quizId}-q5`, order: 5,
      textEn: 'The cool highland climate is favorable for dairy farming because exotic breeds like Holstein-Friesian are sensitive to:',
      textFil: 'Ang malamig na klima sa kabundukan ay kanais-nais para sa pagpapalaki ng gatas dahil ang mga exotic na uri tulad ng Holstein-Friesian ay sensitibo sa:',
      questionType: QuestionType.MULTIPLE_CHOICE,
      points: 1,
      options: [
        { id: `${quizId}-q5-a`, textEn: 'Cold temperatures', textFil: 'Malamig na temperatura', isCorrect: false, order: 1 },
        { id: `${quizId}-q5-b`, textEn: 'Heat and humidity', textFil: 'Init at halumigmig', isCorrect: true, order: 2 },
        { id: `${quizId}-q5-c`, textEn: 'Strong winds', textFil: 'Malakas na hangin', isCorrect: false, order: 3 },
        { id: `${quizId}-q5-d`, textEn: 'High altitude', textFil: 'Mataas na altitude', isCorrect: false, order: 4 },
      ],
    },
  ]
  await upsertQuestionsWithOptions(questions)
}

async function seedBreedQuizQuestions(quizId: string) {
  const questions = [
    {
      id: `${quizId}-q1`, order: 1,
      textEn: 'Which dairy breed is most recognizable by its black and white coat pattern?',
      textFil: 'Aling uri ng gatas ang pinaka-makikilala sa pamamagitan ng itim at puting pattern ng balahibo?',
      questionType: QuestionType.MULTIPLE_CHOICE,
      points: 1,
      options: [
        { id: `${quizId}-q1-a`, textEn: 'Jersey', textFil: 'Jersey', isCorrect: false, order: 1 },
        { id: `${quizId}-q1-b`, textEn: 'Brown Swiss', textFil: 'Brown Swiss', isCorrect: false, order: 2 },
        { id: `${quizId}-q1-c`, textEn: 'Holstein-Friesian', textFil: 'Holstein-Friesian', isCorrect: true, order: 3 },
        { id: `${quizId}-q1-d`, textEn: 'Brahman', textFil: 'Brahman', isCorrect: false, order: 4 },
      ],
    },
    {
      id: `${quizId}-q2`, order: 2,
      textEn: 'True or False: Philippine native cattle produce more milk per day than Holstein-Friesian.',
      textFil: 'Totoo o Hindi: Ang katutubong baka ng Pilipinas ay gumagawa ng mas maraming gatas bawat araw kaysa sa Holstein-Friesian.',
      questionType: QuestionType.TRUE_FALSE,
      points: 1,
      options: [
        { id: `${quizId}-q2-a`, textEn: 'True', textFil: 'Totoo', isCorrect: false, order: 1 },
        { id: `${quizId}-q2-b`, textEn: 'False', textFil: 'Hindi Totoo', isCorrect: true, order: 2 },
      ],
    },
    {
      id: `${quizId}-q3`, order: 3,
      textEn: 'Which breed is best suited for smallholder farms in hot lowland areas?',
      textFil: 'Aling uri ang pinakaangkop para sa maliliit na sakahan sa mainit na mga lugar sa mabababang lugar?',
      questionType: QuestionType.MULTIPLE_CHOICE,
      points: 1,
      options: [
        { id: `${quizId}-q3-a`, textEn: 'Holstein-Friesian', textFil: 'Holstein-Friesian', isCorrect: false, order: 1 },
        { id: `${quizId}-q3-b`, textEn: 'Jersey', textFil: 'Jersey', isCorrect: true, order: 2 },
        { id: `${quizId}-q3-c`, textEn: 'Brown Swiss', textFil: 'Brown Swiss', isCorrect: false, order: 3 },
        { id: `${quizId}-q3-d`, textEn: 'All breeds are equally suited', textFil: 'Lahat ng uri ay pantay na angkop', isCorrect: false, order: 4 },
      ],
    },
  ]
  await upsertQuestionsWithOptions(questions)
}

async function seedBreedPostTestQuestions(quizId: string) {
  const questions = [
    {
      id: `${quizId}-q1`, order: 1,
      textEn: 'An F2 crossbred dairy cow (75% exotic genetics) in the NDA program can produce approximately how many liters per day?',
      textFil: 'Ang isang F2 crossbred na baka ng gatas (75% exotic genetics) sa programa ng NDA ay maaaring gumawa ng humigit-kumulang ilang litro bawat araw?',
      questionType: QuestionType.MULTIPLE_CHOICE,
      points: 1,
      options: [
        { id: `${quizId}-q1-a`, textEn: '1–3 liters', textFil: '1-3 litro', isCorrect: false, order: 1 },
        { id: `${quizId}-q1-b`, textEn: '5–8 liters', textFil: '5-8 litro', isCorrect: false, order: 2 },
        { id: `${quizId}-q1-c`, textEn: '8–12 liters', textFil: '8-12 litro', isCorrect: true, order: 3 },
        { id: `${quizId}-q1-d`, textEn: '20–25 liters', textFil: '20-25 litro', isCorrect: false, order: 4 },
      ],
    },
    {
      id: `${quizId}-q2`, order: 2,
      textEn: 'What is the main advantage of native Philippine cattle over imported breeds?',
      textFil: 'Ano ang pangunahing kalamangan ng katutubong baka ng Pilipinas kaysa sa mga imported na uri?',
      questionType: QuestionType.MULTIPLE_CHOICE,
      points: 1,
      options: [
        { id: `${quizId}-q2-a`, textEn: 'Higher milk volume', textFil: 'Mas mataas na dami ng gatas', isCorrect: false, order: 1 },
        { id: `${quizId}-q2-b`, textEn: 'Better butterfat content', textFil: 'Mas magandang nilalaman ng butterfat', isCorrect: false, order: 2 },
        { id: `${quizId}-q2-c`, textEn: 'Hardiness and disease resistance in tropical conditions', textFil: 'Tibay at resistensya sa sakit sa tropikal na kondisyon', isCorrect: true, order: 3 },
        { id: `${quizId}-q2-d`, textEn: 'Higher market price for milk', textFil: 'Mas mataas na presyo ng gatas sa merkado', isCorrect: false, order: 4 },
      ],
    },
    {
      id: `${quizId}-q3`, order: 3,
      textEn: 'Which breed produces milk with the highest butterfat percentage?',
      textFil: 'Aling uri ang gumagawa ng gatas na may pinakamataas na porsyento ng butterfat?',
      questionType: QuestionType.MULTIPLE_CHOICE,
      points: 1,
      options: [
        { id: `${quizId}-q3-a`, textEn: 'Holstein-Friesian', textFil: 'Holstein-Friesian', isCorrect: false, order: 1 },
        { id: `${quizId}-q3-b`, textEn: 'Brown Swiss', textFil: 'Brown Swiss', isCorrect: false, order: 2 },
        { id: `${quizId}-q3-c`, textEn: 'Jersey', textFil: 'Jersey', isCorrect: true, order: 3 },
        { id: `${quizId}-q3-d`, textEn: 'Native Philippine cattle', textFil: 'Katutubong baka ng Pilipinas', isCorrect: false, order: 4 },
      ],
    },
    {
      id: `${quizId}-q4`, order: 4,
      textEn: 'Describe the ideal conditions for keeping a Holstein-Friesian herd in the Philippines.',
      textFil: 'Ilarawan ang ideal na kondisyon para sa pagpapanatili ng isang kawan ng Holstein-Friesian sa Pilipinas.',
      questionType: QuestionType.SHORT_ANSWER,
      points: 5,
      rubricEn: 'Award marks for mentioning: highland location OR cooling infrastructure, good nutrition/concentrates, disease management, shade and water. Penalize if student does not acknowledge the heat sensitivity challenge.',
      rubricFil: 'Ibigay ang marka para sa pagbanggit ng: lokasyon sa kabundukan O cooling infrastructure, mabuting nutrisyon/concentrates, pamamahala ng sakit, lilim at tubig.',
    },
  ]
  await upsertQuestionsWithOptions(questions)
}

async function seedHealthPreTestQuestions(quizId: string) {
  const questions = [
    {
      id: `${quizId}-q1`, order: 1,
      textEn: 'What is the normal breathing rate for a healthy dairy cow?',
      textFil: 'Ano ang normal na rate ng paghinga ng isang malusog na baka ng gatas?',
      questionType: QuestionType.MULTIPLE_CHOICE,
      points: 1,
      options: [
        { id: `${quizId}-q1-a`, textEn: '5–10 breaths per minute', textFil: '5-10 paghinga bawat minuto', isCorrect: false, order: 1 },
        { id: `${quizId}-q1-b`, textEn: '10–30 breaths per minute', textFil: '10-30 paghinga bawat minuto', isCorrect: true, order: 2 },
        { id: `${quizId}-q1-c`, textEn: '50–60 breaths per minute', textFil: '50-60 paghinga bawat minuto', isCorrect: false, order: 3 },
        { id: `${quizId}-q1-d`, textEn: '80–100 breaths per minute', textFil: '80-100 paghinga bawat minuto', isCorrect: false, order: 4 },
      ],
    },
    {
      id: `${quizId}-q2`, order: 2,
      textEn: 'True or False: A dairy cow needs 50–100 liters of fresh water every day.',
      textFil: 'Totoo o Hindi: Ang isang baka ng gatas ay nangangailangan ng 50-100 litro ng sariwang tubig bawat araw.',
      questionType: QuestionType.TRUE_FALSE,
      points: 1,
      options: [
        { id: `${quizId}-q2-a`, textEn: 'True', textFil: 'Totoo', isCorrect: true, order: 1 },
        { id: `${quizId}-q2-b`, textEn: 'False', textFil: 'Hindi Totoo', isCorrect: false, order: 2 },
      ],
    },
    {
      id: `${quizId}-q3`, order: 3,
      textEn: 'What is the most common and costly disease in dairy farming worldwide?',
      textFil: 'Ano ang pinaka-karaniwan at pinaka-mahal na sakit sa pagpapalaki ng gatas sa buong mundo?',
      questionType: QuestionType.MULTIPLE_CHOICE,
      points: 1,
      options: [
        { id: `${quizId}-q3-a`, textEn: 'Foot and Mouth Disease', textFil: 'Foot and Mouth Disease', isCorrect: false, order: 1 },
        { id: `${quizId}-q3-b`, textEn: 'Mastitis', textFil: 'Mastitis', isCorrect: true, order: 2 },
        { id: `${quizId}-q3-c`, textEn: 'Brucellosis', textFil: 'Brucellosis', isCorrect: false, order: 3 },
        { id: `${quizId}-q3-d`, textEn: 'Black Leg', textFil: 'Black Leg', isCorrect: false, order: 4 },
      ],
    },
  ]
  await upsertQuestionsWithOptions(questions)
}

async function seedHealthPostTestQuestions(quizId: string) {
  const questions = [
    {
      id: `${quizId}-q1`, order: 1,
      textEn: 'What percentage of mastitis cases can be prevented through proper milking hygiene?',
      textFil: 'Ilang porsyento ng mga kaso ng mastitis ang maaaring maiwasan sa pamamagitan ng wastong kalinisan sa paggatás?',
      questionType: QuestionType.MULTIPLE_CHOICE,
      points: 1,
      options: [
        { id: `${quizId}-q1-a`, textEn: 'Up to 40%', textFil: 'Hanggang 40%', isCorrect: false, order: 1 },
        { id: `${quizId}-q1-b`, textEn: 'Up to 60%', textFil: 'Hanggang 60%', isCorrect: false, order: 2 },
        { id: `${quizId}-q1-c`, textEn: 'Up to 80%', textFil: 'Hanggang 80%', isCorrect: true, order: 3 },
        { id: `${quizId}-q1-d`, textEn: 'Up to 100%', textFil: 'Hanggang 100%', isCorrect: false, order: 4 },
      ],
    },
    {
      id: `${quizId}-q2`, order: 2,
      textEn: 'When does heat stress begin to affect milk production in dairy cattle?',
      textFil: 'Kailan nagsisimulang makaapekto ang heat stress sa produksyon ng gatas ng mga baka ng gatas?',
      questionType: QuestionType.MULTIPLE_CHOICE,
      points: 1,
      options: [
        { id: `${quizId}-q2-a`, textEn: 'Above 15°C', textFil: 'Higit sa 15°C', isCorrect: false, order: 1 },
        { id: `${quizId}-q2-b`, textEn: 'Above 25°C with high humidity', textFil: 'Higit sa 25°C na may mataas na halumigmig', isCorrect: true, order: 2 },
        { id: `${quizId}-q2-c`, textEn: 'Above 35°C', textFil: 'Higit sa 35°C', isCorrect: false, order: 3 },
        { id: `${quizId}-q2-d`, textEn: 'Only above 40°C', textFil: 'Higit sa 40°C lamang', isCorrect: false, order: 4 },
      ],
    },
    {
      id: `${quizId}-q3`, order: 3,
      textEn: 'What is the recommended floor slope for dairy barn flooring to prevent water pooling?',
      textFil: 'Ano ang inirerekomendang slope ng sahig para sa sahig ng kural ng gatas upang maiwasan ang pagtipon ng tubig?',
      questionType: QuestionType.MULTIPLE_CHOICE,
      points: 1,
      options: [
        { id: `${quizId}-q3-a`, textEn: '1:5 (steep)', textFil: '1:5 (matarik)', isCorrect: false, order: 1 },
        { id: `${quizId}-q3-b`, textEn: '1:20 (gentle slope)', textFil: '1:20 (banayad na slope)', isCorrect: true, order: 2 },
        { id: `${quizId}-q3-c`, textEn: 'Completely flat', textFil: 'Ganap na patag', isCorrect: false, order: 3 },
        { id: `${quizId}-q3-d`, textEn: '1:2 (very steep)', textFil: '1:2 (napakatarik)', isCorrect: false, order: 4 },
      ],
    },
    {
      id: `${quizId}-q4`, order: 4,
      textEn: 'You notice one of your cows has reduced appetite, slightly watery eyes, and is not producing her usual amount of milk. What should be your first action?',
      textFil: 'Napansin ninyo na ang isa sa inyong mga baka ay may nabawasang gana sa pagkain, bahagyang matubig na mata, at hindi gumagawa ng karaniwang dami ng gatas. Ano ang dapat na maging unang hakbain ninyo?',
      questionType: QuestionType.ESSAY,
      points: 10,
      rubricEn: 'Full marks: student identifies isolating the animal, performing closer physical examination (check temperature, breathing, udder), documenting the symptoms, and deciding whether to call a veterinarian based on severity. Penalize if student skips isolation or suggests immediate treatment without assessment.',
      rubricFil: 'Buong marka: natukoy ng mag-aaral ang paghihiwalay ng hayop, pagsasagawa ng mas malapit na pisikal na pagsusuri, pagdodokumento ng mga sintomas, at pagpapasya kung tatawag ng veterinarian batay sa kalubhaan.',
    },
  ]
  await upsertQuestionsWithOptions(questions)
}

async function seedDiseasePreTestQuestions(quizId: string) {
  const questions = [
    {
      id: `${quizId}-q1`, order: 1,
      textEn: 'FMD (Foot and Mouth Disease) primarily spreads through:',
      textFil: 'Ang FMD (Foot and Mouth Disease) ay pangunahing kumakalat sa pamamagitan ng:',
      questionType: QuestionType.MULTIPLE_CHOICE,
      points: 1,
      options: [
        { id: `${quizId}-q1-a`, textEn: 'Water contamination only', textFil: 'Kontaminasyon ng tubig lamang', isCorrect: false, order: 1 },
        { id: `${quizId}-q1-b`, textEn: 'Direct contact and contaminated materials', textFil: 'Direktang kontak at mga kontaminadong materyales', isCorrect: true, order: 2 },
        { id: `${quizId}-q1-c`, textEn: 'Mosquito bites', textFil: 'Kagat ng lamok', isCorrect: false, order: 3 },
        { id: `${quizId}-q1-d`, textEn: 'It does not spread between animals', textFil: 'Hindi ito kumakalat sa pagitan ng mga hayop', isCorrect: false, order: 4 },
      ],
    },
    {
      id: `${quizId}-q2`, order: 2,
      textEn: 'True or False: FMD can be cured with antibiotics.',
      textFil: 'Totoo o Hindi: Ang FMD ay maaaring gamutin ng mga antibiotics.',
      questionType: QuestionType.TRUE_FALSE,
      points: 1,
      options: [
        { id: `${quizId}-q2-a`, textEn: 'True', textFil: 'Totoo', isCorrect: false, order: 1 },
        { id: `${quizId}-q2-b`, textEn: 'False', textFil: 'Hindi Totoo', isCorrect: true, order: 2 },
      ],
    },
    {
      id: `${quizId}-q3`, order: 3,
      textEn: 'How often should the FMD vaccine be given to dairy cattle?',
      textFil: 'Gaano kadalas dapat ibigay ang bakuna ng FMD sa mga baka ng gatas?',
      questionType: QuestionType.MULTIPLE_CHOICE,
      points: 1,
      options: [
        { id: `${quizId}-q3-a`, textEn: 'Once in a lifetime', textFil: 'Isang beses sa buhay', isCorrect: false, order: 1 },
        { id: `${quizId}-q3-b`, textEn: 'Every 6 months', textFil: 'Bawat 6 na buwan', isCorrect: true, order: 2 },
        { id: `${quizId}-q3-c`, textEn: 'Every 3 years', textFil: 'Bawat 3 taon', isCorrect: false, order: 3 },
        { id: `${quizId}-q3-d`, textEn: 'Only when an outbreak occurs', textFil: 'Kapag nagkaroon lamang ng outbreak', isCorrect: false, order: 4 },
      ],
    },
  ]
  await upsertQuestionsWithOptions(questions)
}

async function seedDiseasePostTestQuestions(quizId: string) {
  const questions = [
    {
      id: `${quizId}-q1`, order: 1,
      textEn: 'How long should a newly purchased animal be quarantined before joining the main herd?',
      textFil: 'Gaano katagal ang dapat na i-quarantine ang isang bagong biniling hayop bago sumali sa pangunahing kawan?',
      questionType: QuestionType.MULTIPLE_CHOICE,
      points: 1,
      options: [
        { id: `${quizId}-q1-a`, textEn: '3 days', textFil: '3 araw', isCorrect: false, order: 1 },
        { id: `${quizId}-q1-b`, textEn: '7 days', textFil: '7 araw', isCorrect: false, order: 2 },
        { id: `${quizId}-q1-c`, textEn: '21 days', textFil: '21 araw', isCorrect: true, order: 3 },
        { id: `${quizId}-q1-d`, textEn: '60 days', textFil: '60 araw', isCorrect: false, order: 4 },
      ],
    },
    {
      id: `${quizId}-q2`, order: 2,
      textEn: 'The Brucellosis vaccine (Strain 19 or RB51) is given to:',
      textFil: 'Ang bakuna ng Brucellosis (Strain 19 o RB51) ay ibinibigay sa:',
      questionType: QuestionType.MULTIPLE_CHOICE,
      points: 1,
      options: [
        { id: `${quizId}-q2-a`, textEn: 'All cattle regardless of sex', textFil: 'Lahat ng baka anuman ang kasarian', isCorrect: false, order: 1 },
        { id: `${quizId}-q2-b`, textEn: 'Female cattle only, once at 3–8 months of age', textFil: 'Babae lamang na baka, isang beses sa 3-8 buwan ng edad', isCorrect: true, order: 2 },
        { id: `${quizId}-q2-c`, textEn: 'Male cattle only', textFil: 'Lalaking baka lamang', isCorrect: false, order: 3 },
        { id: `${quizId}-q2-d`, textEn: 'All cattle, annually', textFil: 'Lahat ng baka, taunan', isCorrect: false, order: 4 },
      ],
    },
    {
      id: `${quizId}-q3`, order: 3,
      textEn: 'A farm visitor arrives to buy milk. What biosecurity steps should the farmer take before allowing them near the cattle?',
      textFil: 'Dumating ang isang bisita sa sakahan upang bumili ng gatas. Anong mga hakbang sa biosekuridad ang dapat gawin ng magsasaka bago sila payagang lumapit sa mga baka?',
      questionType: QuestionType.ESSAY,
      points: 10,
      rubricEn: 'Full marks for identifying: foot bath disinfection, clean clothing/footwear requirement, limiting access to barn area, not allowing visitor to touch animals unnecessarily. Bonus for mentioning recording visitor details for outbreak tracing.',
      rubricFil: 'Buong marka para sa pagkilala ng: disinfeksyon ng foot bath, kinakailangan na malinis na damit/sapatos, paglilimita ng access sa lugar ng kural, hindi pagpapahintulot sa bisita na hawakan ang mga hayop nang hindi kinakailangan.',
    },
    {
      id: `${quizId}-q4`, order: 4,
      textEn: 'True or False: Leptospirosis in cattle only affects the animals and cannot be transmitted to humans.',
      textFil: 'Totoo o Hindi: Ang Leptospirosis sa mga baka ay nakakaapekto lamang sa mga hayop at hindi maaaring maipasa sa mga tao.',
      questionType: QuestionType.TRUE_FALSE,
      points: 1,
      options: [
        { id: `${quizId}-q4-a`, textEn: 'True', textFil: 'Totoo', isCorrect: false, order: 1 },
        { id: `${quizId}-q4-b`, textEn: 'False', textFil: 'Hindi Totoo', isCorrect: true, order: 2 },
      ],
    },
    {
      id: `${quizId}-q5`, order: 5,
      textEn: 'Which disease requires immediate reporting to the Bureau of Animal Industry because it is a notifiable disease?',
      textFil: 'Aling sakit ang nangangailangan ng agarang pag-uulat sa Bureau of Animal Industry dahil ito ay isang notifiable disease?',
      questionType: QuestionType.MULTIPLE_CHOICE,
      points: 1,
      options: [
        { id: `${quizId}-q5-a`, textEn: 'Mastitis', textFil: 'Mastitis', isCorrect: false, order: 1 },
        { id: `${quizId}-q5-b`, textEn: 'Foot and Mouth Disease', textFil: 'Foot and Mouth Disease', isCorrect: true, order: 2 },
        { id: `${quizId}-q5-c`, textEn: 'Pneumonia', textFil: 'Pneumonia', isCorrect: false, order: 3 },
        { id: `${quizId}-q5-d`, textEn: 'Diarrhea', textFil: 'Pagtatae', isCorrect: false, order: 4 },
      ],
    },
  ]
  await upsertQuestionsWithOptions(questions)
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

async function upsertLesson(data: {
  id: string; moduleId: string; titleEn: string; titleFil: string
  bodyEn?: string; bodyFil?: string; youtubeId?: string; mp4Url?: string
  durationSecs?: number; status: LessonStatus; order: number
}) {
  return prisma.lesson.upsert({
    where: { id: data.id },
    update: {},
    create: data,
  })
}

async function upsertQuiz(data: {
  id: string; moduleId: string; titleEn: string; titleFil: string
  type: QuizType; passingScore: number; maxAttempts: number; order: number
}) {
  const quiz = await prisma.quiz.upsert({
    where: { id: data.id },
    update: {},
    create: {
      id: data.id,
      moduleId: data.moduleId,
      titleEn: data.titleEn,
      titleFil: data.titleFil,
      type: data.type,
      passingScore: data.passingScore,
      maxAttempts: data.maxAttempts,
      isPublished: true,
      blocksProgress: true,
    },
  })
  return quiz
}

async function upsertTask(data: {
  id: string; moduleId: string; titleEn: string; titleFil: string
  descriptionEn: string; descriptionFil: string; taskType: TaskType
  maxScore: number; isRequired: boolean; order: number
}) {
  return prisma.moduleTask.upsert({
    where: { id: data.id },
    update: {},
    create: {
      id: data.id,
      moduleId: data.moduleId,
      titleEn: data.titleEn,
      titleFil: data.titleFil,
      descriptionEn: data.descriptionEn,
      descriptionFil: data.descriptionFil,
      taskType: data.taskType,
      maxScore: data.maxScore,
      isRequired: data.isRequired,
      requiresReview: true,
      allowResubmission: true,
    },
  })
}

async function upsertModuleItems(
  moduleId: string,
  items: Array<{
    id: string; type: ModuleItemType; order: number
    lessonId?: string; quizId?: string; taskId?: string
  }>
) {
  for (const item of items) {
    await prisma.moduleItem.upsert({
      where: { id: item.id },
      update: {},
      create: {
        id: item.id,
        moduleId,
        type: item.type,
        order: item.order,
        lessonId: item.lessonId,
        quizId: item.quizId,
        taskId: item.taskId,
      },
    })
  }
}

async function upsertQuestionsWithOptions(questions: Array<{
  id: string; order: number; textEn: string; textFil: string
  questionType: QuestionType; points: number
  rubricEn?: string; rubricFil?: string
  options?: Array<{ id: string; textEn: string; textFil: string; isCorrect: boolean; order: number }>
}>) {
  for (const q of questions) {
    // Extract quizId from question id (format: {quizId}-q{n})
    const quizId = q.id.replace(/-q\d+$/, '')

    await prisma.question.upsert({
      where: { id: q.id },
      update: {},
      create: {
        id: q.id,
        quizId,
        textEn: q.textEn,
        textFil: q.textFil,
        questionType: q.questionType,
        points: q.points,
        rubricEn: q.rubricEn,
        rubricFil: q.rubricFil,
        order: q.order,
      },
    })

    if (q.options) {
      for (const opt of q.options) {
        await prisma.answerOption.upsert({
          where: { id: opt.id },
          update: {},
          create: {
            id: opt.id,
            questionId: q.id,
            textEn: opt.textEn,
            textFil: opt.textFil,
            isCorrect: opt.isCorrect,
            order: opt.order,
          },
        })
      }
    }
  }
}

// ─── Run ──────────────────────────────────────────────────────────────────────

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
