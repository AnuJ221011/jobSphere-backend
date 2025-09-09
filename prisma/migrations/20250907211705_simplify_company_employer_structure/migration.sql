/*
  Warnings:

  - You are about to drop the column `employerId` on the `Company` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `Company` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `employerId` to the `Job` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CompanyRole" AS ENUM ('ADMIN', 'HR_MANAGER', 'RECRUITER', 'HIRING_MANAGER');

-- DropForeignKey
ALTER TABLE "Company" DROP CONSTRAINT "Company_employerId_fkey";

-- DropIndex
DROP INDEX "Company_employerId_idx";

-- AlterTable
ALTER TABLE "Company" DROP COLUMN "employerId";

-- AlterTable
ALTER TABLE "Employer" ADD COLUMN     "companyId" INTEGER,
ADD COLUMN     "department" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "jobTitle" TEXT,
ADD COLUMN     "joinedAt" TIMESTAMP(3),
ADD COLUMN     "role" "CompanyRole" NOT NULL DEFAULT 'RECRUITER';

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "employerId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Company_name_key" ON "Company"("name");

-- CreateIndex
CREATE INDEX "Company_name_idx" ON "Company"("name");

-- CreateIndex
CREATE INDEX "Company_industry_idx" ON "Company"("industry");

-- CreateIndex
CREATE INDEX "Employer_companyId_idx" ON "Employer"("companyId");

-- CreateIndex
CREATE INDEX "Job_employerId_idx" ON "Job"("employerId");

-- AddForeignKey
ALTER TABLE "Employer" ADD CONSTRAINT "Employer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_employerId_fkey" FOREIGN KEY ("employerId") REFERENCES "Employer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
