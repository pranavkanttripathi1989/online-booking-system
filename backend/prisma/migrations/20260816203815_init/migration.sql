-- CreateEnum
CREATE TYPE "TemplateType" AS ENUM ('confirmation', 'reschedule', 'cancellation', 'welcome', 'password_reset', 'otp', 'invoice_receipt', 'review_request');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('appointment', 'system', 'payment', 'alert');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('simple', 'variable');

-- CreateEnum
CREATE TYPE "RuleType" AS ENUM ('cancellation', 'reschedule');

-- CreateEnum
CREATE TYPE "FeeType" AS ENUM ('fixed', 'percentage');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'cancelled', 'expired', 'trial');

-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('pending', 'in_progress', 'completed');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('monthly', 'yearly');

-- CreateEnum
CREATE TYPE "RecurrenceType" AS ENUM ('single', 'daily', 'weekly', 'monthly', 'custom');

-- CreateTable
CREATE TABLE "clinician_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinician_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointments" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "clinician_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "appointment_date" TIMESTAMP(3) NOT NULL,
    "appointment_time" TIMESTAMP(3) NOT NULL,
    "duration_minutes" INTEGER NOT NULL DEFAULT 30,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "reason" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "product_id" TEXT,
    "product_variation_id" TEXT,

    CONSTRAINT "Appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLogs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resource_id" TEXT,
    "details" JSONB NOT NULL DEFAULT '{}',
    "ip_address" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientOrganizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "contact_email" TEXT NOT NULL,
    "contact_phone" TEXT,
    "address" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "owner_user_id" TEXT,
    "onboarding_status" "OnboardingStatus" NOT NULL DEFAULT 'pending',
    "onboarding_step" TEXT,
    "trial_ends_at" TIMESTAMP(3),
    "onboarded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientOrganizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicianAvailability" (
    "id" TEXT NOT NULL,
    "clinician_id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "day_of_week" INTEGER,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "recurrence_type" TEXT NOT NULL DEFAULT 'weekly',
    "custom_dates" TEXT,
    "exclude_weekends" BOOLEAN NOT NULL DEFAULT false,
    "exclude_saturday" BOOLEAN NOT NULL DEFAULT false,
    "exclude_sunday" BOOLEAN NOT NULL DEFAULT false,
    "excluded_days" TEXT,
    "valid_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_until" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "room_id" TEXT,

    CONSTRAINT "ClinicianAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clinicians" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "clinician_type" TEXT NOT NULL,
    "gender" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Clinicians_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clinics" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "client_org_id" TEXT,

    CONSTRAINT "Clinics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTemplates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "template_type" "TemplateType" NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailTemplates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LunchBreaks" (
    "id" TEXT NOT NULL,
    "clinician_id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "day_of_week" INTEGER,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "is_recurring" BOOLEAN NOT NULL DEFAULT true,
    "specific_date" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recurrence_type" "RecurrenceType" NOT NULL DEFAULT 'single',
    "recurrence_days" JSONB,
    "end_date" TIMESTAMP(3),

    CONSTRAINT "LunchBreaks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'medium',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "action_url" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationSubscriptions" (
    "id" TEXT NOT NULL,
    "client_org_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "billing_cycle" "BillingCycle" NOT NULL,
    "current_period_start" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationSubscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patients" (
    "id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "date_of_birth" TIMESTAMP(3) NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "phone_country_code" TEXT,
    "address" TEXT NOT NULL,
    "medical_notes" TEXT NOT NULL DEFAULT '',
    "title" TEXT,
    "status" TEXT,
    "birth_surname" TEXT,
    "birth_name" TEXT,
    "birth_names" TEXT,
    "social_security_number" TEXT,
    "gender" TEXT,
    "sex" TEXT,
    "google_client_id" TEXT,
    "payment_reference" TEXT,
    "occupation" TEXT,
    "place_of_birth" JSONB,
    "phones" JSONB,
    "address_structured" JSONB,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentTransactions" (
    "id" TEXT NOT NULL,
    "client_org_id" TEXT NOT NULL,
    "subscription_id" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "stripe_payment_intent_id" TEXT,
    "stripe_invoice_id" TEXT,
    "razorpay_order_id" TEXT,
    "razorpay_payment_id" TEXT,
    "razorpay_signature" TEXT,
    "gstin" TEXT,
    "hsn_sac_code" TEXT,
    "gst_rate" DOUBLE PRECISION,
    "cgst_amount" INTEGER,
    "sgst_amount" INTEGER,
    "igst_amount" INTEGER,
    "transaction_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentTransactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reviews" (
    "id" TEXT NOT NULL,
    "appointment_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "clinician_id" TEXT,
    "clinic_id" TEXT,
    "stars" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "response" TEXT,
    "responded_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageThreads" (
    "id" TEXT NOT NULL,
    "client_org_id" TEXT NOT NULL,
    "last_message" TEXT,
    "last_activity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageThreads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageParticipants" (
    "id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "unread_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MessageParticipants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Messages" (
    "id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "from_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "read_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permissions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCancellationRules" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "rule_type" "RuleType" NOT NULL,
    "hours_before_appointment" INTEGER NOT NULL DEFAULT 24,
    "fee_type" "FeeType" NOT NULL,
    "fee_amount" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductCancellationRules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCategories" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductCategories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSubcategories" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT,
    "category_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductSubcategories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariations" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "variation_name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "duration_minutes" INTEGER,
    "stock_quantity" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductVariations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Products" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT,
    "category_id" TEXT,
    "subcategory_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "product_type" "ProductType" NOT NULL,
    "sku" TEXT NOT NULL,
    "price" INTEGER,
    "duration_minutes" INTEGER,
    "order_by" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermissions" (
    "id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomBlocks" (
    "id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "block_date" TIMESTAMP(3) NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomBlocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rooms" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "room_number" TEXT NOT NULL,
    "room_type" TEXT NOT NULL DEFAULT 'consultation',
    "clinician_type" TEXT,
    "capacity" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpacerBlocks" (
    "id" TEXT NOT NULL,
    "clinician_id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "room_id" TEXT,
    "block_date" TIMESTAMP(3),
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recurrence_type" "RecurrenceType" NOT NULL DEFAULT 'single',
    "recurrence_days" JSONB,
    "end_date" TIMESTAMP(3),

    CONSTRAINT "SpacerBlocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripeConfigurations" (
    "id" TEXT NOT NULL,
    "client_org_id" TEXT NOT NULL,
    "stripe_account_id" TEXT,
    "stripe_publishable_key" TEXT,
    "stripe_webhook_secret" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeConfigurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPlans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price_monthly" INTEGER NOT NULL DEFAULT 0,
    "price_yearly" INTEGER NOT NULL DEFAULT 0,
    "max_clinics" INTEGER NOT NULL DEFAULT 1,
    "max_users" INTEGER NOT NULL DEFAULT 5,
    "features" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionPlans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Users" (
    "id" TEXT NOT NULL,

    CONSTRAINT "Users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfiles" (
    "id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "phone" TEXT,
    "phone_country_code" TEXT,
    "address_line1" TEXT,
    "address_line2" TEXT,
    "city" TEXT,
    "postal_code" TEXT,
    "country" TEXT,
    "user_image" TEXT,
    "clinic_id" TEXT,
    "clinician_id" TEXT,
    "patient_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "client_org_id" TEXT,
    "password_reset_token" TEXT,
    "password_reset_expires" TIMESTAMP(3),
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verification_token" TEXT,
    "email_verification_expires" TIMESTAMP(3),

    CONSTRAINT "UserProfiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRoles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRoles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Languages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Languages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicianLanguages" (
    "id" TEXT NOT NULL,
    "clinician_id" TEXT NOT NULL,
    "language_id" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicianLanguages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clinician_types_name_key" ON "clinician_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "room_types_name_key" ON "room_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ClientOrganizations_code_key" ON "ClientOrganizations"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Clinicians_email_key" ON "Clinicians"("email");

-- CreateIndex
CREATE UNIQUE INDEX "MessageParticipants_thread_id_user_id_key" ON "MessageParticipants"("thread_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Permissions_name_key" ON "Permissions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariations_sku_key" ON "ProductVariations"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "Products_sku_key" ON "Products"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "StripeConfigurations_client_org_id_key" ON "StripeConfigurations"("client_org_id");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlans_name_key" ON "SubscriptionPlans"("name");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfiles_email_key" ON "UserProfiles"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfiles_phone_key" ON "UserProfiles"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "UserRoles_name_key" ON "UserRoles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Languages_name_key" ON "Languages"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Languages_code_key" ON "Languages"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicianLanguages_clinician_id_language_id_key" ON "ClinicianLanguages"("clinician_id", "language_id");

-- AddForeignKey
ALTER TABLE "Appointments" ADD CONSTRAINT "Appointments_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointments" ADD CONSTRAINT "Appointments_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "Rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointments" ADD CONSTRAINT "Appointments_clinician_id_fkey" FOREIGN KEY ("clinician_id") REFERENCES "Clinicians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointments" ADD CONSTRAINT "Appointments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointments" ADD CONSTRAINT "Appointments_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointments" ADD CONSTRAINT "Appointments_product_variation_id_fkey" FOREIGN KEY ("product_variation_id") REFERENCES "ProductVariations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLogs" ADD CONSTRAINT "AuditLogs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientOrganizations" ADD CONSTRAINT "ClientOrganizations_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicianAvailability" ADD CONSTRAINT "ClinicianAvailability_clinician_id_fkey" FOREIGN KEY ("clinician_id") REFERENCES "Clinicians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicianAvailability" ADD CONSTRAINT "ClinicianAvailability_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicianAvailability" ADD CONSTRAINT "ClinicianAvailability_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "Rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clinicians" ADD CONSTRAINT "Clinicians_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clinics" ADD CONSTRAINT "Clinics_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LunchBreaks" ADD CONSTRAINT "LunchBreaks_clinician_id_fkey" FOREIGN KEY ("clinician_id") REFERENCES "Clinicians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LunchBreaks" ADD CONSTRAINT "LunchBreaks_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notifications" ADD CONSTRAINT "Notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationSubscriptions" ADD CONSTRAINT "OrganizationSubscriptions_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationSubscriptions" ADD CONSTRAINT "OrganizationSubscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "SubscriptionPlans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransactions" ADD CONSTRAINT "PaymentTransactions_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransactions" ADD CONSTRAINT "PaymentTransactions_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "OrganizationSubscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reviews" ADD CONSTRAINT "Reviews_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "Appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reviews" ADD CONSTRAINT "Reviews_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reviews" ADD CONSTRAINT "Reviews_clinician_id_fkey" FOREIGN KEY ("clinician_id") REFERENCES "Clinicians"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reviews" ADD CONSTRAINT "Reviews_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageThreads" ADD CONSTRAINT "MessageThreads_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageParticipants" ADD CONSTRAINT "MessageParticipants_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "MessageThreads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageParticipants" ADD CONSTRAINT "MessageParticipants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Messages" ADD CONSTRAINT "Messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "MessageThreads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Messages" ADD CONSTRAINT "Messages_from_id_fkey" FOREIGN KEY ("from_id") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCancellationRules" ADD CONSTRAINT "ProductCancellationRules_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCategories" ADD CONSTRAINT "ProductCategories_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSubcategories" ADD CONSTRAINT "ProductSubcategories_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSubcategories" ADD CONSTRAINT "ProductSubcategories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "ProductCategories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariations" ADD CONSTRAINT "ProductVariations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Products" ADD CONSTRAINT "Products_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Products" ADD CONSTRAINT "Products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "ProductCategories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Products" ADD CONSTRAINT "Products_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "ProductSubcategories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermissions" ADD CONSTRAINT "RolePermissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "UserRoles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermissions" ADD CONSTRAINT "RolePermissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "Permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomBlocks" ADD CONSTRAINT "RoomBlocks_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "Rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomBlocks" ADD CONSTRAINT "RoomBlocks_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rooms" ADD CONSTRAINT "Rooms_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpacerBlocks" ADD CONSTRAINT "SpacerBlocks_clinician_id_fkey" FOREIGN KEY ("clinician_id") REFERENCES "Clinicians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpacerBlocks" ADD CONSTRAINT "SpacerBlocks_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpacerBlocks" ADD CONSTRAINT "SpacerBlocks_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "Rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StripeConfigurations" ADD CONSTRAINT "StripeConfigurations_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfiles" ADD CONSTRAINT "UserProfiles_id_fkey" FOREIGN KEY ("id") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfiles" ADD CONSTRAINT "UserProfiles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "UserRoles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfiles" ADD CONSTRAINT "UserProfiles_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfiles" ADD CONSTRAINT "UserProfiles_clinician_id_fkey" FOREIGN KEY ("clinician_id") REFERENCES "Clinicians"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfiles" ADD CONSTRAINT "UserProfiles_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfiles" ADD CONSTRAINT "UserProfiles_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicianLanguages" ADD CONSTRAINT "ClinicianLanguages_clinician_id_fkey" FOREIGN KEY ("clinician_id") REFERENCES "Clinicians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicianLanguages" ADD CONSTRAINT "ClinicianLanguages_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "Languages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
