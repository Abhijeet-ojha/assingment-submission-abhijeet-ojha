-- CreateEnum
CREATE TYPE "ServiceCode" AS ENUM ('SERVICE_1', 'SERVICE_2', 'SERVICE_3');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('PENDING', 'ALLOCATED', 'WEBHOOK_PROCESSED');

-- CreateTable
CREATE TABLE "Service" (
    "id" SERIAL NOT NULL,
    "code" "ServiceCode" NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Provider" (
    "id" SERIAL NOT NULL,
    "providerCode" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "monthlyQuota" INTEGER NOT NULL DEFAULT 10,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'PENDING',
    "dedupeKey" TEXT NOT NULL,
    "webhookDeliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadAssignment" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "providerId" INTEGER NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AllocationCursor" (
    "id" TEXT NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "nextIndex" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AllocationCursor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderMonthlyUsage" (
    "id" TEXT NOT NULL,
    "providerId" INTEGER NOT NULL,
    "monthKey" TEXT NOT NULL,
    "assignmentsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderMonthlyUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "leadId" TEXT,
    "serviceId" INTEGER,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'processed',
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Service_code_key" ON "Service"("code");

-- CreateIndex
CREATE INDEX "Service_code_active_idx" ON "Service"("code", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Provider_providerCode_key" ON "Provider"("providerCode");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_dedupeKey_key" ON "Lead"("dedupeKey");

-- CreateIndex
CREATE INDEX "Lead_serviceId_createdAt_idx" ON "Lead"("serviceId", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_status_createdAt_idx" ON "Lead"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_city_idx" ON "Lead"("city");

-- CreateIndex
CREATE UNIQUE INDEX "LeadAssignment_leadId_providerId_key" ON "LeadAssignment"("leadId", "providerId");

-- CreateIndex
CREATE INDEX "LeadAssignment_serviceId_assignedAt_idx" ON "LeadAssignment"("serviceId", "assignedAt");

-- CreateIndex
CREATE INDEX "LeadAssignment_providerId_assignedAt_idx" ON "LeadAssignment"("providerId", "assignedAt");

-- CreateIndex
CREATE INDEX "LeadAssignment_leadId_assignedAt_idx" ON "LeadAssignment"("leadId", "assignedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AllocationCursor_serviceId_key" ON "AllocationCursor"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderMonthlyUsage_providerId_monthKey_key" ON "ProviderMonthlyUsage"("providerId", "monthKey");

-- CreateIndex
CREATE INDEX "ProviderMonthlyUsage_monthKey_idx" ON "ProviderMonthlyUsage"("monthKey");

-- CreateIndex
CREATE INDEX "ProviderMonthlyUsage_providerId_monthKey_idx" ON "ProviderMonthlyUsage"("providerId", "monthKey");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_idempotencyKey_key" ON "WebhookEvent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "WebhookEvent_leadId_createdAt_idx" ON "WebhookEvent"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "WebhookEvent_serviceId_createdAt_idx" ON "WebhookEvent"("serviceId", "createdAt");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadAssignment" ADD CONSTRAINT "LeadAssignment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadAssignment" ADD CONSTRAINT "LeadAssignment_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadAssignment" ADD CONSTRAINT "LeadAssignment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllocationCursor" ADD CONSTRAINT "AllocationCursor_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderMonthlyUsage" ADD CONSTRAINT "ProviderMonthlyUsage_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
