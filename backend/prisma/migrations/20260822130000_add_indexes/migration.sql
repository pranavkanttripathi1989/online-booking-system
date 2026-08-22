-- F-13 (project-plans/02-findings-register.md): the schema had ZERO declared
-- indexes across 41 models. Confirmed live: every table carried only its
-- primary key (plus unique constraints). PostgreSQL does NOT auto-index
-- foreign-key columns -- it indexes the referenced PK, not the referencing
-- column -- so every list query in the product was a sequential scan.
--
-- Column choice and composite ordering are derived from the actual where/
-- orderBy patterns in backend/src/**.service.ts, not a generic template.
-- Equality predicates lead; the range/sort column comes last.
--
-- Notable: Appointments is keyed on appointment_time, not appointment_date.
-- appointment_time is what the dashboard filters, what findAll orders by,
-- and what the slot-conflict check ranges over; appointment_date only
-- orders the per-patient timeline.
--
-- CREATE INDEX (not CONCURRENTLY): these tables are near-empty today and
-- prisma migrate deploy runs each migration in a transaction, which
-- CONCURRENTLY cannot join. Revisit for any index added post-scale.

CREATE INDEX "Appointments_clinician_id_appointment_time_idx" ON "Appointments"("clinician_id", "appointment_time");
CREATE INDEX "Appointments_clinic_id_appointment_time_idx" ON "Appointments"("clinic_id", "appointment_time");
CREATE INDEX "Appointments_patient_id_appointment_date_idx" ON "Appointments"("patient_id", "appointment_date");
CREATE INDEX "Appointments_is_deleted_appointment_time_idx" ON "Appointments"("is_deleted", "appointment_time");
CREATE INDEX "Appointments_room_id_idx" ON "Appointments"("room_id");
CREATE INDEX "Appointments_product_id_idx" ON "Appointments"("product_id");
CREATE INDEX "Appointments_booked_by_user_id_idx" ON "Appointments"("booked_by_user_id");
CREATE INDEX "AppointmentStatusLogs_appointment_id_created_at_idx" ON "AppointmentStatusLogs"("appointment_id", "created_at");
CREATE INDEX "AuditLogs_user_id_created_at_idx" ON "AuditLogs"("user_id", "created_at");
CREATE INDEX "AuditLogs_resource_resource_id_idx" ON "AuditLogs"("resource", "resource_id");
CREATE INDEX "AuditLogs_created_at_idx" ON "AuditLogs"("created_at");
CREATE INDEX "ClinicianAvailability_clinician_id_is_deleted_idx" ON "ClinicianAvailability"("clinician_id", "is_deleted");
CREATE INDEX "ClinicianAvailability_clinic_id_is_deleted_idx" ON "ClinicianAvailability"("clinic_id", "is_deleted");
CREATE INDEX "ClinicianAvailability_room_id_idx" ON "ClinicianAvailability"("room_id");
CREATE INDEX "Clinicians_clinic_id_is_deleted_is_active_idx" ON "Clinicians"("clinic_id", "is_deleted", "is_active");
CREATE INDEX "ClinicianServices_product_id_idx" ON "ClinicianServices"("product_id");
CREATE INDEX "Clinics_client_org_id_is_deleted_idx" ON "Clinics"("client_org_id", "is_deleted");
CREATE INDEX "LunchBreaks_clinician_id_is_deleted_idx" ON "LunchBreaks"("clinician_id", "is_deleted");
CREATE INDEX "LunchBreaks_clinic_id_idx" ON "LunchBreaks"("clinic_id");
CREATE INDEX "Notifications_user_id_is_deleted_created_at_idx" ON "Notifications"("user_id", "is_deleted", "created_at");
CREATE INDEX "OrganizationSubscriptions_client_org_id_idx" ON "OrganizationSubscriptions"("client_org_id");
CREATE INDEX "OrganizationSubscriptions_plan_id_idx" ON "OrganizationSubscriptions"("plan_id");
CREATE INDEX "Patients_is_deleted_created_at_idx" ON "Patients"("is_deleted", "created_at");
CREATE INDEX "Patients_email_idx" ON "Patients"("email");
CREATE INDEX "Patients_phone_idx" ON "Patients"("phone");
CREATE INDEX "TestResults_patient_id_date_ordered_idx" ON "TestResults"("patient_id", "date_ordered");
CREATE INDEX "TestResults_ordered_by_user_id_idx" ON "TestResults"("ordered_by_user_id");
CREATE INDEX "TestResults_is_deleted_date_ordered_idx" ON "TestResults"("is_deleted", "date_ordered");
CREATE INDEX "PaymentTransactions_client_org_id_created_at_idx" ON "PaymentTransactions"("client_org_id", "created_at");
CREATE INDEX "AppointmentPayments_client_org_id_created_at_idx" ON "AppointmentPayments"("client_org_id", "created_at");
CREATE INDEX "AppointmentPayments_status_created_at_idx" ON "AppointmentPayments"("status", "created_at");
CREATE INDEX "AppointmentPayments_razorpay_order_id_idx" ON "AppointmentPayments"("razorpay_order_id");
CREATE INDEX "AppointmentPayments_appointment_id_idx" ON "AppointmentPayments"("appointment_id");
CREATE INDEX "AppointmentPayments_patient_id_idx" ON "AppointmentPayments"("patient_id");
CREATE INDEX "AppointmentPayments_clinic_id_idx" ON "AppointmentPayments"("clinic_id");
CREATE INDEX "Reviews_clinic_id_is_deleted_idx" ON "Reviews"("clinic_id", "is_deleted");
CREATE INDEX "Reviews_clinician_id_idx" ON "Reviews"("clinician_id");
CREATE INDEX "Reviews_patient_id_idx" ON "Reviews"("patient_id");
CREATE INDEX "Reviews_appointment_id_idx" ON "Reviews"("appointment_id");
CREATE INDEX "MessageThreads_client_org_id_last_activity_idx" ON "MessageThreads"("client_org_id", "last_activity");
CREATE INDEX "MessageParticipants_user_id_idx" ON "MessageParticipants"("user_id");
CREATE INDEX "Messages_thread_id_sent_at_idx" ON "Messages"("thread_id", "sent_at");
CREATE INDEX "Messages_from_id_idx" ON "Messages"("from_id");
CREATE INDEX "ProductCancellationRules_client_org_id_is_deleted_idx" ON "ProductCancellationRules"("client_org_id", "is_deleted");
CREATE INDEX "ProductCancellationRules_product_id_idx" ON "ProductCancellationRules"("product_id");
CREATE INDEX "ProductCancellationRules_clinic_id_idx" ON "ProductCancellationRules"("clinic_id");
CREATE INDEX "ProductCategories_client_org_id_is_deleted_idx" ON "ProductCategories"("client_org_id", "is_deleted");
CREATE INDEX "ProductSubcategories_client_org_id_is_deleted_idx" ON "ProductSubcategories"("client_org_id", "is_deleted");
CREATE INDEX "ProductSubcategories_category_id_idx" ON "ProductSubcategories"("category_id");
CREATE INDEX "ProductVariations_product_id_idx" ON "ProductVariations"("product_id");
CREATE INDEX "Products_client_org_id_is_deleted_idx" ON "Products"("client_org_id", "is_deleted");
CREATE INDEX "Products_category_id_idx" ON "Products"("category_id");
CREATE INDEX "Products_subcategory_id_idx" ON "Products"("subcategory_id");
CREATE INDEX "Products_clinic_id_idx" ON "Products"("clinic_id");
CREATE INDEX "RolePermissions_role_id_idx" ON "RolePermissions"("role_id");
CREATE INDEX "RolePermissions_permission_id_idx" ON "RolePermissions"("permission_id");
CREATE INDEX "RoomBlocks_room_id_block_date_idx" ON "RoomBlocks"("room_id", "block_date");
CREATE INDEX "RoomBlocks_clinic_id_is_deleted_idx" ON "RoomBlocks"("clinic_id", "is_deleted");
CREATE INDEX "Rooms_clinic_id_is_deleted_idx" ON "Rooms"("clinic_id", "is_deleted");
CREATE INDEX "SpacerBlocks_clinician_id_block_date_idx" ON "SpacerBlocks"("clinician_id", "block_date");
CREATE INDEX "SpacerBlocks_clinic_id_is_deleted_idx" ON "SpacerBlocks"("clinic_id", "is_deleted");
CREATE INDEX "SpacerBlocks_room_id_idx" ON "SpacerBlocks"("room_id");
CREATE INDEX "UserProfiles_client_org_id_is_deleted_idx" ON "UserProfiles"("client_org_id", "is_deleted");
CREATE INDEX "UserProfiles_role_id_idx" ON "UserProfiles"("role_id");
CREATE INDEX "UserProfiles_clinic_id_idx" ON "UserProfiles"("clinic_id");
CREATE INDEX "UserProfiles_patient_id_idx" ON "UserProfiles"("patient_id");
CREATE INDEX "UserProfiles_clinician_id_idx" ON "UserProfiles"("clinician_id");
CREATE INDEX "UserRoles_client_org_id_idx" ON "UserRoles"("client_org_id");
CREATE INDEX "ClinicianLanguages_language_id_idx" ON "ClinicianLanguages"("language_id");
