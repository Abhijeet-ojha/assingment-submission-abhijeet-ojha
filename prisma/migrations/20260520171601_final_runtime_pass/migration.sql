/*
  Warnings:

  - The values [WEBHOOK_PROCESSED] on the enum `LeadStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `dedupeKey` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `webhookDeliveredAt` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `leadId` on the `WebhookEvent` table. All the data in the column will be lost.
  - You are about to drop the column `serviceId` on the `WebhookEvent` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[phone,serviceId]` on the table `Lead` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "LeadStatus_new" AS ENUM ('PENDING', 'ALLOCATED');
ALTER TABLE "Lead" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Lead" ALTER COLUMN "status" TYPE "LeadStatus_new" USING ("status"::text::"LeadStatus_new");
ALTER TYPE "LeadStatus" RENAME TO "LeadStatus_old";
ALTER TYPE "LeadStatus_new" RENAME TO "LeadStatus";
DROP TYPE "LeadStatus_old";
ALTER TABLE "Lead" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- DropForeignKey
ALTER TABLE "WebhookEvent" DROP CONSTRAINT "WebhookEvent_leadId_fkey";

-- DropForeignKey
ALTER TABLE "WebhookEvent" DROP CONSTRAINT "WebhookEvent_serviceId_fkey";

-- DropIndex
DROP INDEX "Lead_dedupeKey_key";

-- DropIndex
DROP INDEX "WebhookEvent_leadId_createdAt_idx";

-- DropIndex
DROP INDEX "WebhookEvent_serviceId_createdAt_idx";

-- AlterTable
ALTER TABLE "Lead" DROP COLUMN "dedupeKey",
DROP COLUMN "webhookDeliveredAt",
ALTER COLUMN "email" DROP NOT NULL;

-- AlterTable
ALTER TABLE "WebhookEvent" DROP COLUMN "leadId",
DROP COLUMN "serviceId";

-- CreateIndex
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_phone_serviceId_key" ON "Lead"("phone", "serviceId");

-- CreateIndex
CREATE INDEX "Provider_active_idx" ON "Provider"("active");

-- CreateIndex
CREATE INDEX "WebhookEvent_createdAt_idx" ON "WebhookEvent"("createdAt");
