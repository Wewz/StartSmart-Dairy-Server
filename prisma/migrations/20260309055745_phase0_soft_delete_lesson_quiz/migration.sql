-- AlterTable
ALTER TABLE "lessons" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "quizzes" ADD COLUMN     "deletedAt" TIMESTAMP(3);
