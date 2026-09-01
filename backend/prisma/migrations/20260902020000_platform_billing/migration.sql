-- REQ178/179/180 — platform (tenant SaaS) billing. Additive only.

ALTER TABLE "ClientOrganizations" ADD COLUMN "gstin" TEXT;

CREATE TABLE "PlatformSubscriptions" (
    "id" TEXT NOT NULL,
    "client_org_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "plan_version_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "gateway" TEXT NOT NULL,
    "gateway_customer_id" TEXT,
    "gateway_subscription_id" TEXT,
    "mandate_status" TEXT,
    "mandate_max_amount_paise" INTEGER,
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "cancelled_at" TIMESTAMP(3),
    "cancelled_by_user_id" TEXT,
    "cancellation_reason" TEXT,
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformSubscriptions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlatformSubscriptions_client_org_id_idx" ON "PlatformSubscriptions"("client_org_id");
CREATE INDEX "PlatformSubscriptions_status_idx" ON "PlatformSubscriptions"("status");
CREATE INDEX "PlatformSubscriptions_gateway_subscription_id_idx" ON "PlatformSubscriptions"("gateway_subscription_id");

ALTER TABLE "PlatformSubscriptions" ADD CONSTRAINT "PlatformSubscriptions_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlatformSubscriptions" ADD CONSTRAINT "PlatformSubscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "Plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlatformSubscriptions" ADD CONSTRAINT "PlatformSubscriptions_plan_version_id_fkey" FOREIGN KEY ("plan_version_id") REFERENCES "PlanVersions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "PlatformInvoices" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "client_org_id" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "amount_paise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "due_date" TIMESTAMP(3) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "gateway" TEXT NOT NULL,
    "gateway_invoice_id" TEXT,
    "gateway_payment_id" TEXT,
    "pre_debit_notice_sent_at" TIMESTAMP(3),
    "pre_debit_notice_amount_paise" INTEGER,
    "afa_required" BOOLEAN NOT NULL DEFAULT false,
    "platform_gstin" TEXT,
    "client_org_gstin" TEXT,
    "hsn_sac_code" TEXT,
    "gst_rate" DOUBLE PRECISION,
    "cgst_amount_paise" INTEGER,
    "sgst_amount_paise" INTEGER,
    "igst_amount_paise" INTEGER,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformInvoices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlatformInvoices_invoice_number_key" ON "PlatformInvoices"("invoice_number");
CREATE INDEX "PlatformInvoices_subscription_id_idx" ON "PlatformInvoices"("subscription_id");
CREATE INDEX "PlatformInvoices_client_org_id_created_at_idx" ON "PlatformInvoices"("client_org_id", "created_at");
CREATE INDEX "PlatformInvoices_status_idx" ON "PlatformInvoices"("status");

ALTER TABLE "PlatformInvoices" ADD CONSTRAINT "PlatformInvoices_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "PlatformSubscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlatformInvoices" ADD CONSTRAINT "PlatformInvoices_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "PlatformDunningEvents" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "invoice_id" TEXT,
    "event_type" TEXT NOT NULL,
    "attempt_number" INTEGER,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "PlatformDunningEvents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlatformDunningEvents_subscription_id_idx" ON "PlatformDunningEvents"("subscription_id");

ALTER TABLE "PlatformDunningEvents" ADD CONSTRAINT "PlatformDunningEvents_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "PlatformSubscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
