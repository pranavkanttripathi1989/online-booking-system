--
-- PostgreSQL database dump
--

\restrict wenWwFhQg5WjGx6Odl6Wk4FKIDOqOXaDUGHfD6TkfmhkEVPNga9O5xq8jEAa7fY

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public."UserRoles" DROP CONSTRAINT IF EXISTS "UserRoles_client_org_id_fkey";
ALTER TABLE IF EXISTS ONLY public."UserProfiles" DROP CONSTRAINT IF EXISTS "UserProfiles_role_id_fkey";
ALTER TABLE IF EXISTS ONLY public."UserProfiles" DROP CONSTRAINT IF EXISTS "UserProfiles_patient_id_fkey";
ALTER TABLE IF EXISTS ONLY public."UserProfiles" DROP CONSTRAINT IF EXISTS "UserProfiles_id_fkey";
ALTER TABLE IF EXISTS ONLY public."UserProfiles" DROP CONSTRAINT IF EXISTS "UserProfiles_clinician_id_fkey";
ALTER TABLE IF EXISTS ONLY public."UserProfiles" DROP CONSTRAINT IF EXISTS "UserProfiles_clinic_id_fkey";
ALTER TABLE IF EXISTS ONLY public."UserProfiles" DROP CONSTRAINT IF EXISTS "UserProfiles_client_org_id_fkey";
ALTER TABLE IF EXISTS ONLY public."TestResults" DROP CONSTRAINT IF EXISTS "TestResults_patient_id_fkey";
ALTER TABLE IF EXISTS ONLY public."TestResults" DROP CONSTRAINT IF EXISTS "TestResults_ordered_by_user_id_fkey";
ALTER TABLE IF EXISTS ONLY public."StripeConfigurations" DROP CONSTRAINT IF EXISTS "StripeConfigurations_client_org_id_fkey";
ALTER TABLE IF EXISTS ONLY public."SpacerBlocks" DROP CONSTRAINT IF EXISTS "SpacerBlocks_room_id_fkey";
ALTER TABLE IF EXISTS ONLY public."SpacerBlocks" DROP CONSTRAINT IF EXISTS "SpacerBlocks_clinician_id_fkey";
ALTER TABLE IF EXISTS ONLY public."SpacerBlocks" DROP CONSTRAINT IF EXISTS "SpacerBlocks_clinic_id_fkey";
ALTER TABLE IF EXISTS ONLY public."Rooms" DROP CONSTRAINT IF EXISTS "Rooms_clinic_id_fkey";
ALTER TABLE IF EXISTS ONLY public."RoomBlocks" DROP CONSTRAINT IF EXISTS "RoomBlocks_room_id_fkey";
ALTER TABLE IF EXISTS ONLY public."RoomBlocks" DROP CONSTRAINT IF EXISTS "RoomBlocks_clinic_id_fkey";
ALTER TABLE IF EXISTS ONLY public."RolePermissions" DROP CONSTRAINT IF EXISTS "RolePermissions_role_id_fkey";
ALTER TABLE IF EXISTS ONLY public."RolePermissions" DROP CONSTRAINT IF EXISTS "RolePermissions_permission_id_fkey";
ALTER TABLE IF EXISTS ONLY public."Reviews" DROP CONSTRAINT IF EXISTS "Reviews_patient_id_fkey";
ALTER TABLE IF EXISTS ONLY public."Reviews" DROP CONSTRAINT IF EXISTS "Reviews_clinician_id_fkey";
ALTER TABLE IF EXISTS ONLY public."Reviews" DROP CONSTRAINT IF EXISTS "Reviews_clinic_id_fkey";
ALTER TABLE IF EXISTS ONLY public."Reviews" DROP CONSTRAINT IF EXISTS "Reviews_appointment_id_fkey";
ALTER TABLE IF EXISTS ONLY public."Resources" DROP CONSTRAINT IF EXISTS "Resources_clinic_id_fkey";
ALTER TABLE IF EXISTS ONLY public."Resources" DROP CONSTRAINT IF EXISTS "Resources_client_org_id_fkey";
ALTER TABLE IF EXISTS ONLY public."QueueEvents" DROP CONSTRAINT IF EXISTS "QueueEvents_queue_entry_id_fkey";
ALTER TABLE IF EXISTS ONLY public."QueueEvents" DROP CONSTRAINT IF EXISTS "QueueEvents_changed_by_user_id_fkey";
ALTER TABLE IF EXISTS ONLY public."QueueEntries" DROP CONSTRAINT IF EXISTS "QueueEntries_clinician_id_fkey";
ALTER TABLE IF EXISTS ONLY public."QueueEntries" DROP CONSTRAINT IF EXISTS "QueueEntries_clinic_id_fkey";
ALTER TABLE IF EXISTS ONLY public."QueueEntries" DROP CONSTRAINT IF EXISTS "QueueEntries_appointment_id_fkey";
ALTER TABLE IF EXISTS ONLY public."Products" DROP CONSTRAINT IF EXISTS "Products_subcategory_id_fkey";
ALTER TABLE IF EXISTS ONLY public."Products" DROP CONSTRAINT IF EXISTS "Products_clinic_id_fkey";
ALTER TABLE IF EXISTS ONLY public."Products" DROP CONSTRAINT IF EXISTS "Products_client_org_id_fkey";
ALTER TABLE IF EXISTS ONLY public."Products" DROP CONSTRAINT IF EXISTS "Products_category_id_fkey";
ALTER TABLE IF EXISTS ONLY public."ProductVariations" DROP CONSTRAINT IF EXISTS "ProductVariations_product_id_fkey";
ALTER TABLE IF EXISTS ONLY public."ProductSubcategories" DROP CONSTRAINT IF EXISTS "ProductSubcategories_clinic_id_fkey";
ALTER TABLE IF EXISTS ONLY public."ProductSubcategories" DROP CONSTRAINT IF EXISTS "ProductSubcategories_client_org_id_fkey";
ALTER TABLE IF EXISTS ONLY public."ProductSubcategories" DROP CONSTRAINT IF EXISTS "ProductSubcategories_category_id_fkey";
ALTER TABLE IF EXISTS ONLY public."ProductCategories" DROP CONSTRAINT IF EXISTS "ProductCategories_clinic_id_fkey";
ALTER TABLE IF EXISTS ONLY public."ProductCategories" DROP CONSTRAINT IF EXISTS "ProductCategories_client_org_id_fkey";
ALTER TABLE IF EXISTS ONLY public."ProductCancellationRules" DROP CONSTRAINT IF EXISTS "ProductCancellationRules_product_id_fkey";
ALTER TABLE IF EXISTS ONLY public."ProductCancellationRules" DROP CONSTRAINT IF EXISTS "ProductCancellationRules_clinic_id_fkey";
ALTER TABLE IF EXISTS ONLY public."ProductCancellationRules" DROP CONSTRAINT IF EXISTS "ProductCancellationRules_client_org_id_fkey";
ALTER TABLE IF EXISTS ONLY public."Prescriptions" DROP CONSTRAINT IF EXISTS "Prescriptions_repeated_from_id_fkey";
ALTER TABLE IF EXISTS ONLY public."Prescriptions" DROP CONSTRAINT IF EXISTS "Prescriptions_patient_id_fkey";
ALTER TABLE IF EXISTS ONLY public."Prescriptions" DROP CONSTRAINT IF EXISTS "Prescriptions_encounter_id_fkey";
ALTER TABLE IF EXISTS ONLY public."Prescriptions" DROP CONSTRAINT IF EXISTS "Prescriptions_clinician_id_fkey";
ALTER TABLE IF EXISTS ONLY public."PrescriptionSets" DROP CONSTRAINT IF EXISTS "PrescriptionSets_clinician_id_fkey";
ALTER TABLE IF EXISTS ONLY public."PrescriptionSets" DROP CONSTRAINT IF EXISTS "PrescriptionSets_client_org_id_fkey";
ALTER TABLE IF EXISTS ONLY public."PrescriptionSetItems" DROP CONSTRAINT IF EXISTS "PrescriptionSetItems_prescription_set_id_fkey";
ALTER TABLE IF EXISTS ONLY public."PrescriptionSetItems" DROP CONSTRAINT IF EXISTS "PrescriptionSetItems_drug_id_fkey";
ALTER TABLE IF EXISTS ONLY public."PrescriptionItems" DROP CONSTRAINT IF EXISTS "PrescriptionItems_prescription_id_fkey";
ALTER TABLE IF EXISTS ONLY public."PrescriptionItems" DROP CONSTRAINT IF EXISTS "PrescriptionItems_drug_id_fkey";
ALTER TABLE IF EXISTS ONLY public."PaymentTransactions" DROP CONSTRAINT IF EXISTS "PaymentTransactions_subscription_id_fkey";
ALTER TABLE IF EXISTS ONLY public."PaymentTransactions" DROP CONSTRAINT IF EXISTS "PaymentTransactions_client_org_id_fkey";
ALTER TABLE IF EXISTS ONLY public."PatientRelations" DROP CONSTRAINT IF EXISTS "PatientRelations_related_patient_id_fkey";
ALTER TABLE IF EXISTS ONLY public."PatientRelations" DROP CONSTRAINT IF EXISTS "PatientRelations_patient_id_fkey";
ALTER TABLE IF EXISTS ONLY public."PatientMerges" DROP CONSTRAINT IF EXISTS "PatientMerges_surviving_patient_id_fkey";
ALTER TABLE IF EXISTS ONLY public."PatientMerges" DROP CONSTRAINT IF EXISTS "PatientMerges_merged_patient_id_fkey";
ALTER TABLE IF EXISTS ONLY public."PatientMerges" DROP CONSTRAINT IF EXISTS "PatientMerges_merged_by_user_id_fkey";
ALTER TABLE IF EXISTS ONLY public."OrganizationSubscriptions" DROP CONSTRAINT IF EXISTS "OrganizationSubscriptions_plan_id_fkey";
ALTER TABLE IF EXISTS ONLY public."OrganizationSubscriptions" DROP CONSTRAINT IF EXISTS "OrganizationSubscriptions_client_org_id_fkey";
ALTER TABLE IF EXISTS ONLY public."Notifications" DROP CONSTRAINT IF EXISTS "Notifications_user_id_fkey";
ALTER TABLE IF EXISTS ONLY public."NotificationProviderConfig" DROP CONSTRAINT IF EXISTS "NotificationProviderConfig_client_org_id_fkey";
ALTER TABLE IF EXISTS ONLY public."NotificationPreferences" DROP CONSTRAINT IF EXISTS "NotificationPreferences_user_id_fkey";
ALTER TABLE IF EXISTS ONLY public."Messages" DROP CONSTRAINT IF EXISTS "Messages_thread_id_fkey";
ALTER TABLE IF EXISTS ONLY public."Messages" DROP CONSTRAINT IF EXISTS "Messages_from_id_fkey";
ALTER TABLE IF EXISTS ONLY public."MessageThreads" DROP CONSTRAINT IF EXISTS "MessageThreads_client_org_id_fkey";
ALTER TABLE IF EXISTS ONLY public."MessageThreads" DROP CONSTRAINT IF EXISTS "MessageThreads_assigned_to_user_id_fkey";
ALTER TABLE IF EXISTS ONLY public."MessageParticipants" DROP CONSTRAINT IF EXISTS "MessageParticipants_user_id_fkey";
ALTER TABLE IF EXISTS ONLY public."MessageParticipants" DROP CONSTRAINT IF EXISTS "MessageParticipants_thread_id_fkey";
ALTER TABLE IF EXISTS ONLY public."LunchBreaks" DROP CONSTRAINT IF EXISTS "LunchBreaks_clinician_id_fkey";
ALTER TABLE IF EXISTS ONLY public."LunchBreaks" DROP CONSTRAINT IF EXISTS "LunchBreaks_clinic_id_fkey";
ALTER TABLE IF EXISTS ONLY public."InvoiceSequences" DROP CONSTRAINT IF EXISTS "InvoiceSequences_clinic_id_fkey";
ALTER TABLE IF EXISTS ONLY public."Encounters" DROP CONSTRAINT IF EXISTS "Encounters_signed_by_id_fkey";
ALTER TABLE IF EXISTS ONLY public."Encounters" DROP CONSTRAINT IF EXISTS "Encounters_patient_id_fkey";
ALTER TABLE IF EXISTS ONLY public."Encounters" DROP CONSTRAINT IF EXISTS "Encounters_clinician_id_fkey";
ALTER TABLE IF EXISTS ONLY public."Encounters" DROP CONSTRAINT IF EXISTS "Encounters_client_org_id_fkey";
ALTER TABLE IF EXISTS ONLY public."Encounters" DROP CONSTRAINT IF EXISTS "Encounters_appointment_id_fkey";
ALTER TABLE IF EXISTS ONLY public."EncounterTemplates" DROP CONSTRAINT IF EXISTS "EncounterTemplates_clinician_id_fkey";
ALTER TABLE IF EXISTS ONLY public."EncounterTemplates" DROP CONSTRAINT IF EXISTS "EncounterTemplates_client_org_id_fkey";
ALTER TABLE IF EXISTS ONLY public."EncounterNotes" DROP CONSTRAINT IF EXISTS "EncounterNotes_encounter_id_fkey";
ALTER TABLE IF EXISTS ONLY public."EncounterAddenda" DROP CONSTRAINT IF EXISTS "EncounterAddenda_encounter_id_fkey";
ALTER TABLE IF EXISTS ONLY public."EncounterAddenda" DROP CONSTRAINT IF EXISTS "EncounterAddenda_author_id_fkey";
ALTER TABLE IF EXISTS ONLY public."Drugs" DROP CONSTRAINT IF EXISTS "Drugs_client_org_id_fkey";
ALTER TABLE IF EXISTS ONLY public."Diagnoses" DROP CONSTRAINT IF EXISTS "Diagnoses_encounter_id_fkey";
ALTER TABLE IF EXISTS ONLY public."Clinics" DROP CONSTRAINT IF EXISTS "Clinics_client_org_id_fkey";
ALTER TABLE IF EXISTS ONLY public."Clinicians" DROP CONSTRAINT IF EXISTS "Clinicians_clinic_id_fkey";
ALTER TABLE IF EXISTS ONLY public."ClinicianServices" DROP CONSTRAINT IF EXISTS "ClinicianServices_product_id_fkey";
ALTER TABLE IF EXISTS ONLY public."ClinicianServices" DROP CONSTRAINT IF EXISTS "ClinicianServices_clinician_id_fkey";
ALTER TABLE IF EXISTS ONLY public."ClinicianLanguages" DROP CONSTRAINT IF EXISTS "ClinicianLanguages_language_id_fkey";
ALTER TABLE IF EXISTS ONLY public."ClinicianLanguages" DROP CONSTRAINT IF EXISTS "ClinicianLanguages_clinician_id_fkey";
ALTER TABLE IF EXISTS ONLY public."ClinicianAvailability" DROP CONSTRAINT IF EXISTS "ClinicianAvailability_room_id_fkey";
ALTER TABLE IF EXISTS ONLY public."ClinicianAvailability" DROP CONSTRAINT IF EXISTS "ClinicianAvailability_clinician_id_fkey";
ALTER TABLE IF EXISTS ONLY public."ClinicianAvailability" DROP CONSTRAINT IF EXISTS "ClinicianAvailability_clinic_id_fkey";
ALTER TABLE IF EXISTS ONLY public."ClientOrganizations" DROP CONSTRAINT IF EXISTS "ClientOrganizations_owner_user_id_fkey";
ALTER TABLE IF EXISTS ONLY public."AuditLogs" DROP CONSTRAINT IF EXISTS "AuditLogs_user_id_fkey";
ALTER TABLE IF EXISTS ONLY public."Attachments" DROP CONSTRAINT IF EXISTS "Attachments_uploaded_by_id_fkey";
ALTER TABLE IF EXISTS ONLY public."Attachments" DROP CONSTRAINT IF EXISTS "Attachments_encounter_id_fkey";
ALTER TABLE IF EXISTS ONLY public."Appointments" DROP CONSTRAINT IF EXISTS "Appointments_room_id_fkey";
ALTER TABLE IF EXISTS ONLY public."Appointments" DROP CONSTRAINT IF EXISTS "Appointments_product_variation_id_fkey";
ALTER TABLE IF EXISTS ONLY public."Appointments" DROP CONSTRAINT IF EXISTS "Appointments_product_id_fkey";
ALTER TABLE IF EXISTS ONLY public."Appointments" DROP CONSTRAINT IF EXISTS "Appointments_patient_id_fkey";
ALTER TABLE IF EXISTS ONLY public."Appointments" DROP CONSTRAINT IF EXISTS "Appointments_clinician_id_fkey";
ALTER TABLE IF EXISTS ONLY public."Appointments" DROP CONSTRAINT IF EXISTS "Appointments_clinic_id_fkey";
ALTER TABLE IF EXISTS ONLY public."Appointments" DROP CONSTRAINT IF EXISTS "Appointments_booked_by_user_id_fkey";
ALTER TABLE IF EXISTS ONLY public."AppointmentStatusLogs" DROP CONSTRAINT IF EXISTS "AppointmentStatusLogs_changed_by_user_id_fkey";
ALTER TABLE IF EXISTS ONLY public."AppointmentStatusLogs" DROP CONSTRAINT IF EXISTS "AppointmentStatusLogs_appointment_id_fkey";
ALTER TABLE IF EXISTS ONLY public."AppointmentResources" DROP CONSTRAINT IF EXISTS "AppointmentResources_resource_id_fkey";
ALTER TABLE IF EXISTS ONLY public."AppointmentResources" DROP CONSTRAINT IF EXISTS "AppointmentResources_appointment_id_fkey";
ALTER TABLE IF EXISTS ONLY public."AppointmentPayments" DROP CONSTRAINT IF EXISTS "AppointmentPayments_patient_id_fkey";
ALTER TABLE IF EXISTS ONLY public."AppointmentPayments" DROP CONSTRAINT IF EXISTS "AppointmentPayments_clinic_id_fkey";
ALTER TABLE IF EXISTS ONLY public."AppointmentPayments" DROP CONSTRAINT IF EXISTS "AppointmentPayments_client_org_id_fkey";
ALTER TABLE IF EXISTS ONLY public."AppointmentPayments" DROP CONSTRAINT IF EXISTS "AppointmentPayments_appointment_id_fkey";
DROP TRIGGER IF EXISTS encounter_notes_lock_guard ON public."EncounterNotes";
DROP TRIGGER IF EXISTS diagnoses_lock_guard ON public."Diagnoses";
DROP INDEX IF EXISTS public.room_types_name_key;
DROP INDEX IF EXISTS public.org_role_name;
DROP INDEX IF EXISTS public.clinics_one_primary_per_org;
DROP INDEX IF EXISTS public.clinician_types_name_key;
DROP INDEX IF EXISTS public."UserRoles_client_org_id_idx";
DROP INDEX IF EXISTS public."UserProfiles_role_id_idx";
DROP INDEX IF EXISTS public."UserProfiles_phone_key";
DROP INDEX IF EXISTS public."UserProfiles_patient_id_idx";
DROP INDEX IF EXISTS public."UserProfiles_email_key";
DROP INDEX IF EXISTS public."UserProfiles_clinician_id_idx";
DROP INDEX IF EXISTS public."UserProfiles_clinic_id_idx";
DROP INDEX IF EXISTS public."UserProfiles_client_org_id_is_deleted_idx";
DROP INDEX IF EXISTS public."TestResults_patient_id_date_ordered_idx";
DROP INDEX IF EXISTS public."TestResults_ordered_by_user_id_idx";
DROP INDEX IF EXISTS public."TestResults_is_deleted_date_ordered_idx";
DROP INDEX IF EXISTS public."SubscriptionPlans_name_key";
DROP INDEX IF EXISTS public."StripeConfigurations_client_org_id_key";
DROP INDEX IF EXISTS public."SpacerBlocks_room_id_idx";
DROP INDEX IF EXISTS public."SpacerBlocks_clinician_id_block_date_idx";
DROP INDEX IF EXISTS public."SpacerBlocks_clinic_id_is_deleted_idx";
DROP INDEX IF EXISTS public."Rooms_clinic_id_is_deleted_idx";
DROP INDEX IF EXISTS public."RoomBlocks_room_id_block_date_idx";
DROP INDEX IF EXISTS public."RoomBlocks_clinic_id_is_deleted_idx";
DROP INDEX IF EXISTS public."RolePermissions_role_id_idx";
DROP INDEX IF EXISTS public."RolePermissions_permission_id_idx";
DROP INDEX IF EXISTS public."Reviews_patient_id_idx";
DROP INDEX IF EXISTS public."Reviews_clinician_id_idx";
DROP INDEX IF EXISTS public."Reviews_clinic_id_is_deleted_idx";
DROP INDEX IF EXISTS public."Reviews_appointment_id_idx";
DROP INDEX IF EXISTS public."Resources_clinic_id_is_bookable_is_deleted_idx";
DROP INDEX IF EXISTS public."Resources_client_org_id_clinic_id_idx";
DROP INDEX IF EXISTS public."QueueEvents_queue_entry_id_created_at_idx";
DROP INDEX IF EXISTS public."QueueEntries_clinician_id_status_idx";
DROP INDEX IF EXISTS public."QueueEntries_clinic_id_status_idx";
DROP INDEX IF EXISTS public."QueueEntries_appointment_id_key";
DROP INDEX IF EXISTS public."Products_subcategory_id_idx";
DROP INDEX IF EXISTS public."Products_sku_key";
DROP INDEX IF EXISTS public."Products_clinic_id_idx";
DROP INDEX IF EXISTS public."Products_client_org_id_is_deleted_idx";
DROP INDEX IF EXISTS public."Products_category_id_idx";
DROP INDEX IF EXISTS public."ProductVariations_sku_key";
DROP INDEX IF EXISTS public."ProductVariations_product_id_idx";
DROP INDEX IF EXISTS public."ProductSubcategories_client_org_id_is_deleted_idx";
DROP INDEX IF EXISTS public."ProductSubcategories_category_id_idx";
DROP INDEX IF EXISTS public."ProductCategories_client_org_id_is_deleted_idx";
DROP INDEX IF EXISTS public."ProductCancellationRules_product_id_idx";
DROP INDEX IF EXISTS public."ProductCancellationRules_clinic_id_idx";
DROP INDEX IF EXISTS public."ProductCancellationRules_client_org_id_is_deleted_idx";
DROP INDEX IF EXISTS public."Prescriptions_patient_id_issued_at_idx";
DROP INDEX IF EXISTS public."Prescriptions_encounter_id_idx";
DROP INDEX IF EXISTS public."PrescriptionSets_clinician_id_idx";
DROP INDEX IF EXISTS public."PrescriptionSets_client_org_id_idx";
DROP INDEX IF EXISTS public."PrescriptionSetItems_prescription_set_id_idx";
DROP INDEX IF EXISTS public."PrescriptionItems_prescription_id_idx";
DROP INDEX IF EXISTS public."Permissions_name_key";
DROP INDEX IF EXISTS public."PaymentTransactions_client_org_id_created_at_idx";
DROP INDEX IF EXISTS public."Patients_phone_idx";
DROP INDEX IF EXISTS public."Patients_is_deleted_created_at_idx";
DROP INDEX IF EXISTS public."Patients_email_idx";
DROP INDEX IF EXISTS public."PatientRelations_patient_id_related_patient_id_key";
DROP INDEX IF EXISTS public."PatientRelations_patient_id_idx";
DROP INDEX IF EXISTS public."PatientMerges_surviving_patient_id_idx";
DROP INDEX IF EXISTS public."PatientMerges_merged_patient_id_idx";
DROP INDEX IF EXISTS public."OrganizationSubscriptions_plan_id_idx";
DROP INDEX IF EXISTS public."OrganizationSubscriptions_client_org_id_idx";
DROP INDEX IF EXISTS public."Notifications_user_id_is_deleted_created_at_idx";
DROP INDEX IF EXISTS public."NotificationProviderConfig_client_org_id_channel_key";
DROP INDEX IF EXISTS public."NotificationPreferences_user_id_event_type_key";
DROP INDEX IF EXISTS public."Messages_thread_id_sent_at_idx";
DROP INDEX IF EXISTS public."Messages_from_id_idx";
DROP INDEX IF EXISTS public."MessageThreads_client_org_id_last_activity_idx";
DROP INDEX IF EXISTS public."MessageThreads_assigned_to_user_id_idx";
DROP INDEX IF EXISTS public."MessageParticipants_user_id_idx";
DROP INDEX IF EXISTS public."MessageParticipants_thread_id_user_id_key";
DROP INDEX IF EXISTS public."LunchBreaks_clinician_id_is_deleted_idx";
DROP INDEX IF EXISTS public."LunchBreaks_clinic_id_idx";
DROP INDEX IF EXISTS public."Languages_name_key";
DROP INDEX IF EXISTS public."Languages_code_key";
DROP INDEX IF EXISTS public."InvoiceSequences_clinic_id_series_financial_year_key";
DROP INDEX IF EXISTS public."Encounters_patient_id_created_at_idx";
DROP INDEX IF EXISTS public."Encounters_clinician_id_idx";
DROP INDEX IF EXISTS public."Encounters_client_org_id_patient_id_idx";
DROP INDEX IF EXISTS public."Encounters_appointment_id_key";
DROP INDEX IF EXISTS public."EncounterTemplates_clinician_id_idx";
DROP INDEX IF EXISTS public."EncounterTemplates_client_org_id_idx";
DROP INDEX IF EXISTS public."EncounterNotes_encounter_id_section_key";
DROP INDEX IF EXISTS public."EncounterAddenda_encounter_id_created_at_idx";
DROP INDEX IF EXISTS public."Drugs_client_org_id_is_deleted_idx";
DROP INDEX IF EXISTS public."Diagnoses_encounter_id_idx";
DROP INDEX IF EXISTS public."Clinics_client_org_id_is_deleted_idx";
DROP INDEX IF EXISTS public."Clinicians_email_key";
DROP INDEX IF EXISTS public."Clinicians_clinic_id_is_deleted_is_active_idx";
DROP INDEX IF EXISTS public."ClinicianServices_product_id_idx";
DROP INDEX IF EXISTS public."ClinicianServices_clinician_id_product_id_key";
DROP INDEX IF EXISTS public."ClinicianLanguages_language_id_idx";
DROP INDEX IF EXISTS public."ClinicianLanguages_clinician_id_language_id_key";
DROP INDEX IF EXISTS public."ClinicianAvailability_room_id_idx";
DROP INDEX IF EXISTS public."ClinicianAvailability_clinician_id_is_deleted_idx";
DROP INDEX IF EXISTS public."ClinicianAvailability_clinic_id_is_deleted_idx";
DROP INDEX IF EXISTS public."ClientOrganizations_code_key";
DROP INDEX IF EXISTS public."AuditLogs_user_id_created_at_idx";
DROP INDEX IF EXISTS public."AuditLogs_resource_resource_id_idx";
DROP INDEX IF EXISTS public."AuditLogs_created_at_idx";
DROP INDEX IF EXISTS public."Attachments_encounter_id_idx";
DROP INDEX IF EXISTS public."Appointments_room_id_idx";
DROP INDEX IF EXISTS public."Appointments_product_id_idx";
DROP INDEX IF EXISTS public."Appointments_patient_id_appointment_date_idx";
DROP INDEX IF EXISTS public."Appointments_is_deleted_appointment_time_idx";
DROP INDEX IF EXISTS public."Appointments_clinician_id_appointment_time_idx";
DROP INDEX IF EXISTS public."Appointments_clinic_id_appointment_time_idx";
DROP INDEX IF EXISTS public."Appointments_booked_by_user_id_idx";
DROP INDEX IF EXISTS public."AppointmentStatusLogs_appointment_id_created_at_idx";
DROP INDEX IF EXISTS public."AppointmentResources_resource_id_idx";
DROP INDEX IF EXISTS public."AppointmentResources_appointment_id_resource_id_key";
DROP INDEX IF EXISTS public."AppointmentPayments_status_created_at_idx";
DROP INDEX IF EXISTS public."AppointmentPayments_razorpay_order_id_idx";
DROP INDEX IF EXISTS public."AppointmentPayments_patient_id_idx";
DROP INDEX IF EXISTS public."AppointmentPayments_clinic_id_idx";
DROP INDEX IF EXISTS public."AppointmentPayments_client_org_id_created_at_idx";
DROP INDEX IF EXISTS public."AppointmentPayments_appointment_id_idx";
ALTER TABLE IF EXISTS ONLY public.room_types DROP CONSTRAINT IF EXISTS room_types_pkey;
ALTER TABLE IF EXISTS ONLY public.clinician_types DROP CONSTRAINT IF EXISTS clinician_types_pkey;
ALTER TABLE IF EXISTS ONLY public."Appointments" DROP CONSTRAINT IF EXISTS appointments_no_overlapping_room_booking;
ALTER TABLE IF EXISTS ONLY public."Appointments" DROP CONSTRAINT IF EXISTS appointments_no_overlapping_booking;
ALTER TABLE IF EXISTS ONLY public."AppointmentResources" DROP CONSTRAINT IF EXISTS appointment_resources_no_overlap;
ALTER TABLE IF EXISTS ONLY public._prisma_migrations DROP CONSTRAINT IF EXISTS _prisma_migrations_pkey;
ALTER TABLE IF EXISTS ONLY public."Users" DROP CONSTRAINT IF EXISTS "Users_pkey";
ALTER TABLE IF EXISTS ONLY public."UserRoles" DROP CONSTRAINT IF EXISTS "UserRoles_pkey";
ALTER TABLE IF EXISTS ONLY public."UserProfiles" DROP CONSTRAINT IF EXISTS "UserProfiles_pkey";
ALTER TABLE IF EXISTS ONLY public."TestResults" DROP CONSTRAINT IF EXISTS "TestResults_pkey";
ALTER TABLE IF EXISTS ONLY public."SubscriptionPlans" DROP CONSTRAINT IF EXISTS "SubscriptionPlans_pkey";
ALTER TABLE IF EXISTS ONLY public."StripeConfigurations" DROP CONSTRAINT IF EXISTS "StripeConfigurations_pkey";
ALTER TABLE IF EXISTS ONLY public."SpacerBlocks" DROP CONSTRAINT IF EXISTS "SpacerBlocks_pkey";
ALTER TABLE IF EXISTS ONLY public."Rooms" DROP CONSTRAINT IF EXISTS "Rooms_pkey";
ALTER TABLE IF EXISTS ONLY public."RoomBlocks" DROP CONSTRAINT IF EXISTS "RoomBlocks_pkey";
ALTER TABLE IF EXISTS ONLY public."RolePermissions" DROP CONSTRAINT IF EXISTS "RolePermissions_pkey";
ALTER TABLE IF EXISTS ONLY public."Reviews" DROP CONSTRAINT IF EXISTS "Reviews_pkey";
ALTER TABLE IF EXISTS ONLY public."Resources" DROP CONSTRAINT IF EXISTS "Resources_pkey";
ALTER TABLE IF EXISTS ONLY public."QueueEvents" DROP CONSTRAINT IF EXISTS "QueueEvents_pkey";
ALTER TABLE IF EXISTS ONLY public."QueueEntries" DROP CONSTRAINT IF EXISTS "QueueEntries_pkey";
ALTER TABLE IF EXISTS ONLY public."Products" DROP CONSTRAINT IF EXISTS "Products_pkey";
ALTER TABLE IF EXISTS ONLY public."ProductVariations" DROP CONSTRAINT IF EXISTS "ProductVariations_pkey";
ALTER TABLE IF EXISTS ONLY public."ProductSubcategories" DROP CONSTRAINT IF EXISTS "ProductSubcategories_pkey";
ALTER TABLE IF EXISTS ONLY public."ProductCategories" DROP CONSTRAINT IF EXISTS "ProductCategories_pkey";
ALTER TABLE IF EXISTS ONLY public."ProductCancellationRules" DROP CONSTRAINT IF EXISTS "ProductCancellationRules_pkey";
ALTER TABLE IF EXISTS ONLY public."Prescriptions" DROP CONSTRAINT IF EXISTS "Prescriptions_pkey";
ALTER TABLE IF EXISTS ONLY public."PrescriptionSets" DROP CONSTRAINT IF EXISTS "PrescriptionSets_pkey";
ALTER TABLE IF EXISTS ONLY public."PrescriptionSetItems" DROP CONSTRAINT IF EXISTS "PrescriptionSetItems_pkey";
ALTER TABLE IF EXISTS ONLY public."PrescriptionItems" DROP CONSTRAINT IF EXISTS "PrescriptionItems_pkey";
ALTER TABLE IF EXISTS ONLY public."Permissions" DROP CONSTRAINT IF EXISTS "Permissions_pkey";
ALTER TABLE IF EXISTS ONLY public."PaymentTransactions" DROP CONSTRAINT IF EXISTS "PaymentTransactions_pkey";
ALTER TABLE IF EXISTS ONLY public."Patients" DROP CONSTRAINT IF EXISTS "Patients_pkey";
ALTER TABLE IF EXISTS ONLY public."PatientRelations" DROP CONSTRAINT IF EXISTS "PatientRelations_pkey";
ALTER TABLE IF EXISTS ONLY public."PatientMerges" DROP CONSTRAINT IF EXISTS "PatientMerges_pkey";
ALTER TABLE IF EXISTS ONLY public."OrganizationSubscriptions" DROP CONSTRAINT IF EXISTS "OrganizationSubscriptions_pkey";
ALTER TABLE IF EXISTS ONLY public."Notifications" DROP CONSTRAINT IF EXISTS "Notifications_pkey";
ALTER TABLE IF EXISTS ONLY public."NotificationProviderConfig" DROP CONSTRAINT IF EXISTS "NotificationProviderConfig_pkey";
ALTER TABLE IF EXISTS ONLY public."NotificationPreferences" DROP CONSTRAINT IF EXISTS "NotificationPreferences_pkey";
ALTER TABLE IF EXISTS ONLY public."Messages" DROP CONSTRAINT IF EXISTS "Messages_pkey";
ALTER TABLE IF EXISTS ONLY public."MessageThreads" DROP CONSTRAINT IF EXISTS "MessageThreads_pkey";
ALTER TABLE IF EXISTS ONLY public."MessageParticipants" DROP CONSTRAINT IF EXISTS "MessageParticipants_pkey";
ALTER TABLE IF EXISTS ONLY public."LunchBreaks" DROP CONSTRAINT IF EXISTS "LunchBreaks_pkey";
ALTER TABLE IF EXISTS ONLY public."Languages" DROP CONSTRAINT IF EXISTS "Languages_pkey";
ALTER TABLE IF EXISTS ONLY public."InvoiceSequences" DROP CONSTRAINT IF EXISTS "InvoiceSequences_pkey";
ALTER TABLE IF EXISTS ONLY public."Encounters" DROP CONSTRAINT IF EXISTS "Encounters_pkey";
ALTER TABLE IF EXISTS ONLY public."EncounterTemplates" DROP CONSTRAINT IF EXISTS "EncounterTemplates_pkey";
ALTER TABLE IF EXISTS ONLY public."EncounterNotes" DROP CONSTRAINT IF EXISTS "EncounterNotes_pkey";
ALTER TABLE IF EXISTS ONLY public."EncounterAddenda" DROP CONSTRAINT IF EXISTS "EncounterAddenda_pkey";
ALTER TABLE IF EXISTS ONLY public."EmailTemplates" DROP CONSTRAINT IF EXISTS "EmailTemplates_pkey";
ALTER TABLE IF EXISTS ONLY public."Drugs" DROP CONSTRAINT IF EXISTS "Drugs_pkey";
ALTER TABLE IF EXISTS ONLY public."Diagnoses" DROP CONSTRAINT IF EXISTS "Diagnoses_pkey";
ALTER TABLE IF EXISTS ONLY public."Clinics" DROP CONSTRAINT IF EXISTS "Clinics_pkey";
ALTER TABLE IF EXISTS ONLY public."Clinicians" DROP CONSTRAINT IF EXISTS "Clinicians_pkey";
ALTER TABLE IF EXISTS ONLY public."ClinicianServices" DROP CONSTRAINT IF EXISTS "ClinicianServices_pkey";
ALTER TABLE IF EXISTS ONLY public."ClinicianLanguages" DROP CONSTRAINT IF EXISTS "ClinicianLanguages_pkey";
ALTER TABLE IF EXISTS ONLY public."ClinicianAvailability" DROP CONSTRAINT IF EXISTS "ClinicianAvailability_pkey";
ALTER TABLE IF EXISTS ONLY public."ClientOrganizations" DROP CONSTRAINT IF EXISTS "ClientOrganizations_pkey";
ALTER TABLE IF EXISTS ONLY public."AuditLogs" DROP CONSTRAINT IF EXISTS "AuditLogs_pkey";
ALTER TABLE IF EXISTS ONLY public."Attachments" DROP CONSTRAINT IF EXISTS "Attachments_pkey";
ALTER TABLE IF EXISTS ONLY public."Appointments" DROP CONSTRAINT IF EXISTS "Appointments_pkey";
ALTER TABLE IF EXISTS ONLY public."AppointmentStatusLogs" DROP CONSTRAINT IF EXISTS "AppointmentStatusLogs_pkey";
ALTER TABLE IF EXISTS ONLY public."AppointmentResources" DROP CONSTRAINT IF EXISTS "AppointmentResources_pkey";
ALTER TABLE IF EXISTS ONLY public."AppointmentPayments" DROP CONSTRAINT IF EXISTS "AppointmentPayments_pkey";
DROP TABLE IF EXISTS public.room_types;
DROP TABLE IF EXISTS public.clinician_types;
DROP TABLE IF EXISTS public._prisma_migrations;
DROP TABLE IF EXISTS public."Users";
DROP TABLE IF EXISTS public."UserRoles";
DROP TABLE IF EXISTS public."UserProfiles";
DROP TABLE IF EXISTS public."TestResults";
DROP TABLE IF EXISTS public."SubscriptionPlans";
DROP TABLE IF EXISTS public."StripeConfigurations";
DROP TABLE IF EXISTS public."SpacerBlocks";
DROP TABLE IF EXISTS public."Rooms";
DROP TABLE IF EXISTS public."RoomBlocks";
DROP TABLE IF EXISTS public."RolePermissions";
DROP TABLE IF EXISTS public."Reviews";
DROP TABLE IF EXISTS public."Resources";
DROP TABLE IF EXISTS public."QueueEvents";
DROP TABLE IF EXISTS public."QueueEntries";
DROP TABLE IF EXISTS public."Products";
DROP TABLE IF EXISTS public."ProductVariations";
DROP TABLE IF EXISTS public."ProductSubcategories";
DROP TABLE IF EXISTS public."ProductCategories";
DROP TABLE IF EXISTS public."ProductCancellationRules";
DROP TABLE IF EXISTS public."Prescriptions";
DROP TABLE IF EXISTS public."PrescriptionSets";
DROP TABLE IF EXISTS public."PrescriptionSetItems";
DROP TABLE IF EXISTS public."PrescriptionItems";
DROP TABLE IF EXISTS public."Permissions";
DROP TABLE IF EXISTS public."PaymentTransactions";
DROP TABLE IF EXISTS public."Patients";
DROP TABLE IF EXISTS public."PatientRelations";
DROP TABLE IF EXISTS public."PatientMerges";
DROP TABLE IF EXISTS public."OrganizationSubscriptions";
DROP TABLE IF EXISTS public."Notifications";
DROP TABLE IF EXISTS public."NotificationProviderConfig";
DROP TABLE IF EXISTS public."NotificationPreferences";
DROP TABLE IF EXISTS public."Messages";
DROP TABLE IF EXISTS public."MessageThreads";
DROP TABLE IF EXISTS public."MessageParticipants";
DROP TABLE IF EXISTS public."LunchBreaks";
DROP TABLE IF EXISTS public."Languages";
DROP TABLE IF EXISTS public."InvoiceSequences";
DROP TABLE IF EXISTS public."Encounters";
DROP TABLE IF EXISTS public."EncounterTemplates";
DROP TABLE IF EXISTS public."EncounterNotes";
DROP TABLE IF EXISTS public."EncounterAddenda";
DROP TABLE IF EXISTS public."EmailTemplates";
DROP TABLE IF EXISTS public."Drugs";
DROP TABLE IF EXISTS public."Diagnoses";
DROP TABLE IF EXISTS public."Clinics";
DROP TABLE IF EXISTS public."Clinicians";
DROP TABLE IF EXISTS public."ClinicianServices";
DROP TABLE IF EXISTS public."ClinicianLanguages";
DROP TABLE IF EXISTS public."ClinicianAvailability";
DROP TABLE IF EXISTS public."ClientOrganizations";
DROP TABLE IF EXISTS public."AuditLogs";
DROP TABLE IF EXISTS public."Attachments";
DROP TABLE IF EXISTS public."Appointments";
DROP TABLE IF EXISTS public."AppointmentStatusLogs";
DROP TABLE IF EXISTS public."AppointmentResources";
DROP TABLE IF EXISTS public."AppointmentPayments";
DROP FUNCTION IF EXISTS public.reject_write_if_encounter_locked();
DROP TYPE IF EXISTS public."TestResultStatus";
DROP TYPE IF EXISTS public."TemplateType";
DROP TYPE IF EXISTS public."SubscriptionStatus";
DROP TYPE IF EXISTS public."RuleType";
DROP TYPE IF EXISTS public."RecurrenceType";
DROP TYPE IF EXISTS public."ProductType";
DROP TYPE IF EXISTS public."OnboardingStatus";
DROP TYPE IF EXISTS public."NotificationType";
DROP TYPE IF EXISTS public."NotificationPriority";
DROP TYPE IF EXISTS public."NotificationEventType";
DROP TYPE IF EXISTS public."FeeType";
DROP TYPE IF EXISTS public."BillingCycle";
DROP EXTENSION IF EXISTS btree_gist;
--
-- Name: btree_gist; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;


--
-- Name: EXTENSION btree_gist; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION btree_gist IS 'support for indexing common datatypes in GiST';


--
-- Name: BillingCycle; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BillingCycle" AS ENUM (
    'monthly',
    'yearly'
);


--
-- Name: FeeType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."FeeType" AS ENUM (
    'fixed',
    'percentage'
);


--
-- Name: NotificationEventType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."NotificationEventType" AS ENUM (
    'new_appointment',
    'appointment_reminder',
    'appointment_cancelled',
    'new_message',
    'new_review',
    'payment_received',
    'system_announcement'
);


--
-- Name: NotificationPriority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."NotificationPriority" AS ENUM (
    'low',
    'medium',
    'high'
);


--
-- Name: NotificationType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."NotificationType" AS ENUM (
    'appointment',
    'system',
    'payment',
    'alert'
);


--
-- Name: OnboardingStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OnboardingStatus" AS ENUM (
    'pending',
    'in_progress',
    'completed'
);


--
-- Name: ProductType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ProductType" AS ENUM (
    'simple',
    'variable'
);


--
-- Name: RecurrenceType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."RecurrenceType" AS ENUM (
    'single',
    'daily',
    'weekly',
    'monthly',
    'custom'
);


--
-- Name: RuleType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."RuleType" AS ENUM (
    'cancellation',
    'reschedule'
);


--
-- Name: SubscriptionStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SubscriptionStatus" AS ENUM (
    'active',
    'cancelled',
    'expired',
    'trial'
);


--
-- Name: TemplateType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TemplateType" AS ENUM (
    'appointment_confirmation',
    'appointment_reminder',
    'appointment_cancellation',
    'appointment_rescheduled',
    'password_reset',
    'welcome',
    'invoice',
    'cancellation_fee'
);


--
-- Name: TestResultStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TestResultStatus" AS ENUM (
    'pending',
    'processing',
    'completed'
);


--
-- Name: reject_write_if_encounter_locked(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reject_write_if_encounter_locked() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  is_locked BOOLEAN;
  target_encounter_id TEXT;
BEGIN
  target_encounter_id := COALESCE(OLD.encounter_id, NEW.encounter_id);
  SELECT "locked" INTO is_locked FROM "Encounters" WHERE "id" = target_encounter_id;
  IF is_locked THEN
    RAISE EXCEPTION 'Cannot modify % on a signed (locked) encounter %', TG_TABLE_NAME, target_encounter_id;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: AppointmentPayments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AppointmentPayments" (
    id text NOT NULL,
    appointment_id text NOT NULL,
    patient_id text NOT NULL,
    clinic_id text NOT NULL,
    client_org_id text,
    amount integer NOT NULL,
    currency text DEFAULT 'INR'::text NOT NULL,
    status text NOT NULL,
    razorpay_order_id text,
    razorpay_payment_id text,
    razorpay_signature text,
    gstin text,
    hsn_sac_code text,
    gst_rate double precision,
    cgst_amount integer,
    sgst_amount integer,
    igst_amount integer,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    place_of_supply text,
    invoice_number text
);


--
-- Name: AppointmentResources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AppointmentResources" (
    id text NOT NULL,
    appointment_id text NOT NULL,
    resource_id text NOT NULL,
    start_at timestamp(3) without time zone NOT NULL,
    end_at timestamp(3) without time zone NOT NULL
);


--
-- Name: AppointmentStatusLogs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AppointmentStatusLogs" (
    id text NOT NULL,
    appointment_id text NOT NULL,
    status text NOT NULL,
    reason text,
    changed_by_user_id text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Appointments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Appointments" (
    id text NOT NULL,
    clinic_id text NOT NULL,
    room_id text NOT NULL,
    clinician_id text NOT NULL,
    patient_id text NOT NULL,
    appointment_date timestamp(3) without time zone NOT NULL,
    appointment_time timestamp(3) without time zone NOT NULL,
    duration_minutes integer DEFAULT 30 NOT NULL,
    status text DEFAULT 'scheduled'::text NOT NULL,
    reason text NOT NULL,
    notes text DEFAULT ''::text NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    product_id text,
    product_variation_id text,
    cancellation_reason text,
    reminder_sent_at timestamp(3) without time zone,
    booked_by_user_id text,
    type text DEFAULT 'in_person'::text NOT NULL,
    booking_mode text DEFAULT 'slot'::text NOT NULL,
    token_no integer
);


--
-- Name: Attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Attachments" (
    id text NOT NULL,
    encounter_id text NOT NULL,
    file_ref text NOT NULL,
    mime_type text NOT NULL,
    original_filename text NOT NULL,
    uploaded_by_id text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: AuditLogs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AuditLogs" (
    id text NOT NULL,
    user_id text,
    action text NOT NULL,
    resource text NOT NULL,
    resource_id text,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    ip_address text,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    outcome text,
    user_agent text
);


--
-- Name: ClientOrganizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ClientOrganizations" (
    id text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    contact_email text NOT NULL,
    contact_phone text,
    address text,
    is_active boolean DEFAULT true NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    owner_user_id text,
    onboarding_status public."OnboardingStatus" DEFAULT 'pending'::public."OnboardingStatus" NOT NULL,
    onboarding_step text,
    trial_ends_at timestamp(3) without time zone,
    onboarded_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    address_structured jsonb,
    email_from_name text DEFAULT 'HealthSync'::text NOT NULL,
    email_from_address text,
    email_reply_to text,
    email_include_branding boolean DEFAULT true NOT NULL,
    no_show_fee_paise integer DEFAULT 8500 NOT NULL,
    slot_buffer_minutes integer DEFAULT 10 NOT NULL,
    max_reschedules_per_month integer DEFAULT 3 NOT NULL,
    data_retention_years integer DEFAULT 7 NOT NULL,
    mfa_required boolean DEFAULT false NOT NULL,
    session_timeout_minutes integer,
    audit_log_enabled boolean DEFAULT false NOT NULL,
    patient_data_export_enabled boolean DEFAULT false NOT NULL,
    ip_whitelist_enabled boolean DEFAULT false NOT NULL,
    ip_whitelist text,
    logo_url text,
    primary_color text DEFAULT '#006D77'::text NOT NULL,
    secondary_color text DEFAULT '#007680'::text NOT NULL
);


--
-- Name: ClinicianAvailability; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ClinicianAvailability" (
    id text NOT NULL,
    clinician_id text NOT NULL,
    clinic_id text NOT NULL,
    day_of_week integer,
    start_time text NOT NULL,
    end_time text NOT NULL,
    recurrence_type text DEFAULT 'weekly'::text NOT NULL,
    custom_dates text,
    exclude_weekends boolean DEFAULT false NOT NULL,
    exclude_saturday boolean DEFAULT false NOT NULL,
    exclude_sunday boolean DEFAULT false NOT NULL,
    excluded_days text,
    valid_from timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    valid_until timestamp(3) without time zone,
    is_active boolean DEFAULT true NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    room_id text,
    mode text DEFAULT 'slot'::text NOT NULL,
    capacity integer,
    overbook_allowance integer DEFAULT 0 NOT NULL,
    walkin_ratio integer
);


--
-- Name: ClinicianLanguages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ClinicianLanguages" (
    id text NOT NULL,
    clinician_id text NOT NULL,
    language_id text NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ClinicianServices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ClinicianServices" (
    id text NOT NULL,
    clinician_id text NOT NULL,
    product_id text NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Clinicians; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Clinicians" (
    id text NOT NULL,
    clinic_id text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    clinician_type text NOT NULL,
    gender text,
    email text NOT NULL,
    phone text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    bio text,
    avatar_url text,
    consultation_fee integer,
    registration_number text,
    qualifications text
);


--
-- Name: Clinics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Clinics" (
    id text NOT NULL,
    name text NOT NULL,
    address text NOT NULL,
    phone text NOT NULL,
    email text NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    client_org_id text,
    city text,
    postcode text,
    timezone text DEFAULT 'Asia/Kolkata'::text
);


--
-- Name: Diagnoses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Diagnoses" (
    id text NOT NULL,
    encounter_id text NOT NULL,
    type text DEFAULT 'diagnosis'::text NOT NULL,
    icd10_code text,
    text text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: Drugs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Drugs" (
    id text NOT NULL,
    client_org_id text,
    name text NOT NULL,
    composition text,
    strength text,
    form text,
    schedule_class text,
    hsn text,
    gst_rate double precision,
    manufacturer text,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: EmailTemplates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EmailTemplates" (
    id text NOT NULL,
    name text NOT NULL,
    template_type public."TemplateType" NOT NULL,
    subject text NOT NULL,
    body text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    variables text[] DEFAULT '{}'::text[] NOT NULL
);


--
-- Name: EncounterAddenda; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EncounterAddenda" (
    id text NOT NULL,
    encounter_id text NOT NULL,
    author_id text NOT NULL,
    content text NOT NULL,
    reason text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: EncounterNotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EncounterNotes" (
    id text NOT NULL,
    encounter_id text NOT NULL,
    section text NOT NULL,
    content text DEFAULT ''::text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: EncounterTemplates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EncounterTemplates" (
    id text NOT NULL,
    client_org_id text,
    clinician_id text,
    specialty text,
    name text NOT NULL,
    sections_json jsonb NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Encounters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Encounters" (
    id text NOT NULL,
    client_org_id text NOT NULL,
    appointment_id text NOT NULL,
    patient_id text NOT NULL,
    clinician_id text NOT NULL,
    status text DEFAULT 'in_progress'::text NOT NULL,
    locked boolean DEFAULT false NOT NULL,
    signed_at timestamp(3) without time zone,
    signed_by_id text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: InvoiceSequences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InvoiceSequences" (
    id text NOT NULL,
    clinic_id text NOT NULL,
    series text DEFAULT 'APPT'::text NOT NULL,
    financial_year text NOT NULL,
    last_number integer DEFAULT 0 NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: Languages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Languages" (
    id text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_default boolean DEFAULT false NOT NULL
);


--
-- Name: LunchBreaks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LunchBreaks" (
    id text NOT NULL,
    clinician_id text NOT NULL,
    clinic_id text NOT NULL,
    day_of_week integer,
    start_time timestamp(3) without time zone NOT NULL,
    end_time timestamp(3) without time zone NOT NULL,
    is_recurring boolean DEFAULT true NOT NULL,
    specific_date timestamp(3) without time zone,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    recurrence_type public."RecurrenceType" DEFAULT 'single'::public."RecurrenceType" NOT NULL,
    recurrence_days jsonb,
    end_date timestamp(3) without time zone
);


--
-- Name: MessageParticipants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MessageParticipants" (
    id text NOT NULL,
    thread_id text NOT NULL,
    user_id text NOT NULL,
    unread_count integer DEFAULT 0 NOT NULL
);


--
-- Name: MessageThreads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MessageThreads" (
    id text NOT NULL,
    client_org_id text NOT NULL,
    last_message text,
    last_activity timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    assigned_to_user_id text,
    sla_due_at timestamp(3) without time zone
);


--
-- Name: Messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Messages" (
    id text NOT NULL,
    thread_id text NOT NULL,
    from_id text NOT NULL,
    body text NOT NULL,
    read_at timestamp(3) without time zone,
    sent_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: NotificationPreferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."NotificationPreferences" (
    id text NOT NULL,
    user_id text NOT NULL,
    event_type public."NotificationEventType" NOT NULL,
    email_enabled boolean DEFAULT true NOT NULL,
    sms_enabled boolean DEFAULT false NOT NULL,
    app_enabled boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: NotificationProviderConfig; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."NotificationProviderConfig" (
    id text NOT NULL,
    client_org_id text NOT NULL,
    channel text NOT NULL,
    provider text NOT NULL,
    credentials_encrypted text NOT NULL,
    sender_id text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Notifications" (
    id text NOT NULL,
    user_id text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    type public."NotificationType" NOT NULL,
    priority public."NotificationPriority" DEFAULT 'medium'::public."NotificationPriority" NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    action_url text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: OrganizationSubscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OrganizationSubscriptions" (
    id text NOT NULL,
    client_org_id text NOT NULL,
    plan_id text NOT NULL,
    status public."SubscriptionStatus" NOT NULL,
    billing_cycle public."BillingCycle" NOT NULL,
    current_period_start timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    current_period_end timestamp(3) without time zone NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    stripe_customer_id text,
    stripe_subscription_id text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: PatientMerges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PatientMerges" (
    id text NOT NULL,
    surviving_patient_id text NOT NULL,
    merged_patient_id text NOT NULL,
    merged_by_user_id text,
    reason text,
    merged_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: PatientRelations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PatientRelations" (
    id text NOT NULL,
    patient_id text NOT NULL,
    related_patient_id text NOT NULL,
    relation text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Patients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Patients" (
    id text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    date_of_birth timestamp(3) without time zone NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    phone_country_code text,
    address text NOT NULL,
    medical_notes text DEFAULT ''::text NOT NULL,
    title text,
    status text,
    birth_surname text,
    birth_name text,
    birth_names text,
    social_security_number text,
    gender text,
    sex text,
    google_client_id text,
    payment_reference text,
    occupation text,
    place_of_birth jsonb,
    phones jsonb,
    address_structured jsonb,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: PaymentTransactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PaymentTransactions" (
    id text NOT NULL,
    client_org_id text NOT NULL,
    subscription_id text,
    amount integer NOT NULL,
    currency text DEFAULT 'INR'::text NOT NULL,
    status text NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    stripe_payment_intent_id text,
    stripe_invoice_id text,
    razorpay_order_id text,
    razorpay_payment_id text,
    razorpay_signature text,
    gstin text,
    hsn_sac_code text,
    gst_rate double precision,
    cgst_amount integer,
    sgst_amount integer,
    igst_amount integer,
    transaction_date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Permissions" (
    id text NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    resource text NOT NULL,
    action text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: PrescriptionItems; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PrescriptionItems" (
    id text NOT NULL,
    prescription_id text NOT NULL,
    drug_id text NOT NULL,
    dose text NOT NULL,
    frequency text NOT NULL,
    route text,
    duration_days integer,
    qty integer,
    instructions text,
    substitutable boolean DEFAULT true NOT NULL
);


--
-- Name: PrescriptionSetItems; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PrescriptionSetItems" (
    id text NOT NULL,
    prescription_set_id text NOT NULL,
    drug_id text NOT NULL,
    dose text NOT NULL,
    frequency text NOT NULL,
    route text,
    duration_days integer,
    instructions text
);


--
-- Name: PrescriptionSets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PrescriptionSets" (
    id text NOT NULL,
    client_org_id text,
    clinician_id text,
    specialty text,
    name text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Prescriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Prescriptions" (
    id text NOT NULL,
    encounter_id text NOT NULL,
    patient_id text NOT NULL,
    clinician_id text NOT NULL,
    mode text DEFAULT 'in_person'::text NOT NULL,
    issued_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    language text DEFAULT 'en'::text NOT NULL,
    repeated_from_id text,
    reprint_count integer DEFAULT 0 NOT NULL
);


--
-- Name: ProductCancellationRules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProductCancellationRules" (
    id text NOT NULL,
    product_id text,
    rule_type public."RuleType" DEFAULT 'cancellation'::public."RuleType" NOT NULL,
    hours_before_appointment integer DEFAULT 24 NOT NULL,
    fee_type public."FeeType" NOT NULL,
    fee_amount integer NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    name text NOT NULL,
    description text,
    clinic_id text,
    priority integer DEFAULT 1 NOT NULL,
    client_org_id text,
    CONSTRAINT "ProductCancellationRules_scope_check" CHECK ((NOT ((product_id IS NOT NULL) AND (clinic_id IS NOT NULL))))
);


--
-- Name: ProductCategories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProductCategories" (
    id text NOT NULL,
    clinic_id text,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    client_org_id text
);


--
-- Name: ProductSubcategories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProductSubcategories" (
    id text NOT NULL,
    clinic_id text,
    category_id text NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    client_org_id text
);


--
-- Name: ProductVariations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProductVariations" (
    id text NOT NULL,
    product_id text NOT NULL,
    variation_name text NOT NULL,
    sku text NOT NULL,
    price integer NOT NULL,
    duration_minutes integer,
    stock_quantity integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Products" (
    id text NOT NULL,
    clinic_id text,
    category_id text,
    subcategory_id text,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    product_type public."ProductType" NOT NULL,
    sku text NOT NULL,
    price integer,
    duration_minutes integer,
    order_by integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    stock_quantity integer DEFAULT 0,
    client_org_id text,
    hsn text,
    is_tax_exempt boolean DEFAULT false NOT NULL
);


--
-- Name: QueueEntries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."QueueEntries" (
    id text NOT NULL,
    appointment_id text NOT NULL,
    clinic_id text NOT NULL,
    clinician_id text NOT NULL,
    token_no integer,
    status text DEFAULT 'waiting'::text NOT NULL,
    checked_in_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    called_at timestamp(3) without time zone,
    skip_return_after integer,
    served_since_skip integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: QueueEvents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."QueueEvents" (
    id text NOT NULL,
    queue_entry_id text NOT NULL,
    action text NOT NULL,
    reason text,
    changed_by_user_id text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Resources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Resources" (
    id text NOT NULL,
    client_org_id text NOT NULL,
    clinic_id text NOT NULL,
    name text NOT NULL,
    type text DEFAULT 'equipment'::text NOT NULL,
    is_bookable boolean DEFAULT true NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Reviews" (
    id text NOT NULL,
    appointment_id text NOT NULL,
    patient_id text NOT NULL,
    clinician_id text,
    clinic_id text,
    stars integer NOT NULL,
    comment text NOT NULL,
    response text,
    responded_at timestamp(3) without time zone,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: RolePermissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RolePermissions" (
    id text NOT NULL,
    role_id text NOT NULL,
    permission_id text NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: RoomBlocks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RoomBlocks" (
    id text NOT NULL,
    room_id text NOT NULL,
    clinic_id text NOT NULL,
    block_date timestamp(3) without time zone NOT NULL,
    start_time timestamp(3) without time zone NOT NULL,
    end_time timestamp(3) without time zone NOT NULL,
    reason text DEFAULT ''::text NOT NULL,
    is_recurring boolean DEFAULT false NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    recurrence_type public."RecurrenceType" DEFAULT 'single'::public."RecurrenceType" NOT NULL,
    recurrence_days jsonb,
    end_date timestamp(3) without time zone
);


--
-- Name: Rooms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Rooms" (
    id text NOT NULL,
    clinic_id text NOT NULL,
    room_number text NOT NULL,
    room_type text DEFAULT 'consultation'::text NOT NULL,
    clinician_type text,
    capacity integer,
    is_active boolean DEFAULT true NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: SpacerBlocks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SpacerBlocks" (
    id text NOT NULL,
    clinician_id text NOT NULL,
    clinic_id text NOT NULL,
    room_id text,
    block_date timestamp(3) without time zone,
    start_time timestamp(3) without time zone NOT NULL,
    end_time timestamp(3) without time zone NOT NULL,
    reason text DEFAULT ''::text NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    recurrence_type public."RecurrenceType" DEFAULT 'single'::public."RecurrenceType" NOT NULL,
    recurrence_days jsonb,
    end_date timestamp(3) without time zone
);


--
-- Name: StripeConfigurations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StripeConfigurations" (
    id text NOT NULL,
    client_org_id text NOT NULL,
    stripe_account_id text,
    stripe_publishable_key text,
    stripe_webhook_secret text,
    is_active boolean DEFAULT true NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: SubscriptionPlans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SubscriptionPlans" (
    id text NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    price_monthly integer DEFAULT 0 NOT NULL,
    price_yearly integer DEFAULT 0 NOT NULL,
    max_clinics integer DEFAULT 1 NOT NULL,
    max_users integer DEFAULT 5 NOT NULL,
    features jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TestResults; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TestResults" (
    id text NOT NULL,
    patient_name text NOT NULL,
    patient_id text,
    test_name text NOT NULL,
    test_type text NOT NULL,
    ordered_by_name text NOT NULL,
    ordered_by_user_id text,
    date_ordered timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    date_completed timestamp(3) without time zone,
    status public."TestResultStatus" DEFAULT 'pending'::public."TestResultStatus" NOT NULL,
    "values" jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: UserProfiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UserProfiles" (
    id text NOT NULL,
    role_id text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    phone text,
    phone_country_code text,
    address_line1 text,
    address_line2 text,
    city text,
    postal_code text,
    country text,
    user_image text,
    clinic_id text,
    clinician_id text,
    patient_id text,
    is_active boolean DEFAULT true NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    client_org_id text,
    password_reset_token text,
    password_reset_expires timestamp(3) without time zone,
    email_verified boolean DEFAULT false NOT NULL,
    email_verification_token text,
    email_verification_expires timestamp(3) without time zone,
    last_login_at timestamp(3) without time zone,
    avatar_url text,
    department text,
    job_title text,
    notes text,
    staff_status text DEFAULT 'active'::text NOT NULL,
    date_of_birth timestamp(3) without time zone,
    gender text,
    bio text,
    address_structured jsonb,
    totp_secret_encrypted text,
    totp_enabled boolean DEFAULT false NOT NULL,
    totp_backup_codes jsonb,
    staff_since timestamp(3) without time zone
);


--
-- Name: UserRoles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UserRoles" (
    id text NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    client_org_id text,
    is_system boolean DEFAULT false NOT NULL,
    code text
);


--
-- Name: Users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Users" (
    id text NOT NULL
);


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: clinician_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clinician_types (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: room_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.room_types (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Data for Name: AppointmentPayments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AppointmentPayments" (id, appointment_id, patient_id, clinic_id, client_org_id, amount, currency, status, razorpay_order_id, razorpay_payment_id, razorpay_signature, gstin, hsn_sac_code, gst_rate, cgst_amount, sgst_amount, igst_amount, metadata, created_at, updated_at, place_of_supply, invoice_number) FROM stdin;
dce46a37-0647-497f-938a-55fe5f4c2c31	43b1ae5e-e4eb-46cf-b9ff-a2ad836c64a9	69168728-b9e1-453c-85bd-3044c71bbac6	7307c9d9-8a74-4305-8933-7b0a73c1486d	3efd3018-9760-4d10-92c0-86981799240b	49900	INR	succeeded	order_TS47fCa1TI7wNZ	pay_fake_test_12345	20d9c8403574f5e53023be1b80e6f8a662b4f7cf55b02e82f800859893f249e9	\N	\N	\N	\N	\N	\N	{}	2026-08-20 14:59:14.647	2026-08-20 14:59:14.647	\N	\N
a5bdfcf2-5d2d-4fd5-bfd8-ca49c3a8fb3c	9798af17-ee7e-45cc-b4e2-254825fdba4d	f8a33736-0ad4-4df8-a854-344cd567010c	7307c9d9-8a74-4305-8933-7b0a73c1486d	3efd3018-9760-4d10-92c0-86981799240b	49900	INR	failed	order_TS47fYJ7i42vT9	\N	\N	\N	\N	\N	\N	\N	\N	{}	2026-08-20 14:59:14.962	2026-08-20 14:59:14.962	\N	\N
42f3cee0-fcd4-4a40-bea6-14cace1f347f	a05e3bc5-c5f0-49c1-a00a-542feedeb9ce	2abfec66-7a54-45d8-b25d-8a2e121d5f82	7307c9d9-8a74-4305-8933-7b0a73c1486d	3efd3018-9760-4d10-92c0-86981799240b	49900	INR	failed	order_TS47es2FsjmMvU	\N	\N	\N	\N	\N	\N	\N	\N	{}	2026-08-20 14:59:14.428	2026-08-20 14:59:14.428	\N	\N
ab5fd15f-253c-45d8-ad55-38eb3df6c59c	2b0b13e7-56e1-4089-bbd3-964cf153ac32	f8a33736-0ad4-4df8-a854-344cd567010c	7307c9d9-8a74-4305-8933-7b0a73c1486d	3efd3018-9760-4d10-92c0-86981799240b	49900	INR	failed	order_TS47fo5to8hOnd	\N	\N	\N	\N	\N	\N	\N	\N	{}	2026-08-20 14:59:15.218	2026-08-20 14:59:15.218	\N	\N
\.


--
-- Data for Name: AppointmentResources; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AppointmentResources" (id, appointment_id, resource_id, start_at, end_at) FROM stdin;
\.


--
-- Data for Name: AppointmentStatusLogs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AppointmentStatusLogs" (id, appointment_id, status, reason, changed_by_user_id, created_at) FROM stdin;
725d2d6b-5cfc-49d7-ab15-187f4248a6f3	2b0b13e7-56e1-4089-bbd3-964cf153ac32	scheduled	\N	d764ff7a-de6a-484e-a374-c2d8575d15c3	2026-08-17 08:03:37.761
9355f143-6b15-4eb5-aba9-86d22aa46d55	2b0b13e7-56e1-4089-bbd3-964cf153ac32	confirmed	\N	d764ff7a-de6a-484e-a374-c2d8575d15c3	2026-08-17 08:03:48.312
177e4ceb-7261-43d0-9755-f733f627d6ef	2b0b13e7-56e1-4089-bbd3-964cf153ac32	cancelled	patient requested	d764ff7a-de6a-484e-a374-c2d8575d15c3	2026-08-17 08:03:48.621
982c4a77-118d-44e5-a56c-5ba76bf5ab3d	9798af17-ee7e-45cc-b4e2-254825fdba4d	scheduled	\N	d764ff7a-de6a-484e-a374-c2d8575d15c3	2026-08-17 08:04:03.475
acc78fa3-f8cf-4b4a-b52b-3d0bb10c7dd4	2b0b13e7-56e1-4089-bbd3-964cf153ac32	completed	\N	d764ff7a-de6a-484e-a374-c2d8575d15c3	2026-08-17 08:11:33.792
7b5cdd8b-db89-4a42-bef8-1c27264a40d8	a05e3bc5-c5f0-49c1-a00a-542feedeb9ce	scheduled	\N	7d3f3ade-b82a-4383-859e-31d8a42c4a01	2026-08-18 18:43:10.655
0cf0f0db-7a8b-4b63-af4b-d1c06c51a54a	a05e3bc5-c5f0-49c1-a00a-542feedeb9ce	cancelled	cleanup after live security regression test	7d3f3ade-b82a-4383-859e-31d8a42c4a01	2026-08-18 18:43:19.1
\.


--
-- Data for Name: Appointments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Appointments" (id, clinic_id, room_id, clinician_id, patient_id, appointment_date, appointment_time, duration_minutes, status, reason, notes, is_deleted, created_at, updated_at, product_id, product_variation_id, cancellation_reason, reminder_sent_at, booked_by_user_id, type, booking_mode, token_no) FROM stdin;
9798af17-ee7e-45cc-b4e2-254825fdba4d	7307c9d9-8a74-4305-8933-7b0a73c1486d	183883aa-5398-4092-b434-84a731cc431a	8e9ed6bf-daf0-49cb-84f3-82c8c4ba80e7	f8a33736-0ad4-4df8-a854-344cd567010c	2026-08-21 00:00:00	2026-08-21 10:00:00	20	scheduled			f	2026-08-17 08:04:03.42	2026-08-17 08:04:03.42	caa89f8e-26bd-4325-9f16-df5dd7eb994e	\N	\N	\N	d764ff7a-de6a-484e-a374-c2d8575d15c3	in_person	slot	\N
2b0b13e7-56e1-4089-bbd3-964cf153ac32	7307c9d9-8a74-4305-8933-7b0a73c1486d	183883aa-5398-4092-b434-84a731cc431a	8e9ed6bf-daf0-49cb-84f3-82c8c4ba80e7	f8a33736-0ad4-4df8-a854-344cd567010c	2026-08-20 00:00:00	2026-08-20 10:00:00	20	completed	first visit	live subscription test 3	f	2026-08-17 08:03:37.607	2026-08-17 08:12:56.015	caa89f8e-26bd-4325-9f16-df5dd7eb994e	\N	patient requested	\N	d764ff7a-de6a-484e-a374-c2d8575d15c3	in_person	slot	\N
a05e3bc5-c5f0-49c1-a00a-542feedeb9ce	7307c9d9-8a74-4305-8933-7b0a73c1486d	183883aa-5398-4092-b434-84a731cc431a	8e9ed6bf-daf0-49cb-84f3-82c8c4ba80e7	2abfec66-7a54-45d8-b25d-8a2e121d5f82	2026-09-15 00:00:00	2026-09-15 09:00:00	20	cancelled	live regression check	live regression check	f	2026-08-18 18:43:10.588	2026-08-18 18:43:19.071	caa89f8e-26bd-4325-9f16-df5dd7eb994e	\N	cleanup after live security regression test	\N	7d3f3ade-b82a-4383-859e-31d8a42c4a01	in_person	slot	\N
43b1ae5e-e4eb-46cf-b9ff-a2ad836c64a9	7307c9d9-8a74-4305-8933-7b0a73c1486d	183883aa-5398-4092-b434-84a731cc431a	8e9ed6bf-daf0-49cb-84f3-82c8c4ba80e7	69168728-b9e1-453c-85bd-3044c71bbac6	2026-08-25 00:00:00	2026-08-25 11:00:00	20	scheduled			f	2026-08-17 19:51:08.095	2026-08-22 21:45:42.565	caa89f8e-26bd-4325-9f16-df5dd7eb994e	\N	\N	\N	\N	video	slot	\N
\.


--
-- Data for Name: Attachments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Attachments" (id, encounter_id, file_ref, mime_type, original_filename, uploaded_by_id, created_at) FROM stdin;
787120f1-b50c-44d9-859a-80128b248713	625bf109-8efb-4553-8461-b3af6fb7f373	/uploads/attachments/3939263b-2272-437b-9010-bc1f72af8d05-73543b81-3da8-4c49-b885-731f612818ab.png	image/png	fixtures-tmp-test.png	3939263b-2272-437b-9010-bc1f72af8d05	2026-08-23 21:53:42.702
\.


--
-- Data for Name: AuditLogs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AuditLogs" (id, user_id, action, resource, resource_id, details, ip_address, is_deleted, created_at, outcome, user_agent) FROM stdin;
5997744a-57b5-4694-811c-e33991829735	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 12:53:34.975	\N	\N
b8146b7e-6b61-46f4-b92f-003bee16269e	7d3f3ade-b82a-4383-859e-31d8a42c4a01	update	My Org Security Settings	\N	{}	::ffff:172.21.0.1	f	2026-08-21 12:53:49.12	\N	\N
9c7ecaa3-740a-47ec-a7b6-c0b593f6b7de	7d3f3ade-b82a-4383-859e-31d8a42c4a01	update	My Org Booking Policies	\N	{}	::ffff:172.21.0.1	f	2026-08-21 12:54:03.893	\N	\N
72f94ee9-39af-4d8e-abd3-721b8c46b0aa	7d3f3ade-b82a-4383-859e-31d8a42c4a01	update	My Org Security Settings	\N	{}	::ffff:172.21.0.1	f	2026-08-21 12:54:34.293	\N	\N
f8093fcc-6254-44cf-a3bf-e34fd3ff4f40	7d3f3ade-b82a-4383-859e-31d8a42c4a01	update	My Org Security Settings	\N	{}	::ffff:172.21.0.1	f	2026-08-21 12:54:34.574	\N	\N
b276f3e4-26ba-4180-ab8b-558466d6b75d	7d3f3ade-b82a-4383-859e-31d8a42c4a01	update	My Org Security Settings	\N	{}	::ffff:172.21.0.1	f	2026-08-21 12:54:49.749	\N	\N
7e8de6f8-f79b-429d-ab19-262cd740c1ae	7d3f3ade-b82a-4383-859e-31d8a42c4a01	update	My Org Booking Policies	\N	{}	::ffff:172.21.0.1	f	2026-08-21 12:54:49.804	\N	\N
9573856b-d51c-4628-851c-0511c792ed99	7d3f3ade-b82a-4383-859e-31d8a42c4a01	update	My Org Security Settings	\N	{}	::ffff:172.21.0.1	f	2026-08-21 12:54:49.878	\N	\N
7aa68662-3131-4b18-b81a-e63372568682	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 12:55:05.755	\N	\N
6d5182bf-1755-474e-8c45-f9bfe528c481	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 12:55:18.825	\N	\N
d24d822e-303d-4bde-b0b9-5ef6a385cf7e	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 12:55:56.465	\N	\N
132e88d2-da26-4501-a5c5-d4d7b21f9caa	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 12:56:56.562	\N	\N
7c1f96c3-722f-4058-b44b-c92bc81ed702	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:04:34.449	\N	\N
094195fd-493a-45e7-ba5e-675314021e8e	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:05:18.004	\N	\N
ea130f08-312a-4536-9a1c-db2ea8301969	7d3f3ade-b82a-4383-859e-31d8a42c4a01	update	My Org Security Settings	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:05:26.412	\N	\N
9b45b3b2-89a5-4c6e-bd47-7c8c3755efd7	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:06:07.854	\N	\N
ae6afa0d-9f16-4178-9e41-025036e755fc	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:11:08.744	\N	\N
45fdba2a-8eca-4831-b7d5-725a10122f78	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:11:18.201	\N	\N
d40580e4-ae7a-4751-9ce3-ce4277de8b74	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:12:20.3	\N	\N
77585f7e-3824-45c9-baf6-68e37cb04f1d	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:13:33.195	\N	\N
bade59a6-d976-4d35-bcba-2637b404b605	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:15:40.604	\N	\N
b376413b-459f-4f1a-8898-134be96ccc80	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:23:13.426	\N	\N
4eaefdd4-091e-4689-8707-56840078b77b	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:32:47.346	\N	\N
a12da134-2c20-44b6-b8bb-5589bdc60b9b	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:33:13.704	\N	\N
5d73d8e6-df17-40ae-9b89-a900dd8a2202	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:41:16.793	\N	\N
ff3c4009-4a86-44b2-abad-ac88e6cb70b8	7d3f3ade-b82a-4383-859e-31d8a42c4a01	update	My Org Security Settings	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:41:26.609	\N	\N
d88a366d-8445-42be-9bf3-842fc60fdaae	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:42:47.195	\N	\N
7acce349-98d1-41c6-b5b2-dae57cbea960	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:43:24.316	\N	\N
34282be9-2442-453b-a857-a01e36d63c8e	7d3f3ade-b82a-4383-859e-31d8a42c4a01	update	My Org Security Settings	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:43:32.114	\N	\N
9f115335-4355-4afd-85d4-c088b2a8eafb	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:43:48.897	\N	\N
a93cff2b-908e-4c08-aa0b-09a7bd038d65	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:44:12.349	\N	\N
c0307901-0dbb-411c-bc49-a9a6ed48f26b	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:44:33.996	\N	\N
e5a4137a-9d8f-4207-b63a-1384e0d929db	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:45:45.374	\N	\N
7ea1ae23-c3ed-48c0-a781-6705c00a823b	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:45:46.37	\N	\N
9a0c1808-34e5-4203-9135-312c18d2b17e	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:46:24.554	\N	\N
3ec69804-8977-4094-b464-bb647b59afb1	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:46:29.521	\N	\N
776684d5-8e03-46ca-92b6-fc9c109c8da8	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:46:47.083	\N	\N
fcb630e7-8e9e-4103-a715-59f506eb3709	\N	register	register	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:46:56.562	\N	\N
cecbe5c3-493c-48b0-8109-99e7d74c2e5d	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:47:03.213	\N	\N
7cee3f9f-c2ad-491c-84e4-5fe4d2a26543	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:47:14.122	\N	\N
4d43a57a-8e7a-4515-8c8b-26b19bde1fd9	f79bc07c-4b88-443c-8d43-0a99c150ec41	start	Totp Enrollment	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:47:26.365	\N	\N
26964a47-c5d7-4d0e-8ed3-5e1f73b97f4f	f79bc07c-4b88-443c-8d43-0a99c150ec41	confirm	Totp Enrollment	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:47:31.174	\N	\N
2c03b334-2407-474b-94f3-2c012b9c2521	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:47:36.453	\N	\N
d6a0a881-06b0-42e3-974c-5dea18f2b84c	\N	verify	Totp Login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:47:43.302	\N	\N
5b839c8b-78ae-4fd7-bb3a-1aa3b74151b5	\N	verify	Totp Login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:47:43.938	\N	\N
c2e1ff48-8da6-41af-9bf2-8473b85b342d	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:47:49.054	\N	\N
4a2e3416-659a-4dc3-8ec6-5a51850dd779	\N	verify	Totp Login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:47:55.198	\N	\N
c2d136bb-f13b-4c1e-9ff9-40de755ee133	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:48:01.644	\N	\N
a05c5a2e-2736-4774-bf13-cc3b5c9a65f9	\N	verify	Totp Login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:48:07.463	\N	\N
19d2794c-7e81-46fe-b0be-39ce4087160b	\N	verify	Totp Login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:48:13.839	\N	\N
584ff740-33bc-42bd-9bff-3dc80c7ed5ff	f79bc07c-4b88-443c-8d43-0a99c150ec41	mutate	disableTotp	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:48:21.378	\N	\N
7cfb51c3-760b-42e5-8894-857e1cc3436b	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:48:56.349	\N	\N
52b01fa2-402c-4ce7-859a-01abeb5cf28e	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:49:17.415	\N	\N
aaa7e6a4-d85b-4707-acae-de81adfc1133	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:49:39.584	\N	\N
bc77bded-b748-45c1-aef8-948d14df6fff	d764ff7a-de6a-484e-a374-c2d8575d15c3	update	Email Template	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:49:45.297	\N	\N
5598f8fa-a55c-47d3-a49a-5028045d1d61	d764ff7a-de6a-484e-a374-c2d8575d15c3	update	Email Template	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:49:50.086	\N	\N
02bcefda-8324-4781-ac05-5889b3b81fa0	\N	register	register	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:49:52.321	\N	\N
48ec63d0-3f67-4db2-b5f3-43ab8eae6289	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:50:00.525	\N	\N
d38a0838-9446-43c1-9b2f-8b485bc3c257	a92f8ab8-8fd3-4c67-8da6-f5c91de17aab	start	Totp Enrollment	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:50:07.314	\N	\N
8b961eeb-a7a3-4406-a522-f7db48cc21ab	a92f8ab8-8fd3-4c67-8da6-f5c91de17aab	confirm	Totp Enrollment	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:50:12.816	\N	\N
47c7e589-02e5-46c6-92cb-e36f9df5b378	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:50:19.216	\N	\N
f9cc67a3-3eab-4f98-9f87-c9ebdeb730ad	\N	verify	Totp Login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:50:26.328	\N	\N
6c03c5e9-7e00-49c6-b0fa-d4d2cf995323	\N	verify	Totp Login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:50:27.299	\N	\N
26663327-7742-43b4-8d8a-3540a436efd6	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:50:33.056	\N	\N
823068d9-ff03-4bf4-907b-c198ca32a4d6	\N	verify	Totp Login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:50:40.108	\N	\N
bbc27e0a-e2ec-43c1-ba10-029997842d7e	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:50:46.025	\N	\N
d9bf9377-42f1-4b4d-b0b0-5dbd1698c5f3	\N	verify	Totp Login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:50:52.205	\N	\N
f3913f24-1159-4967-8984-509eed12d837	\N	verify	Totp Login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:50:59.542	\N	\N
73bf160a-4f62-4f88-a4c1-e8400e6d8528	a92f8ab8-8fd3-4c67-8da6-f5c91de17aab	mutate	disableTotp	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:51:06.974	\N	\N
25d5e3d4-ead1-4184-8d73-7f17847efeda	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:51:17.059	\N	\N
212ce869-4e92-4855-a2b8-09fd8271eb6e	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:52:14.843	\N	\N
8adbfac8-42b2-439f-ae38-60d168e64c8e	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:52:38.869	\N	\N
07842138-07c9-4d68-af6f-36225c249b7f	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:53:04.351	\N	\N
bde2482c-d9e5-4a1f-90f4-72fcbeb86c15	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:53:25.123	\N	\N
2ee7e062-5bc0-4a79-a18d-2396d23e051e	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 13:53:41.504	\N	\N
5ef6c1ab-7d2f-4882-8678-ef8fd1e2c0b6	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 14:32:02.684	\N	\N
77f3f3d2-9e1c-4d08-a1c9-b04274a29b23	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 14:32:38.86	\N	\N
7f9ad102-6559-46f0-ae84-4d7e07bfcc57	d764ff7a-de6a-484e-a374-c2d8575d15c3	update	My Org Branding	\N	{}	::ffff:172.21.0.1	f	2026-08-21 14:32:39.094	\N	\N
6b1c3079-d577-470f-bcdc-a9b560b4b1e5	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 14:33:20.788	\N	\N
424375e0-e3d9-4a33-9285-a2404de95ef0	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 14:34:23.79	\N	\N
0b8cf685-ada1-45a1-829b-1f10cb7b82d4	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 14:34:49.802	\N	\N
14c114e0-826c-469d-8061-13c584557af8	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 14:40:09.544	\N	\N
0a26d266-18ef-4827-8a12-0f4d0bcb7568	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 14:49:08.429	\N	\N
520b8c79-52e9-4438-81d3-2dcbaa28b72e	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 14:50:37.189	\N	\N
770f17fe-2411-434d-9bbc-40a4a3519812	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 14:51:02.527	\N	\N
3637f4c9-e4bf-464f-b5ff-8ae3f5f1d3d2	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 14:52:32.481	\N	\N
585521f1-83bc-4060-ba25-c05df3cb2ccd	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 14:55:21.193	\N	\N
2303ed27-9622-4ccb-8704-e270b4b8ac9a	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 14:55:48.859	\N	\N
d2ee4d92-e6fb-46a0-a304-dfb1181dd235	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 14:56:09.075	\N	\N
6e33285c-8851-4b16-8190-d7b2155a812f	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 14:56:45.293	\N	\N
b810919b-d71d-4555-9154-e58375ec4aba	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 14:57:43.509	\N	\N
2cab5371-565f-4bf3-8bb4-c57160b1557e	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 14:58:07.602	\N	\N
aa8f1c21-0002-48c3-b670-333ca8717f2b	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 14:58:31.463	\N	\N
8f80fc88-f5f6-4a4f-936f-f7a2374836d2	d764ff7a-de6a-484e-a374-c2d8575d15c3	update	Email Template	\N	{}	::ffff:172.21.0.1	f	2026-08-21 14:58:38.209	\N	\N
345dedf7-b041-44ea-8381-2117a84c35ef	d764ff7a-de6a-484e-a374-c2d8575d15c3	update	Email Template	\N	{}	::ffff:172.21.0.1	f	2026-08-21 14:58:43.62	\N	\N
a828d84d-319c-42d6-84fa-46158840c613	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 14:58:53.599	\N	\N
20bd7dae-205a-4a8f-9523-477b5d292039	7d3f3ade-b82a-4383-859e-31d8a42c4a01	update	My Org Security Settings	\N	{}	::ffff:172.21.0.1	f	2026-08-21 14:59:02.205	\N	\N
9037a78c-527a-4b00-bd40-d3040f93c7a7	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 14:59:19.548	\N	\N
6551fe3e-f172-4271-baae-5de222f0ee00	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 14:59:43.592	\N	\N
e9e48c4a-1166-4e94-a4c2-d5828b1f6f88	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 14:59:59.382	\N	\N
1a9982cc-70ea-49c6-9f7c-835ef26a564d	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 15:00:18.556	\N	\N
be017a1d-e91a-4297-8028-57410aa8c25a	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 15:00:43.844	\N	\N
4343e035-bd8e-40fd-a801-b93e05de4950	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 18:15:55.729	\N	\N
60c6b4fd-f533-49bd-b310-063eaa560be8	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 18:18:14.152	\N	\N
6be0991d-0050-43b3-b06e-367d71ad6d0f	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 18:19:44.954	\N	\N
000583c9-ce1c-4928-9347-aa9b5e52980c	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 18:20:55.969	\N	\N
35de3006-f063-4a19-9d66-0fbab609ae92	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 18:22:25.98	\N	\N
455e3b4d-8657-4be3-978c-5606f40646b8	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 18:26:27.277	\N	\N
728be6d5-1ffa-4969-a958-f55936954cf1	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 18:28:25.043	\N	\N
23e02b5e-bbbe-4b5f-a59b-416466f3b0c6	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 18:29:31.037	\N	\N
a8a4ab13-b131-4d73-88d9-1af2c1fee606	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 18:30:02.677	\N	\N
06d89743-d66e-40f1-a126-e7de35bf25a3	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 18:36:56.898	\N	\N
7806e97b-b71c-44c2-8977-dc8c03876042	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 18:37:49.813	\N	\N
f3fb9dbe-e499-439f-a3e0-5cc79d0b1ada	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 18:39:22.071	\N	\N
ffae080c-7319-4b6a-a0a0-f9bca7cb14da	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 18:39:50.141	\N	\N
bc1f2a8c-1678-4469-8ff1-6a59ea10e33f	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 18:41:53.446	\N	\N
8b4d2700-5f8e-40e2-b992-6aa52fe0988d	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 18:42:16.723	\N	\N
26cfc90f-4de4-44cc-863b-39a8e31fcc66	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 18:43:51.979	\N	\N
aea0731d-f37f-431b-9f00-fba2b33dc29c	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 18:45:59.14	\N	\N
0df0a878-619b-4667-aad2-932ed05d2f43	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 18:46:42.744	\N	\N
a4a860cf-c073-4682-ad3f-afc53944b026	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 18:46:54.131	\N	\N
0e768bb2-be0d-4df5-9616-5ba10b9f9ee8	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 18:49:09.229	\N	\N
a8fb0169-458f-4d33-bd51-ab93276f2676	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 18:49:50.857	\N	\N
0fac46fa-c283-4a0c-b3c0-c12baa32d5a8	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 18:51:21.613	\N	\N
6d36849b-464f-4a38-891b-23ebc2d405fe	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 18:51:22.364	\N	\N
d2273e1a-3e99-4d8f-a6ab-e2c77d99ec37	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 18:51:59.618	\N	\N
c207cedf-c17e-44e7-b3f3-15c3a6c7d56a	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 18:53:43.7	\N	\N
de76d97f-8052-4d07-84dc-e67d98a1a041	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 18:54:11.564	\N	\N
d1592afb-8c2f-474f-8e22-93667a98feb6	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 19:03:12.32	\N	\N
aaa7edb8-b559-48dd-b003-e3d734f2f1ff	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 19:04:15.746	\N	\N
e9bae198-6e35-488f-87a6-1bc273dfef1c	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 19:04:45.194	\N	\N
22f20534-c2df-47d7-80f8-5d7bd7d42e8c	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 23:47:14.15	\N	\N
e2b9449d-8ef2-435f-9f63-bf51eabc0ef0	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 23:47:28.348	\N	\N
2591612a-5ac0-4c85-895a-fc521cd793f0	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 23:47:45.498	\N	\N
7a65ebe4-e880-4555-b374-3ee2c8b0514b	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 23:47:49.266	\N	\N
885bafbd-3915-48c6-9225-0d5ad0dbd2e3	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 23:47:52.227	\N	\N
1afc9199-3951-4b8f-b543-d0929c10ce34	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 23:50:01.181	\N	\N
56801146-d502-4a54-8448-287f9d754ab0	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 23:51:53.13	\N	\N
902376f3-aadf-4c05-83c0-b24a0ef6844b	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 23:52:38.453	\N	\N
c5d36830-a213-409d-bba2-10a9a685430a	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 23:53:08.619	\N	\N
a821f553-29e1-410f-ae0e-10053400c85f	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-21 23:54:47.366	\N	\N
3eaadb49-0620-478f-9d62-b3c3e1fb7849	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 00:00:36.775	\N	\N
639e352b-f381-45c3-9bf0-9858565c7c7a	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 00:01:01.217	\N	\N
298cd724-b6d8-4f60-b7e0-dd056c481863	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 00:02:32.495	\N	\N
697503ed-afb1-4a3c-bc6e-c20a7b440d4c	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 00:03:06.712	\N	\N
6dca7774-b88e-42d2-9272-81ac9052843a	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 00:04:35.586	\N	\N
44ecf140-6c07-4a94-9eed-7b6d4d5cae33	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 00:05:34.288	\N	\N
8161e79a-33bf-4403-a203-d43e4506b611	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 00:06:29.522	\N	\N
08e1035f-6c2c-4e1c-b30a-7337d3a95699	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 00:07:36.67	\N	\N
9b7def12-ccca-4271-97b9-c740d9fd03db	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 00:08:40.248	\N	\N
8842b45b-8d14-4d73-9117-4136ccf322cc	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 00:09:27.166	\N	\N
a59f6825-a4ea-4444-9286-fec0bf37629c	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 00:11:27.729	\N	\N
e0dcd1c6-5266-4db3-b353-6673e48ae8bb	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 00:12:25.92	\N	\N
ba0cd199-d9a6-4a99-8c60-93e8d445921d	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 00:12:42.517	\N	\N
bf24f2c7-7b14-4b3b-824f-2ebaf3900be8	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 00:13:03.349	\N	\N
d5251130-3520-42f2-a82b-4d8542b8df81	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 00:15:44.542	\N	\N
8f51f94f-f9f5-457e-b248-7b0d98666bff	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 00:16:04.606	\N	\N
b1c87602-4738-41cd-9125-3013ef5ef3a3	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 00:20:08.063	\N	\N
83069d6f-ff36-416a-bdf2-a424e24a12f4	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 00:20:25.168	\N	\N
d6b2938a-09ac-470d-b003-8dd72501d6cd	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 00:20:39.037	\N	\N
8e2465d2-f071-40d0-b8c0-c07fc84023e7	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 00:22:17.87	\N	\N
1301bd28-e9dc-4e9b-82bf-36cf077b2448	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 00:23:14.846	\N	\N
d69fef5a-8331-4cd2-91ac-1e77becb2bc6	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 00:24:26.639	\N	\N
d8b780da-97a8-4400-9c17-1dfdce0755b6	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 00:28:46.296	\N	\N
c41c399f-7f9b-4087-8f28-3f8fa7690af1	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 00:29:30.397	\N	\N
2f312b0a-55d7-4a50-839e-7236bbd6dbd4	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 00:30:35.928	\N	\N
1238e9c5-2f9f-4c3f-aed0-9e7cb951e776	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 00:31:26.447	\N	\N
f03a391d-373e-4e73-b4b1-4c427b330387	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 00:33:44.279	\N	\N
6936adc5-d7e4-4152-9b49-c1d37448bd6b	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 00:34:03.375	\N	\N
b58d3abf-46b8-466b-888f-c3b302874866	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 00:34:16.85	\N	\N
82bd6800-15a2-4fb1-8241-fac575a4b0d3	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 00:34:34.138	\N	\N
1a843d95-841b-48f4-9579-b8b4ac988d8a	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 00:35:19.292	\N	\N
3c3544ec-5aac-4a44-a918-4b03029682ea	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 00:36:21.045	\N	\N
0c5bf3eb-788d-4f8a-b630-2eab03508eaa	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 00:37:24.742	\N	\N
ff9a80d6-dea1-43f2-a059-768c3a69a79a	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 00:40:20.534	\N	\N
9cb4c465-059f-46fa-a31d-8220bb42b94e	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 00:40:37.677	\N	\N
0bdc8e3a-4812-40e8-a4e5-7f409b84bf14	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 00:40:58.036	\N	\N
c6337e64-48b3-4e79-b861-ff63f618b1ef	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 00:41:15.621	\N	\N
b2cdb870-b1e1-4791-9022-6afbe2775bd5	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 00:41:40.597	\N	\N
eb8d35c6-3622-46f0-bba9-0ad73fab2536	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 00:42:00.462	\N	\N
244ebb1e-1cde-4b5c-8807-bb38d979de1b	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 00:42:14.564	\N	\N
fc69c079-03fb-4072-bc1b-00a2f31f5b05	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 00:42:28.257	\N	\N
dd4c0591-045c-4c73-8b41-a7dec1aed300	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 00:42:46.157	\N	\N
93fdfcfe-e598-4877-bef4-3114aa88b2ef	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 00:43:00.46	\N	\N
80c81dad-0da0-4e8d-93cd-3d6cdc1b2907	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 00:43:15.689	\N	\N
0296f28c-b344-4f67-8d2c-81f42acf7ab8	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 01:18:39.802	\N	\N
dd4358f9-fe29-4e00-9887-e7bc546d0526	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 01:19:30.517	\N	\N
599c7a86-c62e-4849-8867-76713af1d42d	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 01:19:48.676	\N	\N
d6b17070-781c-4cbc-98f8-2ce29f8edafe	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 01:22:51.865	\N	\N
8cd892a9-6349-4733-93df-d7ca8a4e3dc6	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 01:26:29.611	\N	\N
a4508b76-f06c-44c8-988e-4fd7cb8dafb3	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 01:28:40.494	\N	\N
e68e9577-5a62-4874-931f-cb7fa49c6f8a	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 01:29:09.35	\N	\N
d3f18978-c7bf-4b93-aac4-50642f18e701	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 01:33:06.205	\N	\N
44cf832e-1621-49a3-a5dc-aeb5b75463de	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 01:35:01.257	\N	\N
91d4597c-b8fb-426a-a3e4-9bf4b1f7cf72	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 01:41:40.706	\N	\N
ddd4e0b8-8ea8-4564-9a5a-ced38e0b6ff2	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 01:42:07.237	\N	\N
1f16d1fc-e497-4095-941f-40450538d057	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 01:43:17.774	\N	\N
05a4871f-deae-42bb-8974-cf5cb26fbbfd	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 01:43:43.065	\N	\N
2fe6f058-8b91-442b-ab26-aaff4861ebff	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 01:46:49.412	\N	\N
4b38fadd-6cff-4170-9c40-98a0ed242bd3	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 01:47:14.302	\N	\N
cdd13392-8787-44c3-859c-929f532b0613	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 01:48:43.639	\N	\N
b99a8ad8-7459-476b-b963-998226d132a3	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 01:49:05.976	\N	\N
61229be3-eed4-405e-9e7d-3c63a00e03f6	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 01:50:35.71	\N	\N
a1eece3e-2fac-48db-8f36-c7e021144ffd	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 01:51:25.802	\N	\N
024a5ea0-1357-490c-9403-f2f290796149	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 01:52:22.062	\N	\N
373f0513-569b-4b7c-95fd-e4e4b3b162dc	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 01:53:17.832	\N	\N
99ba8ac3-dc23-4602-bc32-bbecd4b28f6f	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 01:53:30.06	\N	\N
28621c91-e7a0-49ab-b5ef-a737a233e71c	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 01:53:43.471	\N	\N
f44a7ad2-9494-4fa9-ba04-1fb7a4f152d8	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 01:54:29.479	\N	\N
828fa151-8007-47da-ad5f-61e8c7a8cbe3	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 01:55:46.597	\N	\N
b5c8eafb-4f65-4a7c-8074-3e85408c2c86	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 01:56:00.078	\N	\N
a08d96b4-6497-4ebd-bb82-d26321725585	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 01:56:12.29	\N	\N
d2552ad1-c1c5-430d-a6f9-ce0ef7760046	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 01:56:17.512	\N	\N
1df59166-7e59-458c-8014-e0c43b2f23bb	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 01:57:30.799	\N	\N
9f7ee3b1-33f2-45c7-86a9-6ef93756bdcf	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 01:57:44.42	\N	\N
362ed801-f653-4473-a76e-86baac2b344d	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 01:57:57.393	\N	\N
cd695760-1dbd-47aa-aa04-c4097ea6dbef	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 01:58:02.934	\N	\N
d2abea3a-6530-4f87-8bc1-4bbe70ac2fc7	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 01:58:11.42	\N	\N
ce263ffc-86cd-4fd6-b8c3-0753eb079403	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 01:58:59.561	\N	\N
5545eb5a-ee22-4c5f-8a8c-ac0981dc77bd	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 01:59:41.565	\N	\N
c6d4b441-3aba-4ebc-b3ff-b90e8a0c8c4d	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 01:59:55.158	\N	\N
90b59db5-d136-40ad-8076-2f66598acb11	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 02:00:09.038	\N	\N
ffa70e24-24f3-447f-85d6-1d53d2c7adb3	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 02:00:26.131	\N	\N
d7f8bd9f-7a07-4fc7-a0a4-eb968da1f9b5	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 02:02:58.556	\N	\N
fa622ba2-135b-4899-88dc-88bd46bb30fb	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 02:04:02.652	\N	\N
6367cec7-dbf9-4935-91c0-54e917c30ffe	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 02:04:16.488	\N	\N
4e72fa40-b9a7-457c-a0e8-02a19a616080	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 02:04:30.678	\N	\N
441a27bf-6fba-446f-b6d4-ffd4bcb06cbc	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 02:04:43.09	\N	\N
c1363b22-4aa5-48b1-bdfd-44e7f4d5f66a	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 02:04:59.423	\N	\N
3de0558c-a876-47b2-9efc-4647a40b1ec7	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 02:05:55.469	\N	\N
563941ff-bfba-4c00-a3f0-59e869f748a8	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 02:15:17.196	\N	\N
f95b033b-6285-47cd-af92-7780beebebc4	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 02:15:33.398	\N	\N
3582b719-b3c9-49ee-821e-336c695c733f	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 02:15:50.351	\N	\N
35d886aa-6290-4c3b-9a91-05f83fb188b6	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 02:16:06.178	\N	\N
59458b1a-127f-4fdd-be9d-5864bff50540	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 02:16:25.895	\N	\N
ccca356b-994e-43fa-b600-507115394634	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 02:46:03.399	\N	\N
7ca76013-6b22-4ebd-a9dd-3361ea1acc97	d764ff7a-de6a-484e-a374-c2d8575d15c3	create	Organization	\N	{}	::ffff:172.21.0.1	f	2026-08-22 02:46:15.994	\N	\N
a795029b-81e4-4a83-b779-bf46b14e4487	d764ff7a-de6a-484e-a374-c2d8575d15c3	create	Organization	\N	{}	::ffff:172.21.0.1	f	2026-08-22 02:46:16.064	\N	\N
dcc3a15f-fcc1-40a7-94f9-1ab982859729	d764ff7a-de6a-484e-a374-c2d8575d15c3	update	Organization	\N	{}	::ffff:172.21.0.1	f	2026-08-22 02:46:27.901	\N	\N
0fb4701a-0145-40e4-a7ba-c775809dc7da	d764ff7a-de6a-484e-a374-c2d8575d15c3	delete	Organization	\N	{}	::ffff:172.21.0.1	f	2026-08-22 02:46:27.95	\N	\N
bab1b376-2488-447b-81c5-07614588e370	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 02:46:41.282	\N	\N
f04467c6-b3ae-41d3-9218-b61369a6fa3e	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 02:59:21.501	\N	\N
79a4038f-b3dd-422d-93b9-74e6bb2904ee	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 02:59:41.724	\N	\N
2ddec499-5026-4cdd-81ae-5966ed5d1089	\N	register	register	\N	{}	::ffff:172.21.0.1	f	2026-08-22 04:06:26.732	\N	\N
5e8b35a6-6d69-4a8b-9570-489486f90426	\N	register	register	\N	{}	::ffff:172.21.0.1	f	2026-08-22 04:06:44.656	\N	\N
e83f5314-99dd-47fa-8c37-ab9a112acc21	\N	register	register	\N	{}	::ffff:172.21.0.1	f	2026-08-22 04:07:03.255	\N	\N
da48de37-24dc-44cf-a102-f676c3f19812	\N	register	register	\N	{}	::ffff:172.21.0.1	f	2026-08-22 04:07:23.874	\N	\N
2a2ebff3-e780-48c4-9e55-7ac94013e97a	\N	create	Razorpay Order	\N	{}	::ffff:172.21.0.1	f	2026-08-22 04:07:25.114	\N	\N
3e7c1d06-8e38-4878-8b21-c93a4bbadb80	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 10:54:55.303	\N	\N
fed8b403-6431-442e-87c2-46ff34c04aa8	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 11:08:51.848	\N	\N
4617f1bd-8032-4b98-b8e9-68748512adb8	\N	request	Otp	\N	{}	::ffff:172.21.0.1	f	2026-08-22 11:10:34.912	\N	\N
c5eacdb6-bf5a-46d8-aabd-5397f53f4366	\N	verify	Otp	\N	{}	::ffff:172.21.0.1	f	2026-08-22 11:10:57.3	\N	\N
b80368e1-b260-4e65-8f9e-22f7a1d9d251	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 11:12:02.396	\N	\N
a586f704-afc5-40ff-81c0-ba76cd9e0f1a	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 11:13:20.626	\N	\N
6298492a-ca3a-410b-8e96-816ff571921a	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 11:13:22.494	\N	\N
624e90a5-deed-488a-a04d-2d19a729fa38	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 11:14:22.404	\N	\N
3b453152-00a3-4096-aefd-f18aa8c2c519	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 11:14:22.458	\N	\N
f61cb4ec-a4fc-43d0-a822-4afebf1cd072	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 11:15:02.028	\N	\N
94d176f6-7ffc-43ef-b885-468254675303	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 11:15:05.129	\N	\N
bcb64570-219d-4345-b82f-8920090a48e1	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 11:15:24.994	\N	\N
26c93723-f2eb-4a65-a231-118d5480c428	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 11:15:28.839	\N	\N
b1d72f66-6475-4665-b715-f845a788572f	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 11:16:41.087	\N	\N
107635fb-d930-423b-a568-47fe31db6f9b	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 11:17:40.17	\N	\N
c7cd56b5-1816-41ad-a876-c1da56903e04	d764ff7a-de6a-484e-a374-c2d8575d15c3	create	Role	\N	{}	::ffff:172.21.0.1	f	2026-08-22 11:17:51.339	\N	\N
2fea131c-8b60-4b97-b36e-f5cfde2fc3c3	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 11:18:02.393	\N	\N
5173e69b-526e-4876-9859-12771084e2e6	\N	register	register	\N	{}	::ffff:172.21.0.1	f	2026-08-22 11:44:59.42	\N	\N
1427e96b-2a11-4650-bf66-474caa50316e	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 11:45:20.862	\N	\N
95bd0b51-c998-4e30-b657-120a5eff87d2	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 11:45:22.242	\N	\N
4f0040af-a324-4b53-a6b5-4add98d0b34e	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 11:47:13.97	\N	\N
15c03e19-8e62-4f7d-845c-249632482adb	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 11:47:17.267	\N	\N
21e35bf5-290f-4f6d-a6f8-833418e9dfcc	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 11:48:11.954	\N	\N
4a4dbf07-76ec-4835-af8e-043bc732305b	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 11:49:07.992	\N	\N
c072298a-4ef0-4d16-a0c9-028f982f65e4	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 11:49:08.475	\N	\N
a352bb11-8b5a-42d7-9cba-13609a79854c	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 11:49:48.913	\N	\N
52847b61-fb81-4596-9d8a-9f0216d2fe22	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 11:51:56.669	\N	\N
45669558-6b65-485b-bec0-17a815a7810b	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 11:55:51.252	\N	\N
0348e3f0-2c80-4231-8376-dd76c48d1476	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 12:08:56.149	\N	\N
95f48e5d-4ce6-419d-809b-db94e84a591c	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 12:30:43.79	\N	\N
c970cd02-917e-49aa-9245-2e315e19694c	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 12:32:12.656	\N	\N
5467ca85-71b8-495a-8ad7-0124b034f2af	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 12:33:17.166	\N	\N
64dfd39a-ca16-47d1-a1a7-eae62963385d	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 12:34:23.762	\N	\N
4f5bdbae-e5e8-43d1-8c6e-74e7d43696f4	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 12:35:59.095	\N	\N
71ce7383-bdb2-404c-a27f-f1c0b0a1200c	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 12:36:29.761	\N	\N
38e26caf-b7bd-4b4d-a546-9107898d6a66	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 12:38:50.238	\N	\N
142ab595-17a5-4e6f-b540-ebe3a074ee33	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 12:41:55.52	\N	\N
86974246-45f3-4b75-b19e-c9bfa04c385a	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 12:42:59.984	\N	\N
162fb3dc-6a79-4e00-b0a4-052d85e89c32	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 12:43:16.603	\N	\N
78050fb9-bc52-4f1d-b406-49d3db1eec06	\N	register	register	\N	{}	::ffff:172.21.0.1	f	2026-08-22 12:52:47.999	\N	\N
4d7ddb9d-1507-4cfa-bcc8-cfe5030779bc	\N	register	register	\N	{}	::ffff:172.21.0.1	f	2026-08-22 13:13:36.59	\N	\N
393b1de3-c281-4f9a-ba9a-244c436fc74e	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 13:13:41.884	\N	\N
324e6002-ba5a-46f4-9012-0c641713cc05	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 21:22:05.09	\N	\N
b3b83ab1-3c5d-43b9-9f04-7fe6e7b0ec9a	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 21:22:17.477	\N	\N
73ca9853-579a-4a73-8b2d-bcdb248c9817	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 21:22:27.578	\N	\N
6367d31c-d694-4dcf-90c8-691da518378a	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 21:22:36.074	\N	\N
655c0834-eb89-4835-900d-4468776fa6d7	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 21:22:46.895	\N	\N
411df03c-dc0e-4b53-bead-22761cfffc5c	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 21:23:43.101	\N	\N
efe93f3b-29dd-4852-a722-3e9b9b20dc25	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 21:23:56.993	\N	\N
a7ac13ce-1afe-4ed3-961a-b7341ff8e1ec	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 21:24:03.579	\N	\N
38bdb805-d52f-4a9a-9d70-9d1b42145473	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 21:24:09.47	\N	\N
7d5ea4e2-f73e-40e4-be4d-ce3fe46244d1	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 21:24:21.583	\N	\N
2a6301d4-bb95-4ed5-8600-2f4a7e0163e1	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 21:25:20.63	\N	\N
61362ea0-3d3e-450a-aab0-0e4d45f6dc75	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 21:25:38.598	\N	\N
58655b7f-5a97-4c66-9e5c-6f2d62f0ff35	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 21:25:51.193	\N	\N
056fda26-073e-4124-81ae-49a15358f7fe	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 21:26:02.675	\N	\N
b476c913-da9a-4fe6-b310-7e9ddd9013c0	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 21:27:25.244	\N	\N
138b44db-6c57-4888-9860-b28077dadb94	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 21:28:17.871	\N	\N
3d7939fe-a68a-45f2-9f9b-8ee35813e078	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 21:28:32.165	\N	\N
ddaa5a48-6932-4759-9dfd-b6cbc688a6a2	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 21:28:36.338	\N	\N
ab28ca13-293b-4a48-8f78-e69fd6f05622	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 21:30:01.971	\N	\N
f8435c1b-866d-40ca-96f5-42c8c74be09b	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 21:30:14.9	\N	\N
76baadfb-5a0a-4eb7-8cb7-82db28953a9d	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 21:30:25.625	\N	\N
de316923-6954-4320-81e2-07db11f07380	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 21:30:30.941	\N	\N
13150ba8-7e8f-44f2-b989-9e931f1b1b0f	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 21:45:05.782	\N	\N
322034be-3b72-46e1-8ca9-c53f80aeb3ef	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 21:45:15.085	\N	\N
8658139c-be13-4fcb-8229-6ab585d54921	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 21:45:26.102	\N	\N
8dd7bf41-8182-4838-8a24-b3ea9ca5a9bf	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 21:45:36.262	\N	\N
08ecea9b-0c30-4ca1-8b36-7be86d62103e	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 21:45:49.071	\N	\N
d9694599-eab8-4bff-9b0c-15600b5d87c9	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 21:46:58.287	\N	\N
49ee73fc-5f85-403c-aa87-2eff06e07740	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 21:47:17.875	\N	\N
b55bf32d-bbd7-4a83-8bec-b47d05178bf7	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 21:46:41.144	\N	\N
a4e08214-32e5-4996-8174-7e24c8f069c8	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 21:46:49.881	\N	\N
24dd150f-e9df-48e9-ac6a-b01e80ab1e57	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 21:47:08.605	\N	\N
db41f580-25c5-474d-b733-0ab8a6d089f5	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 21:51:28.712	\N	\N
270612b3-7760-4b98-8ded-ca02c45efb87	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 21:52:26.988	\N	\N
88c53d3e-8ef2-40eb-bbf4-e525000b060b	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 22:21:31.213	\N	\N
2cac3fdb-945b-4d24-a1aa-22d12cb3c2d4	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 22:21:59.949	\N	\N
b49c10dc-933c-497b-9eeb-ad62d92408a4	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 22:22:00.602	\N	\N
2915a84a-3f80-428e-a003-ac3a203c382f	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-22 22:22:01.272	\N	\N
52c9a933-6fcf-42d2-a977-05ea88ee5899	\N	book	Patient Appointment	\N	{}	::ffff:172.21.0.1	f	2026-08-23 00:45:05.357	\N	\N
4356e161-88cb-4c05-954b-dd410d0a15ab	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-23 00:49:27.79	\N	\N
09c13ba5-27ef-4416-8824-b64e77d19f5c	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-23 00:49:28.396	\N	\N
12ac018b-f933-45b3-977f-bdbea3b42228	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-23 00:49:28.967	\N	\N
3a7ad979-d27d-4ff2-a428-0f45512805ef	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-23 00:49:29.473	\N	\N
471724d0-0f3a-426f-9446-ef9840f0e842	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-23 00:49:30.025	\N	\N
2e3c3d53-c0d9-48d8-ac72-33e43b6d1d4a	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-23 00:53:30.349	\N	\N
cb68edf8-0d9c-4423-a818-3edc9f37b415	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-23 00:53:30.787	\N	\N
a6b75bed-f93c-4648-80ac-6ee9d9329a47	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-23 00:53:31.466	\N	\N
d1c80204-5f7b-460c-9b89-f112b9d4afe8	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-23 00:53:32.037	\N	\N
e8061b81-e64c-41d0-8da4-0421662303ae	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-23 00:53:32.519	\N	\N
a32b4369-6d5c-4673-a282-ba128bb4a62f	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-23 00:53:33.14	\N	\N
75b1b0a5-554f-4c09-8cb9-11e8b25cd5d7	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-23 00:53:33.648	\N	\N
4e3a2449-e950-434e-8b05-9546535a7977	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-23 00:54:48.008	\N	\N
86ab1f47-19aa-4b4b-be3a-ef41f35d0790	\N	book	Patient Appointment	\N	{}	::ffff:172.21.0.1	f	2026-08-23 01:00:15.964	\N	\N
d537432b-a068-4ccc-9cef-b884cb92207a	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-23 01:38:37.27	\N	\N
3e09d695-ccef-4420-9561-a014b0819cd9	\N	login	login	\N	{}	::ffff:172.21.0.1	f	2026-08-23 01:39:15.302	\N	\N
425e6ab6-4e7b-4996-b5d8-cbf081b52701	\N	mutate	forgotPassword	\N	{}	::ffff:172.21.0.1	f	2026-08-23 01:45:56.831	\N	\N
58ad8de5-3cec-4b44-8d23-96f77c81a2b7	\N	login	login	\N	{"input": {"email": "admin@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 02:15:15.747	success	curl/8.21.0
ef45b0a5-7585-4d1c-b2a1-2960f7289e69	d764ff7a-de6a-484e-a374-c2d8575d15c3	update	Clinic	7307c9d9-8a74-4305-8933-7b0a73c1486d	{"id": "7307c9d9-8a74-4305-8933-7b0a73c1486d", "input": {"city": "Bengaluru", "name": "MG Road Clinic", "email": "mgroad@medibook.dev", "phone": "+919876543210", "address": "12 MG Road", "postcode": "560001"}}	::ffff:172.21.0.1	f	2026-08-23 02:16:02.083	success	curl/8.21.0
7484e6b7-6c73-4337-b598-09c531146f0b	d764ff7a-de6a-484e-a374-c2d8575d15c3	update	Clinic	7307c9d9-8a74-4305-8933-7b0a73c1486d	{"id": "7307c9d9-8a74-4305-8933-7b0a73c1486d", "input": {"city": "Bengaluru", "name": "", "email": "mgroad@medibook.dev", "phone": "+919876543210", "address": "12 MG Road", "postcode": "560001"}}	::ffff:172.21.0.1	f	2026-08-23 02:16:11.633	failure	curl/8.21.0
9d198ba5-5491-4592-82ef-5ac2e8568362	\N	login	login	\N	{"input": {"email": "admin@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 02:29:17.943	failure	curl/8.21.0
abbe7f18-4706-4fdf-b8d6-2166fda46376	\N	login	login	\N	{"input": {"email": "admin@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 02:29:18.717	failure	curl/8.21.0
5edbf8ff-9a78-49a8-a64a-fd5e463c8d22	\N	login	login	\N	{"input": {"email": "admin@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 02:29:19.483	failure	curl/8.21.0
6745d5b8-ae4e-4ca9-b4d0-d76048e60793	\N	login	login	\N	{"input": {"email": "admin@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 02:29:20.207	failure	curl/8.21.0
e3b52879-77f4-4ab2-8486-c96f7294494a	\N	login	login	\N	{"input": {"email": "admin@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 02:29:21.009	failure	curl/8.21.0
fe15bb9f-bc02-4684-8aee-ceed083f4f54	\N	login	login	\N	{"input": {"email": "admin@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 02:29:21.336	failure	curl/8.21.0
34309048-b8bc-43d1-aac8-4df188f46903	\N	login	login	\N	{"input": {"email": "admin@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 02:29:21.905	failure	curl/8.21.0
061b44c1-8e00-4dc7-9c8b-b32aaf10619b	\N	login	login	\N	{"input": {"email": "admin@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 02:29:22.519	failure	curl/8.21.0
990045c6-9ce9-41f6-bb2e-d50b214e502e	\N	login	login	\N	{"input": {"email": "admin@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 02:29:23.082	failure	curl/8.21.0
bcc8d254-9ab4-49c8-89ef-54e7149c1ae6	\N	login	login	\N	{"input": {"email": "admin@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 02:29:23.613	failure	curl/8.21.0
ef271293-5b99-4e10-9e1f-d75b441e1ed4	\N	login	login	\N	{"input": {"email": "admin@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 02:29:24.161	failure	curl/8.21.0
c69c5bf2-8587-4803-b1ae-ae66e234a73b	\N	login	login	\N	{"input": {"email": "admin@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 02:29:24.733	failure	curl/8.21.0
7478c324-daee-4847-b91d-131c1591cdf0	\N	login	login	\N	{"input": {"email": "admin@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 02:29:25.255	failure	curl/8.21.0
6a41c466-830e-4548-86b0-561b66c4dac5	\N	login	login	\N	{"input": {"email": "admin@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 02:29:25.79	failure	curl/8.21.0
7c06e036-bf42-4479-83e6-5ae8420ffc9d	\N	login	login	\N	{"input": {"email": "admin@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 02:29:26.286	failure	curl/8.21.0
086e06ec-6f85-46f7-9e62-455d20173a9c	\N	login	login	\N	{"input": {"email": "admin@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 02:29:39.029	success	curl/8.21.0
a88fad07-155d-4897-9b61-5cacdf0c1cc2	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 02:54:38.257	success	curl/8.21.0
8b005961-92bd-4b6f-ba08-d08697fdd145	\N	login	login	\N	{"input": {"email": "admin@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 03:16:29.914	success	curl/8.21.0
84da0e90-588c-48de-be32-e3559a7c65e5	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 10:48:00.792	success	curl/8.21.0
95014737-3a1e-4d98-a770-bd53ca803fef	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 10:55:42.558	success	curl/8.21.0
2b64f652-4d00-4665-8d93-badac5f669ff	\N	create	Razorpay Order	\N	{"appointmentId": "00000000-0000-0000-0000-000000000000"}	::ffff:172.21.0.1	f	2026-08-23 11:05:09.225	failure	curl/8.21.0
73b89658-5ea0-44d7-962a-bd09a320090e	\N	create	Razorpay Order	\N	{"appointmentId": "00000000-0000-0000-0000-000000000000"}	::ffff:172.21.0.1	f	2026-08-23 11:05:09.48	failure	curl/8.21.0
84549a3d-a37d-4699-baa2-9dbe22a50c75	\N	create	Razorpay Order	\N	{"appointmentId": "00000000-0000-0000-0000-000000000000"}	::ffff:172.21.0.1	f	2026-08-23 11:05:09.677	failure	curl/8.21.0
1edaa8aa-6ef9-4657-9671-bb70dfca6422	\N	create	Razorpay Order	\N	{"appointmentId": "00000000-0000-0000-0000-000000000000"}	::ffff:172.21.0.1	f	2026-08-23 11:05:09.868	failure	curl/8.21.0
40f4a602-04d2-4bc4-8ffb-177145c6e338	\N	create	Razorpay Order	\N	{"appointmentId": "00000000-0000-0000-0000-000000000000"}	::ffff:172.21.0.1	f	2026-08-23 11:05:10.043	failure	curl/8.21.0
bde95513-33f4-485e-a656-36f7ca6320e4	\N	create	Razorpay Order	\N	{"appointmentId": "00000000-0000-0000-0000-000000000000"}	::ffff:172.21.0.1	f	2026-08-23 11:05:10.219	failure	curl/8.21.0
f763e5c7-00e4-4828-bf9d-c6deeb10344a	\N	create	Razorpay Order	\N	{"appointmentId": "00000000-0000-0000-0000-000000000000"}	::ffff:172.21.0.1	f	2026-08-23 11:05:10.4	failure	curl/8.21.0
c8a68ccc-19da-4e0d-b551-5ed7a27c9576	\N	create	Razorpay Order	\N	{"appointmentId": "00000000-0000-0000-0000-000000000000"}	::ffff:172.21.0.1	f	2026-08-23 11:05:10.593	failure	curl/8.21.0
476bd9cf-a520-4f55-880d-9537d433cafb	\N	create	Razorpay Order	\N	{"appointmentId": "00000000-0000-0000-0000-000000000000"}	::ffff:172.21.0.1	f	2026-08-23 11:05:10.77	failure	curl/8.21.0
1276e932-5e0b-491a-bdd7-b867134ec566	\N	create	Razorpay Order	\N	{"appointmentId": "00000000-0000-0000-0000-000000000000"}	::ffff:172.21.0.1	f	2026-08-23 11:05:10.961	failure	curl/8.21.0
8f9fe6ec-3491-42d8-b713-d7dc7b7b4568	\N	create	Razorpay Order	\N	{"appointmentId": "00000000-0000-0000-0000-000000000000"}	::ffff:172.21.0.1	f	2026-08-23 11:08:08.64	failure	curl/8.21.0
685ff00e-4f3d-4bf4-9e1d-bcd66d93e859	\N	create	Razorpay Order	\N	{"appointmentId": "00000000-0000-0000-0000-000000000000"}	::ffff:172.21.0.1	f	2026-08-23 11:08:21.078	failure	curl/8.21.0
e4f02d18-576f-43e0-9398-6d770dd64d4b	\N	create	Razorpay Order	\N	{"appointmentId": "00000000-0000-0000-0000-000000000000"}	::ffff:172.21.0.1	f	2026-08-23 11:08:21.817	failure	curl/8.21.0
e5977fe4-9137-4dd8-a436-1b6ff2208f5f	\N	create	Razorpay Order	\N	{"appointmentId": "00000000-0000-0000-0000-000000000000"}	::ffff:172.21.0.1	f	2026-08-23 11:08:22.574	failure	curl/8.21.0
171c8824-5c7a-4e08-874b-2b21f77ac3ff	\N	create	Razorpay Order	\N	{"appointmentId": "00000000-0000-0000-0000-000000000000"}	::ffff:172.21.0.1	f	2026-08-23 11:08:23.27	failure	curl/8.21.0
fe3c60c7-3ffd-4b1e-bca6-f6141f4684c8	\N	create	Razorpay Order	\N	{"appointmentId": "00000000-0000-0000-0000-000000000000"}	::ffff:172.21.0.1	f	2026-08-23 11:08:24.059	failure	curl/8.21.0
a2649f76-8c2e-4f30-b504-1c9a6d2ecd20	\N	create	Razorpay Order	\N	{"appointmentId": "00000000-0000-0000-0000-000000000000"}	::ffff:172.21.0.1	f	2026-08-23 11:08:24.824	failure	curl/8.21.0
2ff8f983-2172-42a1-951a-41d6a5f0ea69	\N	create	Razorpay Order	\N	{"appointmentId": "00000000-0000-0000-0000-000000000000"}	::ffff:172.21.0.1	f	2026-08-23 11:08:25.775	failure	curl/8.21.0
b84b57be-9686-450a-9f92-607082f8cf38	\N	create	Razorpay Order	\N	{"appointmentId": "00000000-0000-0000-0000-000000000000"}	::ffff:172.21.0.1	f	2026-08-23 11:08:26.647	failure	curl/8.21.0
d0b17bd8-fa57-49e3-93c7-b68274953836	\N	create	Razorpay Order	\N	{"appointmentId": "00000000-0000-0000-0000-000000000000"}	::ffff:172.21.0.1	f	2026-08-23 11:08:27.427	failure	curl/8.21.0
ad595a71-d674-46a5-b543-1febf31c74da	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 11:29:53.588	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
64dab02e-4e5f-43d5-b2ad-b5f9cb8e47f7	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 11:30:25.713	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
3cc9219b-9a54-4db8-a04f-aad83d9a5c6e	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 11:31:20.946	success	curl/8.21.0
34f6e6ac-c3f5-4811-b0e6-1c607b4bdb9d	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 11:32:05.193	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
ec0b960c-491b-4d13-8ff6-2dca4d066196	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 11:32:54.305	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
34b056da-94bf-40a8-b614-87e17613cc3c	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 11:33:07.311	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
835bb37c-9fb7-4454-bf92-6db3aedc9d6d	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 11:45:44.935	success	curl/8.21.0
5bcb45bf-e9da-4ba5-835f-1e4a78175928	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 11:47:59.56	success	curl/8.21.0
ab4d124d-7594-441c-b63d-c034058ad47a	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 11:48:21.689	success	curl/8.21.0
8b7895fb-0dfe-4b89-b9fe-11d50c26ffe3	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 12:05:26.795	success	curl/8.21.0
0daef4b0-4905-4d76-9298-dc0e2f0456ea	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 12:05:39.339	success	curl/8.21.0
6c6189dc-6081-4ba5-bcd1-3b4a36a7ba19	\N	login	login	\N	{"input": {"email": "admin@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 12:05:51.316	success	curl/8.21.0
af2d6809-cb6e-4b59-a5f4-b589416aa16a	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 12:27:15.607	success	curl/8.21.0
19315207-d2fa-4955-af6b-9931021cae71	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 12:30:47.092	success	curl/8.21.0
e5cf43df-3117-4f14-8db6-7a4b874a556c	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 20:34:45.525	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
645e1e27-c549-45a7-b014-c127dcee9b9e	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 20:36:37.349	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
04d51f10-876f-4147-8ac7-20ce1977edb8	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 20:38:16.065	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
e3bb14c6-1282-4888-9032-18a3ef61c3c4	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 20:39:25.272	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
01c4329e-f850-4772-9ea3-879689106a3b	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 20:41:01.268	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
eee3d5fb-23e9-4f7a-a607-8037b2c93976	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 20:41:44.944	success	curl/8.21.0
0121fd38-0606-4b2e-9485-5f7f7514da14	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 20:42:54.602	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
702d0665-47b7-43ef-9ae8-b592f5faec4f	\N	login	login	\N	{"input": {"email": "clinician@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 21:41:58.081	failure	curl/8.21.0
6ffcaa83-8af0-42ba-9cf1-3fbf53824e48	\N	login	login	\N	{"input": {"email": "clinician@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 21:42:10.991	success	curl/8.21.0
3d03949c-1119-4f83-ad62-23fc8702dd28	\N	login	login	\N	{"input": {"email": "admin@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 21:42:39.594	success	curl/8.21.0
61c48e47-1f91-4aed-b9cb-7100e2c3c5d8	\N	login	login	\N	{"input": {"email": "clinician@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 21:50:03.046	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
b889a397-6470-4e4b-bb4c-52a267e98f8d	\N	login	login	\N	{"input": {"email": "clinician@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 21:51:31.782	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
aaff594c-c313-4977-82f0-ab15e89c2a7f	\N	login	login	\N	{"input": {"email": "clinician@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 21:52:34.051	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
e68e765a-9e82-47e5-b7da-9b21a3a81ab0	\N	login	login	\N	{"input": {"email": "clinician@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 21:55:17.525	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
2c1b0755-5c17-4c07-aba9-c3efffe8b36a	\N	login	login	\N	{"input": {"email": "admin@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 21:55:44.626	success	curl/8.21.0
e08742da-7dd8-4905-827d-1f5a96effb61	\N	login	login	\N	{"input": {"email": "clinician@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 21:56:58.542	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
4a870159-ed5e-404c-970f-37c945b9a9e2	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 22:08:19.233	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
637fc9ad-0be1-4f67-90d9-8719a0a15fcf	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 22:08:57.253	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
04b06f6d-5cb5-4043-969f-4b33057fe903	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 22:09:42.131	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
30afc0b3-3a19-4dd1-ba3e-56cd663be615	\N	login	login	\N	{"input": {"email": "clinician@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 22:09:58.901	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
b0c46459-92b0-49b4-9504-17fe4be0409a	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 22:12:09.081	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
751db061-f1de-4112-b45a-9b1d7d436e9f	\N	login	login	\N	{"input": {"email": "clinician@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 22:12:23.288	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
adf3700e-36af-459e-8fc9-adfcb73e527e	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 22:16:04.793	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
40a1e4f5-73a7-4bab-89ef-3f75fa6d91a8	\N	login	login	\N	{"input": {"email": "clinician@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 22:16:19.563	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
f25a3f88-d572-4d49-9bfb-037ad9511715	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 22:17:44.266	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
a8e6d116-bf1f-4372-bc24-eb3f8292d428	\N	login	login	\N	{"input": {"email": "clinician@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 22:17:58.236	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
e1e816b7-fa82-4649-9239-1efe2b2a87f4	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 22:20:35.998	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
5a53be8e-c626-4a14-b15b-e3402e859ba7	\N	login	login	\N	{"input": {"email": "clinician@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 22:20:49.966	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
5094dc7b-1cb0-4db2-a67f-44a42ca31fed	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 22:21:48.174	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
c0c0d311-1417-4ef1-b7d6-bf02c7f99923	\N	login	login	\N	{"input": {"email": "clinician@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 22:22:02.662	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
c34ccc30-b6fd-4f3d-9d5a-77fb5712255c	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 22:22:57.25	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
968d2735-0238-4998-99f7-e8ac9a10e5b2	\N	login	login	\N	{"input": {"email": "clinician@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 22:23:11.196	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
fab56fbf-8cc2-44db-ac0f-e2ea3934fda7	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 23:08:43.722	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
f871440a-9bcc-448e-86d1-13a0db938f74	\N	login	login	\N	{"input": {"email": "clinician@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 23:09:00.575	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
1977507e-eb06-4ead-b062-04d90d6856e7	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 23:10:23.464	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
ea88ef0e-36ae-444f-bab3-5478bc4d1b1f	\N	login	login	\N	{"input": {"email": "clinician@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 23:10:43.771	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
8132b6b8-3e36-4406-9bb2-5766df96b1fe	\N	login	login	\N	{"input": {"email": "clinician@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 23:13:09.279	success	curl/8.21.0
c679fd8e-b9d8-487a-b81b-54730d6b52b2	\N	login	login	\N	{"input": {"email": "clinician@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 23:13:20.96	success	curl/8.21.0
15276e5b-948d-4598-8db2-e73d1c4701c7	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 23:14:31.469	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
80e1cf3d-f7f1-4dfb-acc0-f3b7cb833b0a	\N	login	login	\N	{"input": {"email": "clinician@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 23:14:51.444	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
15573abc-0be9-44ab-9de6-336411b3f76a	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 23:16:13.839	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
75047cf8-5a69-4040-9706-286dfda5cad6	\N	login	login	\N	{"input": {"email": "clinician@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 23:16:27.899	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
95a7c98a-66d4-4129-b223-ade9b9ef17b4	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 23:17:46.454	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
3e580e9e-26f7-4a64-a362-75929757b550	\N	login	login	\N	{"input": {"email": "clinician@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 23:18:00.45	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
314501a4-8005-46d6-b518-da31a7a24262	\N	login	login	\N	{"input": {"email": "clinician@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 23:18:44.547	success	curl/8.21.0
6d073032-02f6-42b5-aa09-43b2fd245f63	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 23:22:59.353	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
315157f7-7f91-42ba-8cf2-8506a64d7a75	\N	login	login	\N	{"input": {"email": "clinician@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 23:23:13.689	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
566ec25c-9899-495f-9ede-37ff68103309	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 23:31:49.71	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
e92612c9-e854-4891-abb0-78572cd28a8f	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 23:33:47.481	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
358fb326-5652-45f9-9963-8dcfb175f177	\N	login	login	\N	{"input": {"email": "clinician@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 23:34:04.44	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
b1866118-7714-42da-aa60-baeac5d5c13c	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 23:36:53.186	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
c3e87664-0c38-4dfd-ab2a-51697e9bd7f2	\N	login	login	\N	{"input": {"email": "clinician@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 23:37:07.348	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
efb708b3-6808-4f0c-b4c4-99fdc0ae244f	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 23:39:57.049	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
e7a4b37f-5fd3-4391-bdf0-dd0ee1b85a1c	\N	login	login	\N	{"input": {"email": "clinician@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 23:40:12.546	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
2437c102-4719-4c1f-9895-1dcb47735802	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 23:50:24.626	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
2d0b3556-295f-4b4b-9b9f-79e050317a27	\N	login	login	\N	{"input": {"email": "clinician@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 23:50:41.88	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
cc448627-2efd-482e-9aea-325286c77545	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 23:52:44.983	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
86b28fc3-3b72-4077-9215-0e29bbbaee41	\N	login	login	\N	{"input": {"email": "clinician@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-23 23:52:59.354	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
5b651f05-3017-45a2-aa0b-bf8f08ddeffe	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-24 00:33:11.64	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
be1837d2-0585-4f40-beee-15fdd46542e1	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-24 00:33:55.524	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
0076f63d-af2c-4f7b-908f-7796328c1480	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-24 00:35:33.325	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
56f83c85-d4de-4990-88ef-fc2d90457d24	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-24 00:35:53.532	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
76b7c87d-205b-4f8d-964f-c5f7bd9bf50d	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-24 01:19:41.907	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
11d92396-86e7-4c26-9315-28c79fbdcb40	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-24 01:20:23.855	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
164b409d-055e-4676-9c74-674f8a5981ba	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-24 01:21:27.093	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
671206e3-bc60-4782-a7e8-0316b02711bd	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-24 01:21:40.811	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
0407561f-9356-49bd-bc94-024b4922a55e	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-24 01:22:46.393	success	curl/8.21.0
5195780d-224e-4491-a73c-6c68f1366f59	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-24 01:29:16.004	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
72d205d6-814d-47f9-bc55-f59fc7204795	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-24 01:29:29.85	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
32c0d454-7e1c-467b-9f52-fb80cd448f1c	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-24 01:29:43.72	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
8854449c-32dd-487a-a4cb-d43a117f31f8	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-24 01:32:15.848	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
54e06379-9e17-4c7f-a1e1-f569a9a8851f	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-24 01:32:29.663	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
155d907b-3564-4a14-95df-afd947615ab9	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-24 01:32:43.586	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
beefea46-d4f2-4a82-b2b0-6b1aefb11f87	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-24 01:34:53.551	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
f0389140-c43e-45f3-8e55-1bf6efefab43	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-24 01:35:07.808	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
ae1a70a1-ff0f-4f0b-b5da-c46a80d6b3d1	\N	login	login	\N	{"input": {"email": "manager@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-24 01:35:21.645	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
6727e460-2237-45f7-90dd-1c23bfeaac6f	\N	login	login	\N	{"input": {"email": "patient@medibook.dev", "password": "[REDACTED]"}}	::ffff:172.21.0.1	f	2026-08-24 01:35:36.528	success	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36
\.


--
-- Data for Name: ClientOrganizations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ClientOrganizations" (id, name, code, contact_email, contact_phone, address, is_active, is_deleted, settings, owner_user_id, onboarding_status, onboarding_step, trial_ends_at, onboarded_at, created_at, updated_at, address_structured, email_from_name, email_from_address, email_reply_to, email_include_branding, no_show_fee_paise, slot_buffer_minutes, max_reschedules_per_month, data_retention_years, mfa_required, session_timeout_minutes, audit_log_enabled, patient_data_export_enabled, ip_whitelist_enabled, ip_whitelist, logo_url, primary_color, secondary_color) FROM stdin;
3efd3018-9760-4d10-92c0-86981799240b	City Heart Clinic Group	city-heart	ops@cityheart.dev	+919876500000	\N	t	f	{}	\N	completed	\N	\N	\N	2026-08-17 01:07:52.622	2026-08-17 01:07:52.622	{"city": "Bengaluru", "line1": "12 MG Road", "state": "Karnataka", "country": "India", "pincode": "560001"}	HealthSync	\N	\N	t	8500	10	3	7	f	\N	f	f	f		/uploads/branding/3efd3018-9760-4d10-92c0-86981799240b-c5011f93-16bf-4074-a4ab-c709a4ad2576.png	#006D77	#007680
52ed2599-05eb-4968-82ea-d5e270f8533e	E2E Test Org Renamed	e2e-test-org	e2e@test.dev	\N	\N	f	t	{}	\N	completed	\N	\N	\N	2026-08-22 02:46:15.947	2026-08-22 02:46:15.947	\N	HealthSync	\N	\N	t	8500	10	3	7	f	\N	f	f	f	\N	\N	#006D77	#007680
5a570582-f24c-4ffb-8582-0ef9688b7d10	Westside Health Group	westside-health	ops@westsidehealth.dev	+919812345678	\N	t	f	{}	\N	completed	\N	\N	\N	2026-08-17 01:39:17.899	2026-08-17 01:39:17.899	{"city": "Pune", "line1": "45 FC Road", "line2": "", "state": "Maharashtra", "country": "India", "pincode": "411005"}	HealthSync	\N	\N	t	8500	10	3	7	f	\N	f	f	f	\N	\N	#006D77	#007680
\.


--
-- Data for Name: ClinicianAvailability; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ClinicianAvailability" (id, clinician_id, clinic_id, day_of_week, start_time, end_time, recurrence_type, custom_dates, exclude_weekends, exclude_saturday, exclude_sunday, excluded_days, valid_from, valid_until, is_active, is_deleted, created_at, updated_at, room_id, mode, capacity, overbook_allowance, walkin_ratio) FROM stdin;
6975944b-813f-422c-9dbb-67be37ec95bc	8e9ed6bf-daf0-49cb-84f3-82c8c4ba80e7	7307c9d9-8a74-4305-8933-7b0a73c1486d	1	09:00	17:00	weekly	\N	f	f	f	\N	2026-08-17 08:16:38.382	\N	t	f	2026-08-17 08:16:38.419	2026-08-17 08:16:38.419	\N	slot	\N	0	\N
2f402f41-771a-4216-bff3-e647dabc4349	8e9ed6bf-daf0-49cb-84f3-82c8c4ba80e7	7307c9d9-8a74-4305-8933-7b0a73c1486d	2	10:00	16:00	weekly	\N	f	f	f	\N	2026-08-17 08:16:38.936	\N	t	f	2026-08-17 08:16:38.94	2026-08-17 08:16:38.94	\N	slot	\N	0	\N
3cba1152-0a37-4b68-b6df-1702d8e7664f	8e9ed6bf-daf0-49cb-84f3-82c8c4ba80e7	7307c9d9-8a74-4305-8933-7b0a73c1486d	3	11:00	13:00	weekly	\N	f	f	f	\N	2026-08-18 18:28:43.556	\N	t	t	2026-08-18 18:28:43.562	2026-08-18 18:28:53.122	\N	slot	\N	0	\N
39e1740f-e6f8-45b5-bb24-d0aa74297a34	8e9ed6bf-daf0-49cb-84f3-82c8c4ba80e7	7307c9d9-8a74-4305-8933-7b0a73c1486d	3	07:00	07:45	weekly	\N	f	f	f	\N	2026-08-22 01:55:47.752	\N	t	t	2026-08-22 01:55:47.754	2026-08-22 01:56:17.584	\N	slot	\N	0	\N
bb90a11b-c8e6-43a3-817c-a1d57621c043	8e9ed6bf-daf0-49cb-84f3-82c8c4ba80e7	7307c9d9-8a74-4305-8933-7b0a73c1486d	3	07:00	07:45	weekly	\N	f	f	f	\N	2026-08-22 01:57:31.601	\N	t	t	2026-08-22 01:57:31.602	2026-08-22 01:58:03.048	\N	slot	\N	0	\N
db476bcf-5b63-41ab-a471-1528651ffa90	8e9ed6bf-daf0-49cb-84f3-82c8c4ba80e7	7307c9d9-8a74-4305-8933-7b0a73c1486d	3	07:00	07:45	weekly	\N	f	f	f	\N	2026-08-22 21:24:03.869	\N	t	t	2026-08-22 21:24:03.87	2026-08-22 21:24:03.87	\N	slot	\N	0	\N
45f8b97b-bb3c-4043-8493-d6199d7c89e3	8e9ed6bf-daf0-49cb-84f3-82c8c4ba80e7	7307c9d9-8a74-4305-8933-7b0a73c1486d	3	07:00	07:45	weekly	\N	f	f	f	\N	2026-08-22 21:28:18.158	\N	t	t	2026-08-22 21:28:18.159	2026-08-22 21:28:36.365	\N	slot	\N	0	\N
30113b4d-9a07-41c1-baf0-fdf01029b456	8e9ed6bf-daf0-49cb-84f3-82c8c4ba80e7	7307c9d9-8a74-4305-8933-7b0a73c1486d	3	07:00	07:45	weekly	\N	f	f	f	\N	2026-08-22 21:30:02.285	\N	t	t	2026-08-22 21:30:02.286	2026-08-22 21:30:30.992	\N	slot	\N	0	\N
019af7ca-24a9-4651-9076-556690167e3e	8e9ed6bf-daf0-49cb-84f3-82c8c4ba80e7	7307c9d9-8a74-4305-8933-7b0a73c1486d	0	09:00	17:00	weekly	\N	f	f	f	\N	2026-08-22 21:40:39.505	\N	t	f	2026-08-22 21:40:39.505	2026-08-22 21:40:39.505	\N	slot	\N	0	\N
10845b0a-e936-4dc6-90d7-a5802a8cd81a	8e9ed6bf-daf0-49cb-84f3-82c8c4ba80e7	7307c9d9-8a74-4305-8933-7b0a73c1486d	3	09:00	17:00	weekly	\N	f	f	f	\N	2026-08-22 21:40:39.505	\N	t	f	2026-08-22 21:40:39.505	2026-08-22 21:40:39.505	\N	slot	\N	0	\N
b7527eb1-b727-48cd-a798-88b788c783ea	8e9ed6bf-daf0-49cb-84f3-82c8c4ba80e7	7307c9d9-8a74-4305-8933-7b0a73c1486d	4	09:00	17:00	weekly	\N	f	f	f	\N	2026-08-22 21:40:39.505	\N	t	f	2026-08-22 21:40:39.505	2026-08-22 21:40:39.505	\N	slot	\N	0	\N
98500d96-2b36-4a12-b73d-c63088394ea7	8e9ed6bf-daf0-49cb-84f3-82c8c4ba80e7	7307c9d9-8a74-4305-8933-7b0a73c1486d	5	09:00	17:00	weekly	\N	f	f	f	\N	2026-08-22 21:40:39.505	\N	t	f	2026-08-22 21:40:39.505	2026-08-22 21:40:39.505	\N	slot	\N	0	\N
28b89987-2277-4d24-a6a5-d685c42bfb79	8e9ed6bf-daf0-49cb-84f3-82c8c4ba80e7	7307c9d9-8a74-4305-8933-7b0a73c1486d	6	09:00	17:00	weekly	\N	f	f	f	\N	2026-08-22 21:40:39.505	\N	t	f	2026-08-22 21:40:39.505	2026-08-22 21:40:39.505	\N	slot	\N	0	\N
721a2400-0f98-4108-bf47-473e70717ad2	8e9ed6bf-daf0-49cb-84f3-82c8c4ba80e7	7307c9d9-8a74-4305-8933-7b0a73c1486d	\N	20:00	22:00	daily	\N	f	f	f	\N	2026-08-23 00:00:00	\N	t	t	2026-08-23 20:39:34.061	2026-08-23 20:39:42.89	\N	session	99	0	\N
809c9cf3-3293-4e4d-b423-eadc82db9bd4	8e9ed6bf-daf0-49cb-84f3-82c8c4ba80e7	7307c9d9-8a74-4305-8933-7b0a73c1486d	\N	20:00	22:00	daily	\N	f	f	f	\N	2026-08-23 00:00:00	\N	t	t	2026-08-23 20:41:10.134	2026-08-23 20:41:18.664	\N	session	99	0	\N
294191fb-ef70-4caf-90d7-2733362f2895	8e9ed6bf-daf0-49cb-84f3-82c8c4ba80e7	7307c9d9-8a74-4305-8933-7b0a73c1486d	\N	20:00	22:00	daily	\N	f	f	f	\N	2026-08-23 00:00:00	\N	t	t	2026-08-23 20:38:24.662	2026-08-23 20:41:19.916	\N	session	99	0	\N
63eb2a25-fbc7-4ce2-af35-a18d629a7dc8	8e9ed6bf-daf0-49cb-84f3-82c8c4ba80e7	7307c9d9-8a74-4305-8933-7b0a73c1486d	\N	20:00	22:00	daily	\N	f	f	f	\N	2026-08-23 00:00:00	\N	t	t	2026-08-23 20:36:47.06	2026-08-23 20:42:03.275	\N	session	99	0	\N
2b3a1fab-fff6-4d75-ba55-50fb45ed0fd5	8e9ed6bf-daf0-49cb-84f3-82c8c4ba80e7	7307c9d9-8a74-4305-8933-7b0a73c1486d	\N	20:00	22:00	daily	\N	f	f	f	\N	2026-08-23 00:00:00	\N	t	t	2026-08-23 20:43:05.097	2026-08-23 20:43:14.235	\N	session	99	0	\N
\.


--
-- Data for Name: ClinicianLanguages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ClinicianLanguages" (id, clinician_id, language_id, is_deleted, created_at) FROM stdin;
850b0b12-0553-41a3-845a-419b433fedfe	8e9ed6bf-daf0-49cb-84f3-82c8c4ba80e7	fe80654b-3e3c-4554-9d47-3937285abff4	f	2026-08-17 07:18:18.682
7e370b1c-63dc-4c13-b7dc-d9bd14a028a3	8e9ed6bf-daf0-49cb-84f3-82c8c4ba80e7	04bc2a90-d397-4a76-8abf-010bccb742ce	f	2026-08-17 07:18:18.682
\.


--
-- Data for Name: ClinicianServices; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ClinicianServices" (id, clinician_id, product_id, is_deleted, created_at) FROM stdin;
686651d9-0eb5-47d0-9276-4b5a14689c9e	8e9ed6bf-daf0-49cb-84f3-82c8c4ba80e7	caa89f8e-26bd-4325-9f16-df5dd7eb994e	f	2026-08-17 07:18:18.698
\.


--
-- Data for Name: Clinicians; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Clinicians" (id, clinic_id, first_name, last_name, clinician_type, gender, email, phone, is_active, is_deleted, created_at, bio, avatar_url, consultation_fee, registration_number, qualifications) FROM stdin;
8e9ed6bf-daf0-49cb-84f3-82c8c4ba80e7	7307c9d9-8a74-4305-8933-7b0a73c1486d	Sarah	Mitchell	General Physician	female	sarah.mitchell@medibook.dev	+919876000001	t	f	2026-08-17 07:18:18.667	Experienced GP	\N	80000	\N	\N
0d35044e-5fb7-4361-b808-f02776745ab8	7307c9d9-8a74-4305-8933-7b0a73c1486d	E2E	TestClinician		\N	e2e-clinician-1787358270602@medibook.dev		t	f	2026-08-22 00:24:35.438	\N	\N	\N	\N	\N
0c963a14-0520-46ae-a84a-bd0a8ce5334c	7307c9d9-8a74-4305-8933-7b0a73c1486d	E2E	TestClinician		\N	e2e-clinician-1787358530591@medibook.dev		t	f	2026-08-22 00:28:55.376	\N	\N	\N	\N	\N
ad46af53-6326-4659-82f9-7eb41481840f	7307c9d9-8a74-4305-8933-7b0a73c1486d	E2E	TestClinician		\N	e2e-clinician-1787358690061@medibook.dev		t	f	2026-08-22 00:31:34.988	\N	\N	\N	\N	\N
d0e328f8-f660-4d8f-9424-000f8b8c9655	7307c9d9-8a74-4305-8933-7b0a73c1486d	E2E	TestClinician		\N	e2e-clinician-1787358860254@medibook.dev		t	f	2026-08-22 00:34:25.445	\N	\N	\N	\N	\N
76877e4e-04f0-45ed-af1e-04d1352964fa	7307c9d9-8a74-4305-8933-7b0a73c1486d	E2E	TestClinician		\N	e2e-clinician-1787359351611@medibook.dev		t	f	2026-08-22 00:42:36.947	\N	\N	\N	\N	\N
48a9d92e-330a-468f-b143-cb1f13cd5438	7307c9d9-8a74-4305-8933-7b0a73c1486d	E2E	TestClinician		\N	e2e-clinician-1787364012390@medibook.dev		t	f	2026-08-22 02:00:17.475	\N	\N	\N	\N	\N
f5d8f6ea-4301-4089-82f1-d0e3a7e2fbc3	7307c9d9-8a74-4305-8933-7b0a73c1486d	E2E	TestClinician		\N	e2e-clinician-1787364286377@medibook.dev		t	f	2026-08-22 02:04:50.94	\N	\N	\N	\N	\N
d41f0552-676e-4357-8daf-003ed6f99ed4	7307c9d9-8a74-4305-8933-7b0a73c1486d	E2E	TestClinician		\N	e2e-clinician-1787433758970@medibook.dev		t	f	2026-08-22 21:22:40.896	\N	\N	\N	\N	\N
8c2fb2d9-1a75-44db-b386-46011f0f6075	7307c9d9-8a74-4305-8933-7b0a73c1486d	E2E	TestClinician		\N	e2e-clinician-1787435240402@medibook.dev		t	f	2026-08-22 21:47:22.341	\N	\N	\N	\N	\N
\.


--
-- Data for Name: Clinics; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Clinics" (id, name, address, phone, email, is_primary, is_active, is_deleted, created_at, client_org_id, city, postcode, timezone) FROM stdin;
4de70a6c-f0cb-4f07-9f97-589981c24b0e	Koramangala Health Center	77 80 Feet Road	+919876500001	koramangala@medibook.dev	f	t	f	2026-08-17 01:36:43.601	3efd3018-9760-4d10-92c0-86981799240b	Bengaluru	560095	Europe/London
8521af4b-a3ac-4a59-a6ac-e740d33407da	Westside FC Road Clinic	45 FC Road	+919812345679	fcroad@westsidehealth.dev	f	t	f	2026-08-18 22:22:16.198	5a570582-f24c-4ffb-8582-0ef9688b7d10	Pune	411005	Asia/Kolkata
7307c9d9-8a74-4305-8933-7b0a73c1486d	MG Road Clinic	12 MG Road	+919876543210	mgroad@medibook.dev	f	t	f	2026-08-17 00:49:06.617	3efd3018-9760-4d10-92c0-86981799240b	Bengaluru	560001	Asia/Kolkata
036642e7-caf3-4387-a24f-9b34fe42b8a4	Admin Test Clinic	1 Test Rd	+919999999999	admintest@medibook.dev	f	t	f	2026-08-17 00:59:39.25	3efd3018-9760-4d10-92c0-86981799240b	\N	\N	Asia/Kolkata
\.


--
-- Data for Name: Diagnoses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Diagnoses" (id, encounter_id, type, icd10_code, text, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: Drugs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Drugs" (id, client_org_id, name, composition, strength, form, schedule_class, hsn, gst_rate, manufacturer, is_deleted, created_at, updated_at) FROM stdin;
41a4776d-157c-4f2d-a02f-b74e604953f8	\N	Paracetamol	Paracetamol	500mg	Tablet	OTC	30049099	12	Generic	f	2026-08-23 12:01:06.271	2026-08-23 12:01:06.271
e38d2b9c-ac05-4d0d-b612-779ed2f1e630	\N	Amoxicillin	Amoxicillin	500mg	Capsule	H	30041020	12	Generic	f	2026-08-23 12:01:06.282	2026-08-23 12:01:06.282
d6c3d5bc-da45-4435-ba37-3ccf5356774f	\N	Metformin	Metformin Hydrochloride	500mg	Tablet	H	30049099	12	Generic	f	2026-08-23 12:01:06.29	2026-08-23 12:01:06.29
c59890ff-7563-486b-a77f-7073a6bab48b	\N	Amlodipine	Amlodipine Besylate	5mg	Tablet	H	30049099	12	Generic	f	2026-08-23 12:01:06.297	2026-08-23 12:01:06.297
30faf5c2-bf83-42a7-b7dc-378ca38d337d	\N	Cetirizine	Cetirizine Hydrochloride	10mg	Tablet	OTC	30049099	12	Generic	f	2026-08-23 12:01:06.303	2026-08-23 12:01:06.303
2094cd9c-6639-48a8-8d34-43d2af4adfc4	\N	Azithromycin	Azithromycin	500mg	Tablet	H1	30041020	12	Generic	f	2026-08-23 12:01:06.309	2026-08-23 12:01:06.309
\.


--
-- Data for Name: EmailTemplates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EmailTemplates" (id, name, template_type, subject, body, is_active, is_deleted, created_at, updated_at, variables) FROM stdin;
6a11f6e8-62aa-4415-80e6-65b70ec11012	Appointment Reminder	appointment_reminder	Reminder: Your appointment tomorrow — {{patient_name}}	Dear {{patient_name}},\n\nThis is a reminder that you have an appointment tomorrow with {{clinician_name}} at {{time}}.\n\nThank you,\nHealthSync Team	t	f	2026-08-17 07:16:34.343	2026-08-17 07:16:34.343	{patient_name,clinician_name,time}
6a075db1-01f7-4e6c-875a-e2ae324edc9c	Password Reset	password_reset	Reset your HealthSync password	Hi {{name}},\n\nClick the link below to reset your password:\n{{reset_link}}\n\nThis link expires in 1 hour.\n\nHealthSync Team	t	f	2026-08-17 07:16:34.384	2026-08-17 07:16:34.384	{name,reset_link}
0b03246a-8d8c-4441-a2cb-cb007981d38c	Welcome Email	welcome	Welcome aboard, {{name}}!	Hi {{name}}, login at {{login_url}}	t	f	2026-08-17 07:16:34.412	2026-08-17 07:16:34.412	{name,login_url}
f72b0812-36da-40a8-8d66-684d3eccaf73	Appointment Cancellation	appointment_cancellation	Appointment Cancelled — {{patient_name}}	Dear {{patient_name}},\n\nYour appointment on {{date}} has been cancelled.\n\nTo reschedule, please visit our website.\n\nHealthSync Team	t	f	2026-08-17 07:16:34.357	2026-08-17 07:16:34.357	{patient_name,date}
cf2fb7cf-8c99-494b-b84f-38c7d5b3fd78	Appointment Confirmation	appointment_confirmation	Your appointment is confirmed — {{patient_name}}	Dear {{patient_name}},\n\nYour appointment with {{clinician_name}} on {{date}} at {{time}} has been confirmed.\n\nLocation: {{clinic_name}}\n\nThank you,\nHealthSync Team	t	f	2026-08-17 07:16:34.328	2026-08-17 07:16:34.328	{patient_name,clinician_name,date,time,clinic_name}
\.


--
-- Data for Name: EncounterAddenda; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EncounterAddenda" (id, encounter_id, author_id, content, reason, created_at) FROM stdin;
65170f2e-ac6f-406a-a3e8-4c01f29b75ab	625bf109-8efb-4553-8461-b3af6fb7f373	3939263b-2272-437b-9010-bc1f72af8d05	E2E addendum 1787522027498	\N	2026-08-23 21:53:47.726
\.


--
-- Data for Name: EncounterNotes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EncounterNotes" (id, encounter_id, section, content, version, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: EncounterTemplates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EncounterTemplates" (id, client_org_id, clinician_id, specialty, name, sections_json, created_at) FROM stdin;
\.


--
-- Data for Name: Encounters; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Encounters" (id, client_org_id, appointment_id, patient_id, clinician_id, status, locked, signed_at, signed_by_id, created_at, updated_at) FROM stdin;
625bf109-8efb-4553-8461-b3af6fb7f373	3efd3018-9760-4d10-92c0-86981799240b	9798af17-ee7e-45cc-b4e2-254825fdba4d	f8a33736-0ad4-4df8-a854-344cd567010c	8e9ed6bf-daf0-49cb-84f3-82c8c4ba80e7	signed	t	2026-08-23 21:53:45.693	3939263b-2272-437b-9010-bc1f72af8d05	2026-08-23 21:53:33.602	2026-08-23 21:53:45.694
\.


--
-- Data for Name: InvoiceSequences; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."InvoiceSequences" (id, clinic_id, series, financial_year, last_number, updated_at) FROM stdin;
\.


--
-- Data for Name: Languages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Languages" (id, name, code, is_active, is_deleted, created_at, is_default) FROM stdin;
fe80654b-3e3c-4554-9d47-3937285abff4	English	en	t	f	2026-08-17 07:14:45.394	f
04bc2a90-d397-4a76-8abf-010bccb742ce	Hindi	hi	t	f	2026-08-17 07:14:45.591	t
5564bb3a-8032-47b4-b845-13f2f9ba34a6	E2E Test Lang 1787120691153	e2	f	t	2026-08-19 06:24:54.44	f
11080be4-139a-4333-a91b-484070eda4bc	E2E Test Lang 1787134184949	e2e1787134184949	f	t	2026-08-19 10:09:46.206	f
dc1e5d87-60bf-4ba4-8978-492b4f8bddc0	E2E Test Lang 1787134232457	e2e1787134232457	f	t	2026-08-19 10:10:33.542	f
1416c4f2-7f88-4a9b-b5e5-2f0c22c4f68a	E2E Test Lang 1787166185382	e2e1787166185382	f	t	2026-08-19 19:03:06.808	f
dab6b0bd-294c-48c8-b8fa-c739b1fd3583	E2E Test Lang 1787169305514	e2e1787169305514	f	t	2026-08-19 19:55:06.73	f
9a4fb71a-f241-4d22-981f-54ee0f3f7b03	E2E Test Lang 1787170763612	e2e1787170763612	f	t	2026-08-19 20:19:24.626	f
03789e31-d919-46d4-8e0b-cd6dcf4ef97e	E2E Test Lang 1787171745917	e2e1787171745917	f	t	2026-08-19 20:35:47.321	f
015f6667-9265-4804-a8ec-c00b0382d964	E2E Test Lang 1787210603852	e2e1787210603852	f	t	2026-08-20 07:23:25.405	f
18392519-11db-49f7-b40a-ea4c4f8a0e79	E2E Test Lang 1787212199373	e2e1787212199373	f	t	2026-08-20 07:50:00.575	f
\.


--
-- Data for Name: LunchBreaks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."LunchBreaks" (id, clinician_id, clinic_id, day_of_week, start_time, end_time, is_recurring, specific_date, is_deleted, created_at, recurrence_type, recurrence_days, end_date) FROM stdin;
7b6b4be7-a362-4d3e-afb7-f2054f5b209e	8e9ed6bf-daf0-49cb-84f3-82c8c4ba80e7	7307c9d9-8a74-4305-8933-7b0a73c1486d	\N	1970-01-01 13:00:00	1970-01-01 14:00:00	t	\N	f	2026-08-17 08:16:39.101	daily	\N	\N
a79648be-7778-4b7f-9d5c-87cc920e5227	8e9ed6bf-daf0-49cb-84f3-82c8c4ba80e7	7307c9d9-8a74-4305-8933-7b0a73c1486d	4	1970-01-01 15:15:00	1970-01-01 15:30:00	t	\N	t	2026-08-22 01:55:47.832	weekly	\N	\N
2ca85c5c-8fb5-49ae-87e6-0ca64cf7b12a	8e9ed6bf-daf0-49cb-84f3-82c8c4ba80e7	7307c9d9-8a74-4305-8933-7b0a73c1486d	4	1970-01-01 15:15:00	1970-01-01 15:30:00	t	\N	t	2026-08-22 01:57:31.667	weekly	\N	\N
71e6d2ec-08cf-4427-8927-462876feaaa8	8e9ed6bf-daf0-49cb-84f3-82c8c4ba80e7	7307c9d9-8a74-4305-8933-7b0a73c1486d	4	1970-01-01 15:15:00	1970-01-01 15:30:00	t	\N	t	2026-08-22 21:24:03.904	weekly	\N	\N
6f70865c-e9fc-4302-a85e-8d42a0578d67	8e9ed6bf-daf0-49cb-84f3-82c8c4ba80e7	7307c9d9-8a74-4305-8933-7b0a73c1486d	4	1970-01-01 15:15:00	1970-01-01 15:30:00	t	\N	t	2026-08-22 21:28:18.236	weekly	\N	\N
a5b38758-603f-4ce3-a35f-b5bc6637d9d9	8e9ed6bf-daf0-49cb-84f3-82c8c4ba80e7	7307c9d9-8a74-4305-8933-7b0a73c1486d	4	1970-01-01 15:15:00	1970-01-01 15:30:00	t	\N	t	2026-08-22 21:30:02.314	weekly	\N	\N
\.


--
-- Data for Name: MessageParticipants; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MessageParticipants" (id, thread_id, user_id, unread_count) FROM stdin;
52404881-1b36-4172-b5b5-938248d2d98f	eab1a2c8-c51b-4bd9-a4a4-83e2236d009e	7d3f3ade-b82a-4383-859e-31d8a42c4a01	0
9a51164e-1603-465d-8192-03be1993fe98	eab1a2c8-c51b-4bd9-a4a4-83e2236d009e	3939263b-2272-437b-9010-bc1f72af8d05	1
80585ef7-327a-4418-a54b-31f3e093305e	432cb9cb-599b-4188-b725-7f9320cf4127	7d3f3ade-b82a-4383-859e-31d8a42c4a01	1
bc162d87-1808-41e3-8186-73d99a388734	432cb9cb-599b-4188-b725-7f9320cf4127	d764ff7a-de6a-484e-a374-c2d8575d15c3	9
\.


--
-- Data for Name: MessageThreads; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MessageThreads" (id, client_org_id, last_message, last_activity, created_at, assigned_to_user_id, sla_due_at) FROM stdin;
432cb9cb-599b-4188-b725-7f9320cf4127	3efd3018-9760-4d10-92c0-86981799240b	e2e message 1787212868332	2026-08-20 08:01:09.004	2026-08-17 08:33:58.789	\N	\N
eab1a2c8-c51b-4bd9-a4a4-83e2236d009e	3efd3018-9760-4d10-92c0-86981799240b	Hello from live test	2026-08-18 06:58:31.388	2026-08-18 06:58:31.392	\N	\N
\.


--
-- Data for Name: Messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Messages" (id, thread_id, from_id, body, read_at, sent_at) FROM stdin;
7f031616-ecc5-49a2-8cb6-71e57746da67	432cb9cb-599b-4188-b725-7f9320cf4127	d764ff7a-de6a-484e-a374-c2d8575d15c3	Hi, can you review the new clinic setup?	\N	2026-08-17 08:33:58.802
6ee1b338-82d2-4400-9c8f-f94f0bfeb3fe	432cb9cb-599b-4188-b725-7f9320cf4127	d764ff7a-de6a-484e-a374-c2d8575d15c3	Following up on this	\N	2026-08-17 08:34:08.495
bd1d82ec-38b4-446a-9bb0-993b1bc33eb5	432cb9cb-599b-4188-b725-7f9320cf4127	7d3f3ade-b82a-4383-859e-31d8a42c4a01	Live verification test message	\N	2026-08-18 06:58:30.698
ee1c1f89-1ef5-4b9b-af60-503fff8edd43	eab1a2c8-c51b-4bd9-a4a4-83e2236d009e	7d3f3ade-b82a-4383-859e-31d8a42c4a01	Hello from live test	\N	2026-08-18 06:58:31.442
a26d70bb-145d-4891-93d5-9131f37e7628	432cb9cb-599b-4188-b725-7f9320cf4127	d764ff7a-de6a-484e-a374-c2d8575d15c3	Chrome MCP live verification — sending a real message	\N	2026-08-18 07:46:16.485
dc90b4bc-4e19-4b74-8260-4932bdd20c1b	432cb9cb-599b-4188-b725-7f9320cf4127	7d3f3ade-b82a-4383-859e-31d8a42c4a01	e2e message 1787120932785	\N	2026-08-19 06:28:54.004
b1e03e84-9432-46ac-a44b-f2a0affc0c49	432cb9cb-599b-4188-b725-7f9320cf4127	7d3f3ade-b82a-4383-859e-31d8a42c4a01	e2e message 1787122088247	\N	2026-08-19 06:48:08.803
747f73f4-40d3-46ec-bf01-a14ea181db20	432cb9cb-599b-4188-b725-7f9320cf4127	7d3f3ade-b82a-4383-859e-31d8a42c4a01	e2e message 1787164582675	\N	2026-08-19 18:36:23.741
14477142-c29a-49db-ae85-2a68d84f518c	432cb9cb-599b-4188-b725-7f9320cf4127	7d3f3ade-b82a-4383-859e-31d8a42c4a01	e2e message 1787166605583	\N	2026-08-19 19:10:06.447
f8af9081-e9cd-4345-b70d-048187b96772	432cb9cb-599b-4188-b725-7f9320cf4127	7d3f3ade-b82a-4383-859e-31d8a42c4a01	e2e message 1787169584548	\N	2026-08-19 19:59:44.865
392ea76b-535d-4609-9dd9-b019484586ca	432cb9cb-599b-4188-b725-7f9320cf4127	7d3f3ade-b82a-4383-859e-31d8a42c4a01	e2e message 1787210981308	\N	2026-08-20 07:29:41.921
4ac739c5-2e7d-4682-b2ed-169234184cbd	432cb9cb-599b-4188-b725-7f9320cf4127	7d3f3ade-b82a-4383-859e-31d8a42c4a01	e2e message 1787211097574	\N	2026-08-20 07:31:38.137
1ed4076a-f513-40a2-bd30-9b93c15b4e70	432cb9cb-599b-4188-b725-7f9320cf4127	7d3f3ade-b82a-4383-859e-31d8a42c4a01	e2e message 1787212868332	\N	2026-08-20 08:01:08.997
\.


--
-- Data for Name: NotificationPreferences; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."NotificationPreferences" (id, user_id, event_type, email_enabled, sms_enabled, app_enabled, created_at, updated_at) FROM stdin;
8b648958-a390-4cca-a3e8-98592c31723f	c9e0af2b-4312-4fdf-b6c2-115388919f11	new_appointment	t	t	t	2026-08-21 13:13:59.515	2026-08-21 13:13:59.515
3cbc0b41-c7cf-4187-a5eb-c1c0b0b7b0f2	c9e0af2b-4312-4fdf-b6c2-115388919f11	appointment_reminder	t	t	t	2026-08-21 13:13:59.515	2026-08-21 13:13:59.515
f65d499d-9586-4a02-9b86-8aa87055e0e9	c9e0af2b-4312-4fdf-b6c2-115388919f11	appointment_cancelled	t	f	t	2026-08-21 13:13:59.515	2026-08-21 13:13:59.515
debcbac0-5b93-4b41-8d28-4f7a5352fe4c	c9e0af2b-4312-4fdf-b6c2-115388919f11	new_message	f	f	t	2026-08-21 13:13:59.515	2026-08-21 13:13:59.515
9414ee4a-efbe-46d0-854d-b803a432ff1c	c9e0af2b-4312-4fdf-b6c2-115388919f11	new_review	t	f	t	2026-08-21 13:13:59.515	2026-08-21 13:13:59.515
af1831b4-d1c7-402d-ac8e-3cff966a39c5	c9e0af2b-4312-4fdf-b6c2-115388919f11	payment_received	t	t	t	2026-08-21 13:13:59.515	2026-08-21 13:13:59.515
88a85b80-5115-43c7-bd57-bea20fc350b1	c9e0af2b-4312-4fdf-b6c2-115388919f11	system_announcement	t	f	f	2026-08-21 13:13:59.515	2026-08-21 13:13:59.515
03b6a939-ea1d-44f0-99ea-16d2725d93a1	a92f8ab8-8fd3-4c67-8da6-f5c91de17aab	new_appointment	t	t	t	2026-08-21 13:50:05.674	2026-08-21 13:50:05.674
c94484a3-64f7-4b69-b2db-de60e6f4ee7d	a92f8ab8-8fd3-4c67-8da6-f5c91de17aab	appointment_reminder	t	t	t	2026-08-21 13:50:05.674	2026-08-21 13:50:05.674
d507931a-5eee-4196-8657-db9f5fb54c3c	a92f8ab8-8fd3-4c67-8da6-f5c91de17aab	appointment_cancelled	t	f	t	2026-08-21 13:50:05.674	2026-08-21 13:50:05.674
ee3cf83e-bc48-463e-a016-2ce4b29354e8	a92f8ab8-8fd3-4c67-8da6-f5c91de17aab	new_message	f	f	t	2026-08-21 13:50:05.674	2026-08-21 13:50:05.674
0a054183-5429-47b3-8406-060d80a10a5c	a92f8ab8-8fd3-4c67-8da6-f5c91de17aab	new_review	t	f	t	2026-08-21 13:50:05.674	2026-08-21 13:50:05.674
dfdcf74f-2518-4221-8e66-37998b542c6d	a92f8ab8-8fd3-4c67-8da6-f5c91de17aab	payment_received	t	t	t	2026-08-21 13:50:05.674	2026-08-21 13:50:05.674
2cb190fc-28a3-4cde-8068-7c840e317ce6	a92f8ab8-8fd3-4c67-8da6-f5c91de17aab	system_announcement	t	f	f	2026-08-21 13:50:05.674	2026-08-21 13:50:05.674
dfc96c6b-8da8-4347-b9f9-ba6f08dba5be	7d3f3ade-b82a-4383-859e-31d8a42c4a01	new_appointment	t	t	t	2026-08-20 13:13:03.03	2026-08-20 13:13:03.03
45e8a16d-d14d-4d49-999c-f486cc69879f	7d3f3ade-b82a-4383-859e-31d8a42c4a01	appointment_reminder	t	t	t	2026-08-20 13:13:03.03	2026-08-20 13:13:03.03
8ac31e23-baab-422b-a227-48199e85ef5b	7d3f3ade-b82a-4383-859e-31d8a42c4a01	appointment_cancelled	t	f	t	2026-08-20 13:13:03.03	2026-08-20 13:13:03.03
6e52a5dc-8d63-4542-be2e-6a665d6cdd74	7d3f3ade-b82a-4383-859e-31d8a42c4a01	new_message	f	f	t	2026-08-20 13:13:03.03	2026-08-20 13:13:03.03
8d8306de-3929-471d-a571-54b99f3bc19f	7d3f3ade-b82a-4383-859e-31d8a42c4a01	new_review	t	f	t	2026-08-20 13:13:03.03	2026-08-20 13:13:03.03
6381986e-96a2-4b7e-b1c3-e9d5f0f28b22	f79bc07c-4b88-443c-8d43-0a99c150ec41	new_appointment	t	t	t	2026-08-21 13:47:24.449	2026-08-21 13:47:24.449
2c3fcee9-bd5d-4dc9-b954-661d241bf284	f79bc07c-4b88-443c-8d43-0a99c150ec41	appointment_reminder	t	t	t	2026-08-21 13:47:24.449	2026-08-21 13:47:24.449
d80b1f6f-19f4-427d-9e27-9750c534ed3d	f79bc07c-4b88-443c-8d43-0a99c150ec41	appointment_cancelled	t	f	t	2026-08-21 13:47:24.449	2026-08-21 13:47:24.449
da742e96-3d52-4e2a-9b81-256b63a8afac	f79bc07c-4b88-443c-8d43-0a99c150ec41	new_message	f	f	t	2026-08-21 13:47:24.449	2026-08-21 13:47:24.449
76428e36-75d0-47d6-a44f-6ac265e14c46	f79bc07c-4b88-443c-8d43-0a99c150ec41	new_review	t	f	t	2026-08-21 13:47:24.449	2026-08-21 13:47:24.449
14674ee2-cc25-43a0-b1ce-e1ff941cc8da	f79bc07c-4b88-443c-8d43-0a99c150ec41	payment_received	t	t	t	2026-08-21 13:47:24.449	2026-08-21 13:47:24.449
b438e138-0605-4df8-971f-64488d6525e6	f79bc07c-4b88-443c-8d43-0a99c150ec41	system_announcement	t	f	f	2026-08-21 13:47:24.449	2026-08-21 13:47:24.449
6adfd9b0-3af6-410d-8686-bd491857e87d	7d3f3ade-b82a-4383-859e-31d8a42c4a01	payment_received	t	t	t	2026-08-20 13:13:03.03	2026-08-20 13:13:03.03
e9ee5828-fc8c-4b83-90b7-b4c72986a6f0	7d3f3ade-b82a-4383-859e-31d8a42c4a01	system_announcement	t	f	f	2026-08-20 13:13:03.03	2026-08-20 13:13:03.03
386d99c1-d1e6-472c-a26d-fdb15db9dacc	d764ff7a-de6a-484e-a374-c2d8575d15c3	new_appointment	t	t	t	2026-08-21 14:47:31.887	2026-08-21 14:47:31.887
0d0daa94-4a67-45ee-a9a6-34dee895e27d	d764ff7a-de6a-484e-a374-c2d8575d15c3	appointment_reminder	t	t	t	2026-08-21 14:47:31.887	2026-08-21 14:47:31.887
7f8b0593-134e-4960-891d-32139c98be82	d764ff7a-de6a-484e-a374-c2d8575d15c3	appointment_cancelled	t	f	t	2026-08-21 14:47:31.887	2026-08-21 14:47:31.887
e0084ff8-ce31-4656-aff0-dfd0214a106d	d764ff7a-de6a-484e-a374-c2d8575d15c3	new_message	f	f	t	2026-08-21 14:47:31.887	2026-08-21 14:47:31.887
56dc2bda-108b-4dbf-b88b-0e972fd43adb	d764ff7a-de6a-484e-a374-c2d8575d15c3	new_review	t	f	t	2026-08-21 14:47:31.887	2026-08-21 14:47:31.887
53acbab1-65a5-461a-983c-ceb25342ad95	d764ff7a-de6a-484e-a374-c2d8575d15c3	payment_received	t	t	t	2026-08-21 14:47:31.887	2026-08-21 14:47:31.887
4c22a429-9dff-47de-b3d5-4adf9e846329	d764ff7a-de6a-484e-a374-c2d8575d15c3	system_announcement	t	f	f	2026-08-21 14:47:31.887	2026-08-21 14:47:31.887
\.


--
-- Data for Name: NotificationProviderConfig; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."NotificationProviderConfig" (id, client_org_id, channel, provider, credentials_encrypted, sender_id, is_active, created_at, updated_at) FROM stdin;
f11142d7-6730-4671-8dc0-b86606f1f9c0	3efd3018-9760-4d10-92c0-86981799240b	sms	msg91	eeGCXP42ieshgx3IhabOurGjD5yEm2sqY+57O6tmYJ9nMfu8rYYuGHs3+oADJo0bP1SE+ZKMZjeH8hkivCtZEM+vJJF8QvW2UA2lpmPmQg==	HealthSync	t	2026-08-21 09:08:51.317	2026-08-21 09:08:51.317
\.


--
-- Data for Name: Notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Notifications" (id, user_id, title, message, type, priority, is_read, is_deleted, action_url, metadata, created_at) FROM stdin;
91add03c-31a9-43b6-8c79-d1ccb6e08efb	3939263b-2272-437b-9010-bc1f72af8d05	New appointment booked	Pranav Tripathi booked GP Consultation for 15/1/2027, 9:00:00 am	appointment	medium	f	f	\N	{}	2026-08-23 22:09:42.607
c8a4594a-afee-426b-b322-1b82dd75f188	3939263b-2272-437b-9010-bc1f72af8d05	New appointment booked	Pranav Tripathi booked GP Consultation for 15/1/2027, 9:00:00 am	appointment	medium	f	f	\N	{}	2026-08-23 22:12:09.441
4c20a29c-e281-4e2f-b441-a964a0879bd4	3939263b-2272-437b-9010-bc1f72af8d05	New appointment booked	Pranav Tripathi booked GP Consultation for 15/1/2027, 9:00:00 am	appointment	medium	f	f	\N	{}	2026-08-23 22:16:05.243
26de5406-e20b-4232-950f-ce47ed4db89d	3939263b-2272-437b-9010-bc1f72af8d05	New appointment booked	Pranav Tripathi booked GP Consultation for 15/1/2027, 9:00:00 am	appointment	medium	f	f	\N	{}	2026-08-23 22:17:44.699
3718133e-c81e-41bd-91ed-3ca6bbff58d5	3939263b-2272-437b-9010-bc1f72af8d05	New appointment booked	Pranav Tripathi booked GP Consultation for 15/1/2027, 9:00:00 am	appointment	medium	f	f	\N	{}	2026-08-23 22:20:36.422
4b0a1123-01b9-40e2-a3e2-7a6f88def736	3939263b-2272-437b-9010-bc1f72af8d05	New appointment booked	Pranav Tripathi booked GP Consultation for 15/1/2027, 9:00:00 am	appointment	medium	f	f	\N	{}	2026-08-23 22:21:48.578
c93f6e8a-6e83-4cda-a8a5-37a17cfb1251	3939263b-2272-437b-9010-bc1f72af8d05	New appointment booked	Pranav Tripathi booked GP Consultation for 15/1/2027, 9:00:00 am	appointment	medium	f	f	\N	{}	2026-08-23 22:22:57.627
92cf9094-069c-4cd5-99e0-3275e2336e15	3939263b-2272-437b-9010-bc1f72af8d05	New appointment booked	Pranav Tripathi booked GP Consultation for 1/2/2027, 9:00:00 am	appointment	medium	f	f	\N	{}	2026-08-23 23:08:44.169
2186b557-3e6e-4f5b-aaf5-777a9321369d	3939263b-2272-437b-9010-bc1f72af8d05	New appointment booked	Pranav Tripathi booked GP Consultation for 1/2/2027, 9:00:00 am	appointment	medium	f	f	\N	{}	2026-08-23 23:10:23.848
b9176d83-37ce-4a64-9166-33fe8f32460e	3939263b-2272-437b-9010-bc1f72af8d05	New appointment booked	Pranav Tripathi booked GP Consultation for 1/2/2027, 9:00:00 am	appointment	medium	f	f	\N	{}	2026-08-23 23:14:31.872
e5db7fdf-215d-4ac8-b85b-f12a92da08e5	3939263b-2272-437b-9010-bc1f72af8d05	New appointment booked	Pranav Tripathi booked GP Consultation for 1/2/2027, 9:00:00 am	appointment	medium	f	f	\N	{}	2026-08-23 23:16:14.256
f99ce7b5-5985-4ded-bee1-f1f98f4fda2b	3939263b-2272-437b-9010-bc1f72af8d05	New appointment booked	Pranav Tripathi booked GP Consultation for 1/2/2027, 9:00:00 am	appointment	medium	f	f	\N	{}	2026-08-23 23:17:46.814
51f8c54b-37a4-4910-92ab-87b5e7c29bd1	3939263b-2272-437b-9010-bc1f72af8d05	New appointment booked	Pranav Tripathi booked GP Consultation for 1/2/2027, 9:00:00 am	appointment	medium	f	f	\N	{}	2026-08-23 23:22:59.761
0d945743-56a9-4ab6-b685-03dba2144578	3939263b-2272-437b-9010-bc1f72af8d05	New appointment booked	Pranav Tripathi booked GP Consultation for 1/2/2027, 9:00:00 am	appointment	medium	f	f	\N	{}	2026-08-23 23:33:47.88
c7cf5809-ec25-427a-95f1-2a05469d903d	3939263b-2272-437b-9010-bc1f72af8d05	New appointment booked	Pranav Tripathi booked GP Consultation for 1/2/2027, 9:00:00 am	appointment	medium	f	f	\N	{}	2026-08-23 23:36:53.625
fe6fba0c-5d76-4ef5-b9ac-e3a66813e9e9	3939263b-2272-437b-9010-bc1f72af8d05	New appointment booked	Pranav Tripathi booked GP Consultation for 1/2/2027, 9:00:00 am	appointment	medium	f	f	\N	{}	2026-08-23 23:39:57.626
adf5de22-d4f9-4be6-8c5d-8061cfc3dd21	3939263b-2272-437b-9010-bc1f72af8d05	New appointment booked	Pranav Tripathi booked GP Consultation for 1/2/2027, 9:00:00 am	appointment	medium	f	f	\N	{}	2026-08-23 23:50:25.068
e8f3add0-ebbd-46c4-849b-f4084ad4df4a	3939263b-2272-437b-9010-bc1f72af8d05	New appointment booked	Pranav Tripathi booked GP Consultation for 1/2/2027, 9:00:00 am	appointment	medium	f	f	\N	{}	2026-08-23 23:52:45.377
\.


--
-- Data for Name: OrganizationSubscriptions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."OrganizationSubscriptions" (id, client_org_id, plan_id, status, billing_cycle, current_period_start, current_period_end, is_deleted, stripe_customer_id, stripe_subscription_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: PatientMerges; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PatientMerges" (id, surviving_patient_id, merged_patient_id, merged_by_user_id, reason, merged_at) FROM stdin;
\.


--
-- Data for Name: PatientRelations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PatientRelations" (id, patient_id, related_patient_id, relation, created_at) FROM stdin;
\.


--
-- Data for Name: Patients; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Patients" (id, first_name, last_name, date_of_birth, email, phone, phone_country_code, address, medical_notes, title, status, birth_surname, birth_name, birth_names, social_security_number, gender, sex, google_client_id, payment_reference, occupation, place_of_birth, phones, address_structured, is_deleted, created_at, updated_at) FROM stdin;
69168728-b9e1-453c-85bd-3044c71bbac6	Anita	Sharma	2000-01-01 00:00:00	anita.sharma@example.com	+919810012345	\N			\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	2026-08-17 19:51:07.852	2026-08-17 19:51:07.852
f8adaa93-9457-435d-b745-9ad767e7bc34	Pranav	Tripathi	2026-08-04 00:00:00	pranavkanttripathi1989@gmail.com	7738196331	\N			\N	\N	\N	\N	\N	\N	male	\N	\N	\N	\N	\N	\N	\N	f	2026-08-18 06:49:42.92	2026-08-18 06:49:42.92
2abfec66-7a54-45d8-b25d-8a2e121d5f82	Pranav	Tripathi	2026-08-17 00:00:00	pranavkanttripathi1989@gmail.com	123456789	\N			\N	\N	\N	\N	\N	\N	male	\N	\N	\N	\N	\N	\N	\N	f	2026-08-18 18:18:05.807	2026-08-18 18:18:05.807
f8a33736-0ad4-4df8-a854-344cd567010c	Test	Patient	1990-05-15 00:00:00	testpatient1@example.com	+919810099999	\N	123 MG Road	allergic to penicillin	\N	\N	\N	\N	\N	\N	female	\N	\N	\N	\N	\N	\N	\N	f	2026-08-17 08:03:13.726	2026-08-23 01:39:51.207
\.


--
-- Data for Name: PaymentTransactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PaymentTransactions" (id, client_org_id, subscription_id, amount, currency, status, is_deleted, stripe_payment_intent_id, stripe_invoice_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, gstin, hsn_sac_code, gst_rate, cgst_amount, sgst_amount, igst_amount, transaction_date, metadata, created_at) FROM stdin;
0573cf68-3be4-4ed3-93a1-0e96ba2fd9b7	3efd3018-9760-4d10-92c0-86981799240b	\N	49900	INR	pending	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-08-17 19:53:08.599	{"appointment_id": "43b1ae5e-e4eb-46cf-b9ff-a2ad836c64a9", "payment_method_id": "pm_test_123"}	2026-08-17 19:53:08.599
\.


--
-- Data for Name: Permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Permissions" (id, name, description, resource, action, created_at) FROM stdin;
ea4ae238-3849-42b2-beb7-545a7ee8b77a	appointments.view	View appointments	appointments	view	2026-08-20 11:11:57.09
ec4e8642-08d0-4ba7-b968-e4ce53109eac	appointments.create	Create appointments	appointments	create	2026-08-20 11:11:57.124
d31f83e9-d5d8-490a-8ab8-673d6380f8cb	appointments.edit	Edit appointments	appointments	edit	2026-08-20 11:11:57.133
6a07e3cc-7eff-483e-9889-8e72f870808a	appointments.delete	Delete appointments	appointments	delete	2026-08-20 11:11:57.142
f5d30b2a-ca34-45f6-ba42-98cb17162e58	appointments.export	Export appointments	appointments	export	2026-08-20 11:11:57.153
291db385-cd89-4025-b6ac-205d406ee262	patients.view	View patients	patients	view	2026-08-20 11:11:57.162
f32f5026-9953-4778-8291-6c202717cb8b	patients.create	Create patients	patients	create	2026-08-20 11:11:57.182
a19b0ac0-47e5-4c6c-9056-3c5d60b1e3a3	patients.edit	Edit patients	patients	edit	2026-08-20 11:11:57.195
38b0987e-24c1-4125-9192-e8f6ab58f325	patients.delete	Delete patients	patients	delete	2026-08-20 11:11:57.204
b4109fbf-a8f5-4348-a626-b371d59ecd43	patients.export	Export patients	patients	export	2026-08-20 11:11:57.212
4aeb436f-aa26-4712-bd9b-06b58c893e5a	clinicians.view	View clinicians	clinicians	view	2026-08-20 11:11:57.219
fd7fa48b-4f77-46c7-a801-5277a81a7567	clinicians.create	Create clinicians	clinicians	create	2026-08-20 11:11:57.225
305a38cc-d7d3-453b-a38c-35946bddf872	clinicians.edit	Edit clinicians	clinicians	edit	2026-08-20 11:11:57.232
1b2c2e96-c501-403e-a32e-05c671bcaafc	clinicians.delete	Delete clinicians	clinicians	delete	2026-08-20 11:11:57.237
b6458fa2-ce51-4269-9e13-79fce86f8d15	clinicians.export	Export clinicians	clinicians	export	2026-08-20 11:11:57.244
8b2dae1a-20e4-4fb6-9e8c-e7f5deb1c13d	clinics.view	View clinics	clinics	view	2026-08-20 11:11:57.25
32e1f42b-8c8d-492b-81f6-8bc05d2e2c27	clinics.create	Create clinics	clinics	create	2026-08-20 11:11:57.257
d9c84cfe-c8d1-4bc4-a121-da50d54c64c7	clinics.edit	Edit clinics	clinics	edit	2026-08-20 11:11:57.265
71650974-8593-4cfc-a4b7-6e5cc9d2b782	clinics.delete	Delete clinics	clinics	delete	2026-08-20 11:11:57.272
e27a45d6-1ba0-417d-8f0f-af8727a76d3e	clinics.export	Export clinics	clinics	export	2026-08-20 11:11:57.281
e3dd67e8-6a64-48a0-afef-9713f079e1e2	rooms.view	View rooms	rooms	view	2026-08-20 11:11:57.286
0ea0eada-31a8-4b33-93ee-906207b4b119	rooms.create	Create rooms	rooms	create	2026-08-20 11:11:57.291
2bb7a043-41a8-4056-8e75-54f00a33b280	rooms.edit	Edit rooms	rooms	edit	2026-08-20 11:11:57.297
a1034180-3510-49c1-afe6-d1b972ad2768	rooms.delete	Delete rooms	rooms	delete	2026-08-20 11:11:57.302
463d1c4f-0df2-4014-a298-339637f34f27	rooms.export	Export rooms	rooms	export	2026-08-20 11:11:57.307
2d12bac6-ed4c-4f2a-a752-ae44a42eaffc	products.view	View products	products	view	2026-08-20 11:11:57.314
1016f9c0-521b-4bc8-8bb8-d1e08c168d7b	products.create	Create products	products	create	2026-08-20 11:11:57.319
8bee582b-94d4-4925-9d2f-ca38bf2b159c	products.edit	Edit products	products	edit	2026-08-20 11:11:57.324
bfa8693f-2a8b-442f-9a04-ac9bb8da7f68	products.delete	Delete products	products	delete	2026-08-20 11:11:57.33
c7593b99-34cb-47c9-9038-11cd6f105e1e	products.export	Export products	products	export	2026-08-20 11:11:57.337
9fb250f6-26d0-4397-a262-4a061b8b88f4	billing.view	View billing	billing	view	2026-08-20 11:11:57.342
9a277567-0817-4068-b269-466319c94130	billing.create	Create billing	billing	create	2026-08-20 11:11:57.351
cf300174-2bc6-469d-b7ae-fb784b7e8923	billing.edit	Edit billing	billing	edit	2026-08-20 11:11:57.358
cf423ca5-a567-44ae-9a17-8a93970b1f58	billing.delete	Delete billing	billing	delete	2026-08-20 11:11:57.365
7235fde8-a22d-4432-8be8-d3773fcb37ad	billing.export	Export billing	billing	export	2026-08-20 11:11:57.373
d155abb2-30f1-48be-be0f-52ce5ed3c5b5	reviews.view	View reviews	reviews	view	2026-08-20 11:11:57.379
efcb81f2-52b5-4ddb-9834-0affdd92ff5f	reviews.create	Create reviews	reviews	create	2026-08-20 11:11:57.385
09e841d5-3497-47be-bfe9-d149efd1efc7	reviews.edit	Edit reviews	reviews	edit	2026-08-20 11:11:57.392
af054117-ca7c-4360-a1ce-736b975abf88	reviews.delete	Delete reviews	reviews	delete	2026-08-20 11:11:57.397
3efccce6-ade2-4612-8236-bd9131535b12	reviews.export	Export reviews	reviews	export	2026-08-20 11:11:57.403
c679fd3b-b5fb-4323-82f3-6185b2116c2b	messages.view	View messages	messages	view	2026-08-20 11:11:57.409
749a40a5-d3e9-432c-a934-f61de5d4254c	messages.create	Create messages	messages	create	2026-08-20 11:11:57.422
3da985a7-ca70-45cb-8f5b-3931aa5a07c4	messages.edit	Edit messages	messages	edit	2026-08-20 11:11:57.43
45420604-1c33-4c9f-bb3a-6254f7bddc78	messages.delete	Delete messages	messages	delete	2026-08-20 11:11:57.437
12af9f6e-f69a-4abd-8d2e-b011c9026e26	messages.export	Export messages	messages	export	2026-08-20 11:11:57.444
a158de26-1bdc-438c-aa1e-ff265a80890c	roles.view	View roles	roles	view	2026-08-20 11:11:57.455
d3252774-8215-4c1e-a46c-7ea55cfafaed	roles.create	Create roles	roles	create	2026-08-20 11:11:57.469
5bbb8efc-2a93-4490-aa7e-2eea76c34837	roles.edit	Edit roles	roles	edit	2026-08-20 11:11:57.477
c721bb16-30c5-4226-8f0b-b3aa9479e617	roles.delete	Delete roles	roles	delete	2026-08-20 11:11:57.486
d6fcbfba-7071-4d6b-a135-2c1605dde9e7	roles.export	Export roles	roles	export	2026-08-20 11:11:57.496
5d99f36b-fe40-409c-82a6-407ffd7f51df	settings.view	View settings	settings	view	2026-08-20 11:11:57.505
a1b90e59-b293-43ba-bd91-8399aaba9cc7	settings.create	Create settings	settings	create	2026-08-20 11:11:57.608
e17ea802-e747-4505-a7b7-fbab9c627e69	settings.edit	Edit settings	settings	edit	2026-08-20 11:11:57.62
d1f7ba62-7688-459d-bdc2-82b08933f82a	settings.delete	Delete settings	settings	delete	2026-08-20 11:11:57.643
566a09c3-d28a-4c6e-be6f-84cd14835294	settings.export	Export settings	settings	export	2026-08-20 11:11:57.663
a1d29156-d77b-4b90-a758-a2aba2dc6b8b	reports.view	View reports	reports	view	2026-08-20 11:11:57.673
74f8d7e5-3ba1-40e8-9d44-053fbaab65fd	reports.create	Create reports	reports	create	2026-08-20 11:11:57.685
17fb8c87-024b-45f5-b18b-5734a6b94ef9	reports.edit	Edit reports	reports	edit	2026-08-20 11:11:57.698
3cee503c-db02-4115-bb08-1cb533934977	reports.delete	Delete reports	reports	delete	2026-08-20 11:11:57.71
d5647d1a-af1d-4164-8935-c90cc3597f2f	reports.export	Export reports	reports	export	2026-08-20 11:11:57.732
\.


--
-- Data for Name: PrescriptionItems; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PrescriptionItems" (id, prescription_id, drug_id, dose, frequency, route, duration_days, qty, instructions, substitutable) FROM stdin;
\.


--
-- Data for Name: PrescriptionSetItems; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PrescriptionSetItems" (id, prescription_set_id, drug_id, dose, frequency, route, duration_days, instructions) FROM stdin;
\.


--
-- Data for Name: PrescriptionSets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PrescriptionSets" (id, client_org_id, clinician_id, specialty, name, created_at) FROM stdin;
\.


--
-- Data for Name: Prescriptions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Prescriptions" (id, encounter_id, patient_id, clinician_id, mode, issued_at, language, repeated_from_id, reprint_count) FROM stdin;
\.


--
-- Data for Name: ProductCancellationRules; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ProductCancellationRules" (id, product_id, rule_type, hours_before_appointment, fee_type, fee_amount, is_active, is_deleted, created_at, updated_at, name, description, clinic_id, priority, client_org_id) FROM stdin;
986dde66-2361-4efe-a3d2-e0b9d372003b	\N	cancellation	24	percentage	25	t	t	2026-08-20 12:21:42.687	2026-08-20 12:21:42.687	Standard 24h	\N	\N	1	3efd3018-9760-4d10-92c0-86981799240b
4deb17b2-4fca-486c-bbcb-bbaacaa122fb	\N	cancellation	0	fixed	8500	t	t	2026-08-20 12:21:42.882	2026-08-20 12:21:42.882	Org-wide No-show	\N	\N	5	\N
\.


--
-- Data for Name: ProductCategories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ProductCategories" (id, clinic_id, name, description, is_active, is_deleted, created_at, client_org_id) FROM stdin;
323f06c5-801d-4e62-8a4a-e7305466fe71	\N	Supplements	Dietary supplements	t	f	2026-08-17 21:50:30.375	\N
\.


--
-- Data for Name: ProductSubcategories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ProductSubcategories" (id, clinic_id, category_id, name, description, is_active, is_deleted, created_at, client_org_id) FROM stdin;
7bd1b34d-4eac-48cb-9a41-7ce6e925e9f7	\N	323f06c5-801d-4e62-8a4a-e7305466fe71	Vitamins		t	f	2026-08-17 21:50:39.886	\N
\.


--
-- Data for Name: ProductVariations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ProductVariations" (id, product_id, variation_name, sku, price, duration_minutes, stock_quantity, is_active, is_deleted, created_at) FROM stdin;
\.


--
-- Data for Name: Products; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Products" (id, clinic_id, category_id, subcategory_id, name, description, product_type, sku, price, duration_minutes, order_by, is_active, is_deleted, created_at, stock_quantity, client_org_id, hsn, is_tax_exempt) FROM stdin;
1628a827-fb3b-49ec-9e39-08d17f7111dc	\N	\N	\N	Vitamin D3 1000IU	Updated	simple	VIT-D3	1499	\N	0	t	t	2026-08-17 21:50:40.284	140	\N	\N	f
740d1d0a-06b2-4b7a-a923-2f17915cbf38	\N	\N	\N	E2E Test Service	Verification test	simple	e2e-test-service-mt0j46av	25000	30	0	f	f	2026-08-19 20:13:25.381	0	\N	\N	f
62f4e8f5-7519-4d26-9ef5-2009f7ded86e	\N	\N	\N	E2E Service 1787170700512		simple	e2e-service-1787170700512-mt0jajat	5000	15	0	t	f	2026-08-19 20:18:22.136	0	\N	\N	f
90e78d83-734e-4566-9162-4a5b6185d308	\N	\N	\N	E2E Service 1787210957104		simple	e2e-service-1787210957104-mt179ds2	5000	15	0	t	f	2026-08-20 07:29:19.108	0	\N	\N	f
5089f0e4-ac2b-436c-8107-a4845b587842	\N	\N	\N	E2E Service 1787211081336		simple	e2e-service-1787211081336-mt17c1lv	5000	15	0	t	f	2026-08-20 07:31:23.328	0	\N	\N	f
7876d9cc-8f4e-40fd-9c76-2d427f1a1819	\N	\N	\N	E2E Service 1787212810377		simple	e2e-service-1787212810377-mt18d3wb	5000	15	0	t	f	2026-08-20 08:00:12.567	0	\N	\N	f
caa89f8e-26bd-4325-9f16-df5dd7eb994e	\N	\N	\N	GP Consultation	Standard consult	simple	gp-consultation-mswwj5ii	49900	20	0	t	f	2026-08-17 07:17:54.482	0	3efd3018-9760-4d10-92c0-86981799240b	\N	f
12f8fc20-35e4-4246-8551-7de71f0db52c	\N	\N	\N	E2E Service 1787294182921		simple	e2e-service-1787294182921-mt2kt784	5000	15	0	t	f	2026-08-21 06:36:24.919	0	\N	\N	f
\.


--
-- Data for Name: QueueEntries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."QueueEntries" (id, appointment_id, clinic_id, clinician_id, token_no, status, checked_in_at, called_at, skip_return_after, served_since_skip, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: QueueEvents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."QueueEvents" (id, queue_entry_id, action, reason, changed_by_user_id, created_at) FROM stdin;
\.


--
-- Data for Name: Resources; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Resources" (id, client_org_id, clinic_id, name, type, is_bookable, is_deleted, created_at) FROM stdin;
\.


--
-- Data for Name: Reviews; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Reviews" (id, appointment_id, patient_id, clinician_id, clinic_id, stars, comment, response, responded_at, is_deleted, created_at) FROM stdin;
cfb9623a-1f36-4402-81f1-9e2d494a1854	9798af17-ee7e-45cc-b4e2-254825fdba4d	f8a33736-0ad4-4df8-a854-344cd567010c	8e9ed6bf-daf0-49cb-84f3-82c8c4ba80e7	\N	5	Great service, very professional!	Thank you for the kind words!	2026-08-17 08:34:28.937	t	2026-08-17 08:34:21.754
\.


--
-- Data for Name: RolePermissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RolePermissions" (id, role_id, permission_id, is_deleted, created_at) FROM stdin;
0b43b49d-93d0-4a87-8427-aa7b43ca57f1	58ea6279-94b7-4011-8000-7fbaa271cfb8	ea4ae238-3849-42b2-beb7-545a7ee8b77a	f	2026-08-20 11:16:08.518
e2238610-7391-4fac-ab6e-574363e6ba45	58ea6279-94b7-4011-8000-7fbaa271cfb8	a19b0ac0-47e5-4c6c-9056-3c5d60b1e3a3	f	2026-08-20 11:16:08.518
930fa1dd-2ab7-4c6e-bd01-a44a91da510a	3c94e91e-64dd-4e37-90c0-7da1820dfcee	ea4ae238-3849-42b2-beb7-545a7ee8b77a	f	2026-08-20 11:31:02.828
c1a82889-b916-4065-98fe-174c15bbd12d	e2bc7aa7-0be2-4163-ae4c-8b7902ba8eb1	ea4ae238-3849-42b2-beb7-545a7ee8b77a	f	2026-08-20 11:32:13.518
ebe292ff-54ac-4325-869c-4eb72f4487e1	583c9554-f97f-45c2-ac13-546acb2fb94e	ea4ae238-3849-42b2-beb7-545a7ee8b77a	f	2026-08-20 11:33:01.281
1b677fa4-edb3-45de-a87d-9a8c43234fe8	ec09e085-1c82-4c51-8639-31722f54f027	ea4ae238-3849-42b2-beb7-545a7ee8b77a	f	2026-08-22 11:17:51.31
\.


--
-- Data for Name: RoomBlocks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RoomBlocks" (id, room_id, clinic_id, block_date, start_time, end_time, reason, is_recurring, is_deleted, created_at, recurrence_type, recurrence_days, end_date) FROM stdin;
bc5df314-fe19-451d-935c-a86f8039c8dd	183883aa-5398-4092-b434-84a731cc431a	7307c9d9-8a74-4305-8933-7b0a73c1486d	2026-08-19 00:00:00	1970-01-01 12:00:00	1970-01-01 13:00:00	cleaning	f	f	2026-08-17 08:21:35.215	single	\N	\N
\.


--
-- Data for Name: Rooms; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Rooms" (id, clinic_id, room_number, room_type, clinician_type, capacity, is_active, is_deleted, created_at) FROM stdin;
183883aa-5398-4092-b434-84a731cc431a	7307c9d9-8a74-4305-8933-7b0a73c1486d	Room 3A	consultation	\N	2	t	f	2026-08-17 00:49:17.594
131bbd62-c9b1-4afa-b139-1c37af152fb6	7307c9d9-8a74-4305-8933-7b0a73c1486d	Room 5B	consultation	\N	\N	t	f	2026-08-17 01:38:23.542
ac73f541-24b3-44bd-a0f1-e07bc487253a	7307c9d9-8a74-4305-8933-7b0a73c1486d	305	93a9efdc-ff38-4644-9c9d-e88ad6e5935e	c6dbd718-9bda-4e32-9b51-d76e70e94a18	\N	t	t	2026-08-17 21:56:09.364
\.


--
-- Data for Name: SpacerBlocks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SpacerBlocks" (id, clinician_id, clinic_id, room_id, block_date, start_time, end_time, reason, is_deleted, created_at, recurrence_type, recurrence_days, end_date) FROM stdin;
12892638-fa2c-45b6-856e-0dbaca9d0dd5	8e9ed6bf-daf0-49cb-84f3-82c8c4ba80e7	7307c9d9-8a74-4305-8933-7b0a73c1486d	\N	2026-08-19 00:00:00	1970-01-01 09:00:00	1970-01-01 09:30:00	prep time	f	2026-08-17 08:21:35.139	single	\N	\N
4738ee21-1e3e-4617-b0d5-4bdaf4e54b5a	8e9ed6bf-daf0-49cb-84f3-82c8c4ba80e7	7307c9d9-8a74-4305-8933-7b0a73c1486d	\N	2026-09-01 00:00:00	1970-01-01 09:00:00	1970-01-01 09:30:00	live regression check	t	2026-08-18 18:38:31.261	single	\N	\N
\.


--
-- Data for Name: StripeConfigurations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."StripeConfigurations" (id, client_org_id, stripe_account_id, stripe_publishable_key, stripe_webhook_secret, is_active, is_deleted, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: SubscriptionPlans; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SubscriptionPlans" (id, name, description, price_monthly, price_yearly, max_clinics, max_users, features, is_active, is_deleted, created_at) FROM stdin;
\.


--
-- Data for Name: TestResults; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TestResults" (id, patient_name, patient_id, test_name, test_type, ordered_by_name, ordered_by_user_id, date_ordered, date_completed, status, "values", is_deleted, created_at) FROM stdin;
05cbb797-5f5b-4fdb-afd8-857ba3c803d2	Priya Sharma	\N	Blood Test	Blood Test	Alex Clinician	3939263b-2272-437b-9010-bc1f72af8d05	2026-08-17 07:28:40.141	2026-08-17 07:28:52.477	completed	[{"ref": "13.5-17.5", "flag": "normal", "name": "Hemoglobin", "value": "14.5 g/dL"}]	f	2026-08-17 07:28:40.141
fe44b8a3-87d6-4d64-ac8e-2df2d8e6ca7d	Ethan Hunt	\N	Blood Test	Blood Test	Admin User	d764ff7a-de6a-484e-a374-c2d8575d15c3	2026-08-17 07:32:36.384	\N	pending	[]	f	2026-08-17 07:32:36.384
\.


--
-- Data for Name: UserProfiles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."UserProfiles" (id, role_id, first_name, last_name, email, password, phone, phone_country_code, address_line1, address_line2, city, postal_code, country, user_image, clinic_id, clinician_id, patient_id, is_active, is_deleted, created_at, updated_at, client_org_id, password_reset_token, password_reset_expires, email_verified, email_verification_token, email_verification_expires, last_login_at, avatar_url, department, job_title, notes, staff_status, date_of_birth, gender, bio, address_structured, totp_secret_encrypted, totp_enabled, totp_backup_codes, staff_since) FROM stdin;
d764ff7a-de6a-484e-a374-c2d8575d15c3	576e244e-08dc-4c49-b9f5-d504ea9f92e3	Admin	User	admin@medibook.dev	$2b$12$2ax/KGRGnleI.iPywIBLmeGNDizvBvI0j.dxJX7cja7aTEnt.0qG6	+919810000001	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	f	2026-08-16 20:38:37.303	2026-08-16 20:38:37.303	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	active	\N	\N	\N	\N	\N	f	\N	\N
4b076eaa-d4d0-4a16-aa43-76c9bf1f1fb3	7d460567-3f9d-4604-b418-846712227374	New	Patient	newpatient@test.dev	$2b$12$.aHmXOo7TeNMwR8HDXmlNODCOMqWTLPLrto.Cn/jG/fwn/suKpkH6	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	f	2026-08-16 20:44:05.084	2026-08-16 20:44:05.084	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	active	\N	\N	\N	\N	\N	f	\N	\N
4d30c033-1a41-4cf4-8a5a-f7ab3c08dfe2	3860c8b1-8bcb-4ac6-a9c2-62d7c4cc7247	Test	Nurse	testnurse1@example.com	$2b$12$GHqcEG0rZEDAqI6YYwVzi.nx8NXba6ABjH/VaWPBX3Tjbs8tXqYci	+919810055555	\N	12 Park Street	\N	\N	\N	\N	\N	\N	\N	\N	f	f	2026-08-17 08:30:40.218	2026-08-17 08:30:40.218	\N	\N	\N	f	\N	\N	\N	\N	General Practice	Nurse	Night shift	inactive	\N	\N	\N	\N	\N	f	\N	\N
e73f8203-c715-4b7e-8d78-784891db58e2	7d460567-3f9d-4604-b418-846712227374	Test	Newuser	testnewuser1@example.com	$2b$12$QmtVPBh92tbFxforusWLLu/LW1HM9w1ZV4OhddVsvOK8isavraFu.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	f	2026-08-17 08:25:47.732	2026-08-17 08:25:47.732	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	active	\N	\N	\N	\N	\N	f	\N	\N
bedc8e50-e363-4c47-b774-0d0e25635c4f	7d460567-3f9d-4604-b418-846712227374	Throwaway	Tester	e2e-throwaway-settings@medibook.dev	$2b$12$2t0L1ZfRUz2cXLxH1LYDUeTG94UkbHZYqbeBj.wUU3Y5bVv7Q0Vfi	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	2026-08-20 13:13:37.368	2026-08-20 13:13:37.368	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	active	\N	\N	\N	\N	\N	f	\N	\N
ded11bce-2b7f-43b9-a87f-7e2cb59a085e	3860c8b1-8bcb-4ac6-a9c2-62d7c4cc7247	Jamie	Reception	receptionist@medibook.dev	$2b$12$DeJESLl4GOywyEzK34qMTuwkapj0pWLdihmY1loZanamrAc/9m9dK	+919810000004	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	f	2026-08-16 20:38:38.443	2026-08-16 20:38:38.443	3efd3018-9760-4d10-92c0-86981799240b	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	active	\N	\N	\N	\N	\N	f	\N	\N
7d3f3ade-b82a-4383-859e-31d8a42c4a01	48754a3e-d7e8-471a-bd91-4058a07cec83	Sarah	Manager	manager@medibook.dev	$2b$12$OXa1ETaSzMsApz7y1J8WCe5oMugiOxGEcEApxB15ril6W/6P39SrW	+919810000002	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	f	2026-08-16 20:38:37.682	2026-08-16 20:38:37.682	3efd3018-9760-4d10-92c0-86981799240b	\N	\N	f	\N	\N	\N	/uploads/avatars/7d3f3ade-b82a-4383-859e-31d8a42c4a01-19ae3e2e-6965-4b68-9e8b-ecdc7f93c194.png	\N	\N	\N	active	\N	prefer_not_to_say	\N	null	\N	f	[]	\N
a92f8ab8-8fd3-4c67-8da6-f5c91de17aab	7d460567-3f9d-4604-b418-846712227374	E2E	Totp	e2e-totp-1787320191302-873662@medibook.dev	$2b$12$kCB71XAQmw5HCSbOK8d.Buu.zwQ4dIf58m.TYMP/DfSIa.eFPXRGO	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	f	2026-08-21 13:49:52.29	2026-08-21 13:49:52.29	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	active	\N	\N	\N	\N	\N	f	[]	\N
f79bc07c-4b88-443c-8d43-0a99c150ec41	7d460567-3f9d-4604-b418-846712227374	E2E	Totp	e2e-totp-1787320012633-5271@medibook.dev	$2b$12$6/iXt2YlA2/1qjeqGQrDiOba/H8g03FS7ZDYlnsRlWwpxqhcnjewm	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	f	2026-08-21 13:46:56.056	2026-08-21 13:46:56.056	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	active	\N	\N	\N	\N	\N	f	[]	\N
c9e0af2b-4312-4fdf-b6c2-115388919f11	7d460567-3f9d-4604-b418-846712227374	Priya	Patient	patient@medibook.dev	$2b$12$BZnTKkaPRPsuuulRnM2SEu7Rr7tFjg16ybaKoVTt3VtiNe5lDeDzi	+919810000005	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	f	2026-08-16 20:38:38.824	2026-08-16 20:38:38.824	3efd3018-9760-4d10-92c0-86981799240b	17bca9ec90601e8ddc9d6c7e32a41d6a7a9413591adf153f253c17d327d50d3d	2026-08-23 02:15:56.772	f	\N	\N	\N	\N	\N	\N	\N	active	\N	\N	\N	\N	\N	f	\N	\N
3939263b-2272-437b-9010-bc1f72af8d05	ca7f3f6f-768b-4209-87e4-b12f577f3a19	Alex	Clinician	clinician@medibook.dev	$2b$12$XJBx9EY.CaKXbUhipdrv3eieIh9VLr1ypAtL0EEQOuGg0R5oyYR56	+919810000003	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	f	2026-08-16 20:38:38.055	2026-08-16 20:38:38.055	3efd3018-9760-4d10-92c0-86981799240b	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	active	\N	\N	\N	\N	\N	f	\N	\N
\.


--
-- Data for Name: UserRoles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."UserRoles" (id, name, description, is_deleted, created_at, client_org_id, is_system, code) FROM stdin;
576e244e-08dc-4c49-b9f5-d504ea9f92e3	admin	admin role	f	2026-08-16 20:38:36.779	\N	t	admin
2e5e0af9-84f0-40a0-ad4a-2a9ed3a928ce	super_admin	super_admin role	f	2026-08-16 20:38:36.81	\N	t	super_admin
48754a3e-d7e8-471a-bd91-4058a07cec83	manager	manager role	f	2026-08-16 20:38:36.828	\N	t	manager
ca7f3f6f-768b-4209-87e4-b12f577f3a19	clinician	clinician role	f	2026-08-16 20:38:36.845	\N	t	clinician
3860c8b1-8bcb-4ac6-a9c2-62d7c4cc7247	staff	staff role	f	2026-08-16 20:38:36.865	\N	t	staff
7d460567-3f9d-4604-b418-846712227374	patient	patient role	f	2026-08-16 20:38:36.885	\N	t	patient
6d1a4813-58be-49c1-aa1e-92dfae9351a1	Billing Specialist	Handles invoices	t	2026-08-17 08:25:47.834	\N	f	billing_specialist
58ea6279-94b7-4011-8000-7fbaa271cfb8	E2E Test Role 1787224566846		f	2026-08-20 11:16:08.506	\N	f	e2e_test_role_1787224566846
3c94e91e-64dd-4e37-90c0-7da1820dfcee	E2E Test Role 1787225459644		f	2026-08-20 11:31:02.803	\N	f	e2e_test_role_1787225459644
e2bc7aa7-0be2-4163-ae4c-8b7902ba8eb1	E2E Test Role 1787225530485		f	2026-08-20 11:32:13.505	\N	f	e2e_test_role_1787225530485
583c9554-f97f-45c2-ac13-546acb2fb94e	E2E Test Role 1787225577931		f	2026-08-20 11:33:01.274	\N	f	e2e_test_role_1787225577931
ec09e085-1c82-4c51-8639-31722f54f027	E2E Test Role 1787397468019		f	2026-08-22 11:17:51.28	\N	f	e2e_test_role_1787397468019
\.


--
-- Data for Name: Users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Users" (id) FROM stdin;
d764ff7a-de6a-484e-a374-c2d8575d15c3
7d3f3ade-b82a-4383-859e-31d8a42c4a01
3939263b-2272-437b-9010-bc1f72af8d05
ded11bce-2b7f-43b9-a87f-7e2cb59a085e
c9e0af2b-4312-4fdf-b6c2-115388919f11
4b076eaa-d4d0-4a16-aa43-76c9bf1f1fb3
e73f8203-c715-4b7e-8d78-784891db58e2
4d30c033-1a41-4cf4-8a5a-f7ab3c08dfe2
bedc8e50-e363-4c47-b774-0d0e25635c4f
f79bc07c-4b88-443c-8d43-0a99c150ec41
a92f8ab8-8fd3-4c67-8da6-f5c91de17aab
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
58a6caa5-6ac8-43c7-b0cb-e4ba10a883b5	283536157402b4c9ddac514d2d94d98c9b82c1e1a0f1f1c3653e295ccc4c251e	2026-08-16 20:38:16.268999+00	20260816203815_init	\N	\N	2026-08-16 20:38:15.287993+00	1
1ef9123a-9237-4e6e-a910-1850148e7d2e	fc4cd87e50d146377d37d790e3cfafd5e17f0797cff77c6cd3c63820c01ae09f	2026-08-16 22:14:22.227731+00	20260817021500_add_role_org_scoping	\N	\N	2026-08-16 22:14:21.872515+00	1
2c5c42c2-5ced-4e72-8830-b48fb773edb6	ecf45bd3b8b08936bab4be2a8f08adc96e2d3f437d3c190b9782781921a641ea	2026-08-20 12:13:32.656964+00	20260820121500_cancellation_rules_org_scope_and_global	\N	\N	2026-08-20 12:13:32.569037+00	1
dac4c18c-e9e1-44f8-9058-e3c2eae766b0	b3fab46dc9852f26b7233ce30bffdf1369a509658d156f3c67c45fcfca3f5fd0	2026-08-17 00:43:46.85677+00	20260817090000_add_clinic_location_fields	\N	\N	2026-08-17 00:43:46.41632+00	1
145f5b36-7189-47bc-82d7-a013484fde14	d745ee9cdad13ec6d08fcdd675d28afeb6a39eb8bab32b9851bd7a8c5178445f	2026-08-17 01:05:28.284031+00	20260817110000_add_organization_address_structured	\N	\N	2026-08-17 01:05:28.257619+00	1
a1abf99e-5cc1-41c4-b54c-f959a4c0b84a	aac8b3bcc4c32178cd2a9b188a26d4970cdbcc7b2b428c6abfa6458a41e4d63e	2026-08-17 07:03:50.973093+00	20260817120000_languages_emailtemplates_clinicians_services	\N	\N	2026-08-17 07:03:50.415688+00	1
a3ea099a-6c00-4806-8b26-c3a54d3a37a1	faf5ccef88e839962b9e69b706ea9618beab6f3687e690f02145c7610066010f	2026-08-20 13:01:35.780529+00	20260820130000_notification_preferences	\N	\N	2026-08-20 13:01:35.60822+00	1
edc9d40b-bc52-4eba-a8a9-01d06f8e7ef4	887e29af9d7d7af73779cea0da1bb3f71a6253949206160c633ab8bc46fea586	2026-08-17 07:26:41.446001+00	20260817130000_add_test_results	\N	\N	2026-08-17 07:26:41.298939+00	1
4b6f4d23-3b2e-43e0-9e5f-fbfe6c02f03a	8e3583f999b767ffda2f4c865f488ea0fbf2c57ef387825c70324828f4f47f4a	2026-08-17 07:54:36.199672+00	20260817140000_add_appointments_status_logs	\N	\N	2026-08-17 07:54:35.994914+00	1
2a6f90fd-4140-4ab7-b0cd-85ead57c625a	df78424fc19081809dbf8da61cf7cf57d4bb46495912c4a1450ce8bbe975d606	2026-08-21 14:17:19.046912+00	20260821050000_org_branding	\N	\N	2026-08-21 14:17:19.010755+00	1
58f569b0-fa72-47bc-89d7-3f2cc407d8e2	883ce1bdfb4b8e5b2c1ef33eec3f7bfeb4f41741806840e7ddebccf23b0a790b	2026-08-17 08:18:51.251842+00	20260817150000_add_roomblocks_recurrence	\N	\N	2026-08-17 08:18:51.207972+00	1
cabbabbe-6a38-4258-a348-c7527b3d66c4	7d99835889c13c691bf2254239b0a4f17e392984714c8380ce003bfe448718b9	2026-08-20 13:45:16.668911+00	20260820140000_org_communication_and_booking_policy_settings	\N	\N	2026-08-20 13:45:16.631981+00	1
aebe2947-d39b-4c26-90df-502ca06027ba	550783492a48c5bfded850612feb3b7ee1dfb64f3ae1e219bebf891e3bb8dab7	2026-08-17 08:23:17.461345+00	20260817160000_add_rbac_user_fields	\N	\N	2026-08-17 08:23:17.409382+00	1
3469efc8-1f87-47b7-941b-0d153a166240	844e9b9a65ebbbfba567551fe53c07ab8c2be4db9d9bd12f4224e94d519abdcb	2026-08-17 08:26:55.851237+00	20260817170000_add_staff_fields	\N	\N	2026-08-17 08:26:55.824513+00	1
86158215-56b8-413f-b0be-5c19702e4544	c2e347c8495d9850d4055184496023b89de49fbb8192fc4b46c90507de91d42f	2026-08-17 19:43:21.317473+00	20260818090000_add_appointment_type	\N	\N	2026-08-17 19:43:21.130018+00	1
0548357d-b958-40a4-a2c7-e0374593e08e	5f8664e80cec55c09185a11c756883931bfe4ca65685d291386fa33b9c82e93b	2026-08-20 14:49:22.794193+00	20260820150000_appointment_payments	\N	\N	2026-08-20 14:49:22.640552+00	1
0c4ee4e3-c20d-48a3-82ea-fe296ba9620a	f150fc572b5915fdf80464b73730933c4998d48c5adbc58cc14e61b7385cc409	2026-08-17 21:40:31.200123+00	20260818100000_add_product_stock_quantity	\N	\N	2026-08-17 21:40:30.834243+00	1
15e51399-1ec9-4e19-a176-96a14f1e5895	09f32506710ec19b0a3f7480790b7d03a525677628536a32d2f058996fed44bd	2026-08-20 12:04:18.45512+00	20260820120000_extend_cancellation_rules_clinic_scope	\N	\N	2026-08-20 12:04:18.288634+00	1
f7b32afe-85f6-4ea7-a3b6-4280727edc49	39414e5b4a4e8bb96424b1150d7743c301ea74a60f85705ba4a725d296537d52	2026-08-21 06:18:49.454086+00	20260821000000_products_client_org_id	\N	\N	2026-08-21 06:18:49.122251+00	1
79359e44-87ff-4ce5-a862-b648d252ab87	7055d8869b180c8de6242e2697e57bb7770ade486df33d4ef608454b65554cce	2026-08-21 14:36:29.39642+00	20260821051500_org_branding_default_secondary_color_fix	\N	\N	2026-08-21 14:36:29.299871+00	1
aded2251-8c0b-4a4d-acb1-9088e7a1b221	ddb6f55282a2c2d207d46dbc018867c24e1098d29283a421231fac5572bb59b8	2026-08-21 07:07:54.974673+00	20260821010000_profile_2fa_notification_providers	\N	\N	2026-08-21 07:07:54.653065+00	1
994a5bf2-fb2b-4a62-b8ec-99d8c786d26e	1f1179000bd5a8f35a4b6129bce616c27e8401708eda242d926f084984388857	2026-08-21 10:55:21.065513+00	20260821020000_staff_since_and_password_reset	\N	\N	2026-08-21 10:55:21.005983+00	1
ffdcc669-d12c-4e5e-ab23-0808c92934ef	46916cb7b05c15648f0ee1b7da086e511b12e42c28c5b64da564d0fe1b38c3df	2026-08-21 12:30:53.491374+00	20260821030000_org_security_settings	\N	\N	2026-08-21 12:30:53.433171+00	1
f79571e6-9593-4c49-a177-7dc391184076	bac4f3af6270b332abe5943237fb5327f873fa890b96a83a7964524713cda8eb	2026-08-22 13:19:18.262826+00	20260822130000_add_indexes	\N	\N	2026-08-22 13:19:13.460338+00	1
eccc0a04-147e-4cb5-8d2e-c658d68b4c41	b53ad25f3940fdbe985b8e37facad10ec72a10273c567f2499e743cd9836dc15	2026-08-23 02:02:09.232588+00	20260823020000_audit_log_outcome_and_user_agent	\N	\N	2026-08-23 02:02:09.189705+00	1
24ce1f9d-6df3-4fcf-83d5-65a99255cc19	9c0ad070bae14d9feb3f23e9001da325146fc42fc0ac22f9d0fb13da9fb09117	2026-08-23 11:57:18.969451+00	20260823050000_drugs	\N	\N	2026-08-23 11:57:18.825271+00	1
cf3ca854-86f0-4719-80bd-a555320562f5	f1e191267acc0f4d8dbfd8bc6a8f1396caacd4b9274f64212cbebb0d26e9a9a4	2026-08-23 02:40:37.488572+00	20260823030000_appointments_no_overlap_exclusion_constraint	\N	\N	2026-08-23 02:40:37.264999+00	1
d0234689-adf1-43f4-a93e-ca34c21e6d91	5edc8031952433fe727c56f069acfbbbf977481a764bdc694be318f27c08e18a	2026-08-23 02:59:48.461368+00	20260823031500_appointments_no_overlap_room_exclusion_constraint	\N	\N	2026-08-23 02:59:48.423399+00	1
d534d550-ee92-41ef-8e90-9c92a95262fb	2dfc286f8a0640f8decf77987c81a481d22faac9f807d9e4e5c204e59320f4dc	2026-08-23 16:02:25.389958+00	20260823070000_appointment_payments_gst_and_invoice_numbering	\N	\N	2026-08-23 16:02:25.28991+00	1
ff82bd75-4a51-446b-92c0-eb762c18b535	b9563d469ed69e1078782af4fcde47ece3d309829ee8d8177793dd074fe032a6	2026-08-23 11:39:54.701625+00	20260823040000_clinics_one_primary_per_org	\N	\N	2026-08-23 11:39:54.64652+00	1
a1862b31-87b0-4f2e-8504-7c31ee9363e2	3487283611dc0f28c57059766a65b6a3a3d6fe571088471a3add762b2f4ca8b8	2026-08-23 12:12:31.20567+00	20260823060000_message_threads_assignment_and_sla	\N	\N	2026-08-23 12:12:31.13275+00	1
cae4dc3b-7cd4-49a9-a3f8-61af969a5de8	71b103002dd92bd75939f08f21122fa37b79f0fa4cb1540259a4530acea960ca	2026-08-23 16:02:25.272344+00	20260823060000_products_tax_depth	\N	\N	2026-08-23 16:02:25.191356+00	1
ffb119db-a616-4f2d-8e68-eed19bc12dac	3ea769fb2d12fcec6e3cae14d484f7447569c747122a4fcb3b8938bb9f82af75	2026-08-23 19:55:04.856989+00	20260824000000_scheduling_engine_session_mode	\N	\N	2026-08-23 19:55:04.694982+00	1
9cce4397-e1e8-49e7-87f6-94d518df28ca	d32ae6c00c1ac436de29e6bf1bfd86df0fc291598e701aef306d0617090c2875	2026-08-23 21:13:34.422452+00	20260824010000_clinical_records_encounters	\N	\N	2026-08-23 21:13:34.257036+00	1
a92479e5-63d2-44f9-84a1-16932e2a3c6e	2ab12a674c5bd8950c2b151897ad6d6e177ae69a1536e0fabf02ee75ab281310	2026-08-23 22:47:30.569592+00	20260824020000_prescriptions	\N	\N	2026-08-23 22:47:30.453193+00	1
4fbacc3a-bcb8-4346-9e5b-cb9f6130bd98	61c755af5f2d44fc49709fbbe0e1cdb0beec34988a5892e3d01769cef2d46602	2026-08-24 00:05:17.6999+00	20260824030000_queue_management	\N	\N	2026-08-24 00:05:17.609989+00	1
556b1c36-8605-4678-bc13-5f8a2be61614	2a73d99671528e5c8ee39bdc189f2f1ed4a1244003ade9c98cba89c5fa279e6a	2026-08-24 00:47:21.942489+00	20260824040000_patient_dedup_and_family	\N	\N	2026-08-24 00:47:21.860806+00	1
\.


--
-- Data for Name: clinician_types; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.clinician_types (id, name, description, is_active, created_at, updated_at) FROM stdin;
5ef14651-609b-41e8-8a67-41bb0b58bd3f	Cardiologist	Heart specialist	t	2026-08-17 00:49:33.545	2026-08-17 00:49:33.545
c6dbd718-9bda-4e32-9b51-d76e70e94a18	General Physician	\N	t	2026-08-17 07:18:35.73	2026-08-17 07:18:35.73
\.


--
-- Data for Name: room_types; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.room_types (id, name, description, is_active, created_at, updated_at) FROM stdin;
93a9efdc-ff38-4644-9c9d-e88ad6e5935e	Consultation Room		t	2026-08-17 01:50:24.53	2026-08-17 01:50:24.53
\.


--
-- Name: AppointmentPayments AppointmentPayments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AppointmentPayments"
    ADD CONSTRAINT "AppointmentPayments_pkey" PRIMARY KEY (id);


--
-- Name: AppointmentResources AppointmentResources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AppointmentResources"
    ADD CONSTRAINT "AppointmentResources_pkey" PRIMARY KEY (id);


--
-- Name: AppointmentStatusLogs AppointmentStatusLogs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AppointmentStatusLogs"
    ADD CONSTRAINT "AppointmentStatusLogs_pkey" PRIMARY KEY (id);


--
-- Name: Appointments Appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Appointments"
    ADD CONSTRAINT "Appointments_pkey" PRIMARY KEY (id);


--
-- Name: Attachments Attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Attachments"
    ADD CONSTRAINT "Attachments_pkey" PRIMARY KEY (id);


--
-- Name: AuditLogs AuditLogs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuditLogs"
    ADD CONSTRAINT "AuditLogs_pkey" PRIMARY KEY (id);


--
-- Name: ClientOrganizations ClientOrganizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ClientOrganizations"
    ADD CONSTRAINT "ClientOrganizations_pkey" PRIMARY KEY (id);


--
-- Name: ClinicianAvailability ClinicianAvailability_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ClinicianAvailability"
    ADD CONSTRAINT "ClinicianAvailability_pkey" PRIMARY KEY (id);


--
-- Name: ClinicianLanguages ClinicianLanguages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ClinicianLanguages"
    ADD CONSTRAINT "ClinicianLanguages_pkey" PRIMARY KEY (id);


--
-- Name: ClinicianServices ClinicianServices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ClinicianServices"
    ADD CONSTRAINT "ClinicianServices_pkey" PRIMARY KEY (id);


--
-- Name: Clinicians Clinicians_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Clinicians"
    ADD CONSTRAINT "Clinicians_pkey" PRIMARY KEY (id);


--
-- Name: Clinics Clinics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Clinics"
    ADD CONSTRAINT "Clinics_pkey" PRIMARY KEY (id);


--
-- Name: Diagnoses Diagnoses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Diagnoses"
    ADD CONSTRAINT "Diagnoses_pkey" PRIMARY KEY (id);


--
-- Name: Drugs Drugs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Drugs"
    ADD CONSTRAINT "Drugs_pkey" PRIMARY KEY (id);


--
-- Name: EmailTemplates EmailTemplates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmailTemplates"
    ADD CONSTRAINT "EmailTemplates_pkey" PRIMARY KEY (id);


--
-- Name: EncounterAddenda EncounterAddenda_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EncounterAddenda"
    ADD CONSTRAINT "EncounterAddenda_pkey" PRIMARY KEY (id);


--
-- Name: EncounterNotes EncounterNotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EncounterNotes"
    ADD CONSTRAINT "EncounterNotes_pkey" PRIMARY KEY (id);


--
-- Name: EncounterTemplates EncounterTemplates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EncounterTemplates"
    ADD CONSTRAINT "EncounterTemplates_pkey" PRIMARY KEY (id);


--
-- Name: Encounters Encounters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Encounters"
    ADD CONSTRAINT "Encounters_pkey" PRIMARY KEY (id);


--
-- Name: InvoiceSequences InvoiceSequences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InvoiceSequences"
    ADD CONSTRAINT "InvoiceSequences_pkey" PRIMARY KEY (id);


--
-- Name: Languages Languages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Languages"
    ADD CONSTRAINT "Languages_pkey" PRIMARY KEY (id);


--
-- Name: LunchBreaks LunchBreaks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LunchBreaks"
    ADD CONSTRAINT "LunchBreaks_pkey" PRIMARY KEY (id);


--
-- Name: MessageParticipants MessageParticipants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MessageParticipants"
    ADD CONSTRAINT "MessageParticipants_pkey" PRIMARY KEY (id);


--
-- Name: MessageThreads MessageThreads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MessageThreads"
    ADD CONSTRAINT "MessageThreads_pkey" PRIMARY KEY (id);


--
-- Name: Messages Messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Messages"
    ADD CONSTRAINT "Messages_pkey" PRIMARY KEY (id);


--
-- Name: NotificationPreferences NotificationPreferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."NotificationPreferences"
    ADD CONSTRAINT "NotificationPreferences_pkey" PRIMARY KEY (id);


--
-- Name: NotificationProviderConfig NotificationProviderConfig_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."NotificationProviderConfig"
    ADD CONSTRAINT "NotificationProviderConfig_pkey" PRIMARY KEY (id);


--
-- Name: Notifications Notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Notifications"
    ADD CONSTRAINT "Notifications_pkey" PRIMARY KEY (id);


--
-- Name: OrganizationSubscriptions OrganizationSubscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrganizationSubscriptions"
    ADD CONSTRAINT "OrganizationSubscriptions_pkey" PRIMARY KEY (id);


--
-- Name: PatientMerges PatientMerges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PatientMerges"
    ADD CONSTRAINT "PatientMerges_pkey" PRIMARY KEY (id);


--
-- Name: PatientRelations PatientRelations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PatientRelations"
    ADD CONSTRAINT "PatientRelations_pkey" PRIMARY KEY (id);


--
-- Name: Patients Patients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Patients"
    ADD CONSTRAINT "Patients_pkey" PRIMARY KEY (id);


--
-- Name: PaymentTransactions PaymentTransactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PaymentTransactions"
    ADD CONSTRAINT "PaymentTransactions_pkey" PRIMARY KEY (id);


--
-- Name: Permissions Permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Permissions"
    ADD CONSTRAINT "Permissions_pkey" PRIMARY KEY (id);


--
-- Name: PrescriptionItems PrescriptionItems_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PrescriptionItems"
    ADD CONSTRAINT "PrescriptionItems_pkey" PRIMARY KEY (id);


--
-- Name: PrescriptionSetItems PrescriptionSetItems_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PrescriptionSetItems"
    ADD CONSTRAINT "PrescriptionSetItems_pkey" PRIMARY KEY (id);


--
-- Name: PrescriptionSets PrescriptionSets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PrescriptionSets"
    ADD CONSTRAINT "PrescriptionSets_pkey" PRIMARY KEY (id);


--
-- Name: Prescriptions Prescriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Prescriptions"
    ADD CONSTRAINT "Prescriptions_pkey" PRIMARY KEY (id);


--
-- Name: ProductCancellationRules ProductCancellationRules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductCancellationRules"
    ADD CONSTRAINT "ProductCancellationRules_pkey" PRIMARY KEY (id);


--
-- Name: ProductCategories ProductCategories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductCategories"
    ADD CONSTRAINT "ProductCategories_pkey" PRIMARY KEY (id);


--
-- Name: ProductSubcategories ProductSubcategories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductSubcategories"
    ADD CONSTRAINT "ProductSubcategories_pkey" PRIMARY KEY (id);


--
-- Name: ProductVariations ProductVariations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductVariations"
    ADD CONSTRAINT "ProductVariations_pkey" PRIMARY KEY (id);


--
-- Name: Products Products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Products"
    ADD CONSTRAINT "Products_pkey" PRIMARY KEY (id);


--
-- Name: QueueEntries QueueEntries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."QueueEntries"
    ADD CONSTRAINT "QueueEntries_pkey" PRIMARY KEY (id);


--
-- Name: QueueEvents QueueEvents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."QueueEvents"
    ADD CONSTRAINT "QueueEvents_pkey" PRIMARY KEY (id);


--
-- Name: Resources Resources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Resources"
    ADD CONSTRAINT "Resources_pkey" PRIMARY KEY (id);


--
-- Name: Reviews Reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Reviews"
    ADD CONSTRAINT "Reviews_pkey" PRIMARY KEY (id);


--
-- Name: RolePermissions RolePermissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RolePermissions"
    ADD CONSTRAINT "RolePermissions_pkey" PRIMARY KEY (id);


--
-- Name: RoomBlocks RoomBlocks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RoomBlocks"
    ADD CONSTRAINT "RoomBlocks_pkey" PRIMARY KEY (id);


--
-- Name: Rooms Rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Rooms"
    ADD CONSTRAINT "Rooms_pkey" PRIMARY KEY (id);


--
-- Name: SpacerBlocks SpacerBlocks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SpacerBlocks"
    ADD CONSTRAINT "SpacerBlocks_pkey" PRIMARY KEY (id);


--
-- Name: StripeConfigurations StripeConfigurations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StripeConfigurations"
    ADD CONSTRAINT "StripeConfigurations_pkey" PRIMARY KEY (id);


--
-- Name: SubscriptionPlans SubscriptionPlans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SubscriptionPlans"
    ADD CONSTRAINT "SubscriptionPlans_pkey" PRIMARY KEY (id);


--
-- Name: TestResults TestResults_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TestResults"
    ADD CONSTRAINT "TestResults_pkey" PRIMARY KEY (id);


--
-- Name: UserProfiles UserProfiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserProfiles"
    ADD CONSTRAINT "UserProfiles_pkey" PRIMARY KEY (id);


--
-- Name: UserRoles UserRoles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserRoles"
    ADD CONSTRAINT "UserRoles_pkey" PRIMARY KEY (id);


--
-- Name: Users Users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: AppointmentResources appointment_resources_no_overlap; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AppointmentResources"
    ADD CONSTRAINT appointment_resources_no_overlap EXCLUDE USING gist (resource_id WITH =, tsrange(start_at, end_at, '[)'::text) WITH &&);


--
-- Name: Appointments appointments_no_overlapping_booking; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Appointments"
    ADD CONSTRAINT appointments_no_overlapping_booking EXCLUDE USING gist (clinician_id WITH =, tsrange(appointment_time, (appointment_time + ((duration_minutes)::double precision * '00:01:00'::interval)), '[)'::text) WITH &&) WHERE (((is_deleted = false) AND (status <> ALL (ARRAY['cancelled'::text, 'no_show'::text])) AND (booking_mode = 'slot'::text)));


--
-- Name: Appointments appointments_no_overlapping_room_booking; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Appointments"
    ADD CONSTRAINT appointments_no_overlapping_room_booking EXCLUDE USING gist (room_id WITH =, tsrange(appointment_time, (appointment_time + ((duration_minutes)::double precision * '00:01:00'::interval)), '[)'::text) WITH &&) WHERE (((is_deleted = false) AND (status <> ALL (ARRAY['cancelled'::text, 'no_show'::text])) AND (booking_mode = 'slot'::text)));


--
-- Name: clinician_types clinician_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinician_types
    ADD CONSTRAINT clinician_types_pkey PRIMARY KEY (id);


--
-- Name: room_types room_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.room_types
    ADD CONSTRAINT room_types_pkey PRIMARY KEY (id);


--
-- Name: AppointmentPayments_appointment_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AppointmentPayments_appointment_id_idx" ON public."AppointmentPayments" USING btree (appointment_id);


--
-- Name: AppointmentPayments_client_org_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AppointmentPayments_client_org_id_created_at_idx" ON public."AppointmentPayments" USING btree (client_org_id, created_at);


--
-- Name: AppointmentPayments_clinic_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AppointmentPayments_clinic_id_idx" ON public."AppointmentPayments" USING btree (clinic_id);


--
-- Name: AppointmentPayments_patient_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AppointmentPayments_patient_id_idx" ON public."AppointmentPayments" USING btree (patient_id);


--
-- Name: AppointmentPayments_razorpay_order_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AppointmentPayments_razorpay_order_id_idx" ON public."AppointmentPayments" USING btree (razorpay_order_id);


--
-- Name: AppointmentPayments_status_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AppointmentPayments_status_created_at_idx" ON public."AppointmentPayments" USING btree (status, created_at);


--
-- Name: AppointmentResources_appointment_id_resource_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "AppointmentResources_appointment_id_resource_id_key" ON public."AppointmentResources" USING btree (appointment_id, resource_id);


--
-- Name: AppointmentResources_resource_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AppointmentResources_resource_id_idx" ON public."AppointmentResources" USING btree (resource_id);


--
-- Name: AppointmentStatusLogs_appointment_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AppointmentStatusLogs_appointment_id_created_at_idx" ON public."AppointmentStatusLogs" USING btree (appointment_id, created_at);


--
-- Name: Appointments_booked_by_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Appointments_booked_by_user_id_idx" ON public."Appointments" USING btree (booked_by_user_id);


--
-- Name: Appointments_clinic_id_appointment_time_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Appointments_clinic_id_appointment_time_idx" ON public."Appointments" USING btree (clinic_id, appointment_time);


--
-- Name: Appointments_clinician_id_appointment_time_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Appointments_clinician_id_appointment_time_idx" ON public."Appointments" USING btree (clinician_id, appointment_time);


--
-- Name: Appointments_is_deleted_appointment_time_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Appointments_is_deleted_appointment_time_idx" ON public."Appointments" USING btree (is_deleted, appointment_time);


--
-- Name: Appointments_patient_id_appointment_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Appointments_patient_id_appointment_date_idx" ON public."Appointments" USING btree (patient_id, appointment_date);


--
-- Name: Appointments_product_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Appointments_product_id_idx" ON public."Appointments" USING btree (product_id);


--
-- Name: Appointments_room_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Appointments_room_id_idx" ON public."Appointments" USING btree (room_id);


--
-- Name: Attachments_encounter_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Attachments_encounter_id_idx" ON public."Attachments" USING btree (encounter_id);


--
-- Name: AuditLogs_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLogs_created_at_idx" ON public."AuditLogs" USING btree (created_at);


--
-- Name: AuditLogs_resource_resource_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLogs_resource_resource_id_idx" ON public."AuditLogs" USING btree (resource, resource_id);


--
-- Name: AuditLogs_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLogs_user_id_created_at_idx" ON public."AuditLogs" USING btree (user_id, created_at);


--
-- Name: ClientOrganizations_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ClientOrganizations_code_key" ON public."ClientOrganizations" USING btree (code);


--
-- Name: ClinicianAvailability_clinic_id_is_deleted_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ClinicianAvailability_clinic_id_is_deleted_idx" ON public."ClinicianAvailability" USING btree (clinic_id, is_deleted);


--
-- Name: ClinicianAvailability_clinician_id_is_deleted_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ClinicianAvailability_clinician_id_is_deleted_idx" ON public."ClinicianAvailability" USING btree (clinician_id, is_deleted);


--
-- Name: ClinicianAvailability_room_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ClinicianAvailability_room_id_idx" ON public."ClinicianAvailability" USING btree (room_id);


--
-- Name: ClinicianLanguages_clinician_id_language_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ClinicianLanguages_clinician_id_language_id_key" ON public."ClinicianLanguages" USING btree (clinician_id, language_id);


--
-- Name: ClinicianLanguages_language_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ClinicianLanguages_language_id_idx" ON public."ClinicianLanguages" USING btree (language_id);


--
-- Name: ClinicianServices_clinician_id_product_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ClinicianServices_clinician_id_product_id_key" ON public."ClinicianServices" USING btree (clinician_id, product_id);


--
-- Name: ClinicianServices_product_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ClinicianServices_product_id_idx" ON public."ClinicianServices" USING btree (product_id);


--
-- Name: Clinicians_clinic_id_is_deleted_is_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Clinicians_clinic_id_is_deleted_is_active_idx" ON public."Clinicians" USING btree (clinic_id, is_deleted, is_active);


--
-- Name: Clinicians_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Clinicians_email_key" ON public."Clinicians" USING btree (email);


--
-- Name: Clinics_client_org_id_is_deleted_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Clinics_client_org_id_is_deleted_idx" ON public."Clinics" USING btree (client_org_id, is_deleted);


--
-- Name: Diagnoses_encounter_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Diagnoses_encounter_id_idx" ON public."Diagnoses" USING btree (encounter_id);


--
-- Name: Drugs_client_org_id_is_deleted_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Drugs_client_org_id_is_deleted_idx" ON public."Drugs" USING btree (client_org_id, is_deleted);


--
-- Name: EncounterAddenda_encounter_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EncounterAddenda_encounter_id_created_at_idx" ON public."EncounterAddenda" USING btree (encounter_id, created_at);


--
-- Name: EncounterNotes_encounter_id_section_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "EncounterNotes_encounter_id_section_key" ON public."EncounterNotes" USING btree (encounter_id, section);


--
-- Name: EncounterTemplates_client_org_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EncounterTemplates_client_org_id_idx" ON public."EncounterTemplates" USING btree (client_org_id);


--
-- Name: EncounterTemplates_clinician_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EncounterTemplates_clinician_id_idx" ON public."EncounterTemplates" USING btree (clinician_id);


--
-- Name: Encounters_appointment_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Encounters_appointment_id_key" ON public."Encounters" USING btree (appointment_id);


--
-- Name: Encounters_client_org_id_patient_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Encounters_client_org_id_patient_id_idx" ON public."Encounters" USING btree (client_org_id, patient_id);


--
-- Name: Encounters_clinician_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Encounters_clinician_id_idx" ON public."Encounters" USING btree (clinician_id);


--
-- Name: Encounters_patient_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Encounters_patient_id_created_at_idx" ON public."Encounters" USING btree (patient_id, created_at);


--
-- Name: InvoiceSequences_clinic_id_series_financial_year_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "InvoiceSequences_clinic_id_series_financial_year_key" ON public."InvoiceSequences" USING btree (clinic_id, series, financial_year);


--
-- Name: Languages_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Languages_code_key" ON public."Languages" USING btree (code);


--
-- Name: Languages_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Languages_name_key" ON public."Languages" USING btree (name);


--
-- Name: LunchBreaks_clinic_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LunchBreaks_clinic_id_idx" ON public."LunchBreaks" USING btree (clinic_id);


--
-- Name: LunchBreaks_clinician_id_is_deleted_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LunchBreaks_clinician_id_is_deleted_idx" ON public."LunchBreaks" USING btree (clinician_id, is_deleted);


--
-- Name: MessageParticipants_thread_id_user_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "MessageParticipants_thread_id_user_id_key" ON public."MessageParticipants" USING btree (thread_id, user_id);


--
-- Name: MessageParticipants_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MessageParticipants_user_id_idx" ON public."MessageParticipants" USING btree (user_id);


--
-- Name: MessageThreads_assigned_to_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MessageThreads_assigned_to_user_id_idx" ON public."MessageThreads" USING btree (assigned_to_user_id);


--
-- Name: MessageThreads_client_org_id_last_activity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MessageThreads_client_org_id_last_activity_idx" ON public."MessageThreads" USING btree (client_org_id, last_activity);


--
-- Name: Messages_from_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Messages_from_id_idx" ON public."Messages" USING btree (from_id);


--
-- Name: Messages_thread_id_sent_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Messages_thread_id_sent_at_idx" ON public."Messages" USING btree (thread_id, sent_at);


--
-- Name: NotificationPreferences_user_id_event_type_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "NotificationPreferences_user_id_event_type_key" ON public."NotificationPreferences" USING btree (user_id, event_type);


--
-- Name: NotificationProviderConfig_client_org_id_channel_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "NotificationProviderConfig_client_org_id_channel_key" ON public."NotificationProviderConfig" USING btree (client_org_id, channel);


--
-- Name: Notifications_user_id_is_deleted_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Notifications_user_id_is_deleted_created_at_idx" ON public."Notifications" USING btree (user_id, is_deleted, created_at);


--
-- Name: OrganizationSubscriptions_client_org_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OrganizationSubscriptions_client_org_id_idx" ON public."OrganizationSubscriptions" USING btree (client_org_id);


--
-- Name: OrganizationSubscriptions_plan_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OrganizationSubscriptions_plan_id_idx" ON public."OrganizationSubscriptions" USING btree (plan_id);


--
-- Name: PatientMerges_merged_patient_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PatientMerges_merged_patient_id_idx" ON public."PatientMerges" USING btree (merged_patient_id);


--
-- Name: PatientMerges_surviving_patient_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PatientMerges_surviving_patient_id_idx" ON public."PatientMerges" USING btree (surviving_patient_id);


--
-- Name: PatientRelations_patient_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PatientRelations_patient_id_idx" ON public."PatientRelations" USING btree (patient_id);


--
-- Name: PatientRelations_patient_id_related_patient_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "PatientRelations_patient_id_related_patient_id_key" ON public."PatientRelations" USING btree (patient_id, related_patient_id);


--
-- Name: Patients_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Patients_email_idx" ON public."Patients" USING btree (email);


--
-- Name: Patients_is_deleted_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Patients_is_deleted_created_at_idx" ON public."Patients" USING btree (is_deleted, created_at);


--
-- Name: Patients_phone_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Patients_phone_idx" ON public."Patients" USING btree (phone);


--
-- Name: PaymentTransactions_client_org_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PaymentTransactions_client_org_id_created_at_idx" ON public."PaymentTransactions" USING btree (client_org_id, created_at);


--
-- Name: Permissions_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Permissions_name_key" ON public."Permissions" USING btree (name);


--
-- Name: PrescriptionItems_prescription_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PrescriptionItems_prescription_id_idx" ON public."PrescriptionItems" USING btree (prescription_id);


--
-- Name: PrescriptionSetItems_prescription_set_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PrescriptionSetItems_prescription_set_id_idx" ON public."PrescriptionSetItems" USING btree (prescription_set_id);


--
-- Name: PrescriptionSets_client_org_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PrescriptionSets_client_org_id_idx" ON public."PrescriptionSets" USING btree (client_org_id);


--
-- Name: PrescriptionSets_clinician_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PrescriptionSets_clinician_id_idx" ON public."PrescriptionSets" USING btree (clinician_id);


--
-- Name: Prescriptions_encounter_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Prescriptions_encounter_id_idx" ON public."Prescriptions" USING btree (encounter_id);


--
-- Name: Prescriptions_patient_id_issued_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Prescriptions_patient_id_issued_at_idx" ON public."Prescriptions" USING btree (patient_id, issued_at);


--
-- Name: ProductCancellationRules_client_org_id_is_deleted_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductCancellationRules_client_org_id_is_deleted_idx" ON public."ProductCancellationRules" USING btree (client_org_id, is_deleted);


--
-- Name: ProductCancellationRules_clinic_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductCancellationRules_clinic_id_idx" ON public."ProductCancellationRules" USING btree (clinic_id);


--
-- Name: ProductCancellationRules_product_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductCancellationRules_product_id_idx" ON public."ProductCancellationRules" USING btree (product_id);


--
-- Name: ProductCategories_client_org_id_is_deleted_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductCategories_client_org_id_is_deleted_idx" ON public."ProductCategories" USING btree (client_org_id, is_deleted);


--
-- Name: ProductSubcategories_category_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductSubcategories_category_id_idx" ON public."ProductSubcategories" USING btree (category_id);


--
-- Name: ProductSubcategories_client_org_id_is_deleted_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductSubcategories_client_org_id_is_deleted_idx" ON public."ProductSubcategories" USING btree (client_org_id, is_deleted);


--
-- Name: ProductVariations_product_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductVariations_product_id_idx" ON public."ProductVariations" USING btree (product_id);


--
-- Name: ProductVariations_sku_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ProductVariations_sku_key" ON public."ProductVariations" USING btree (sku);


--
-- Name: Products_category_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Products_category_id_idx" ON public."Products" USING btree (category_id);


--
-- Name: Products_client_org_id_is_deleted_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Products_client_org_id_is_deleted_idx" ON public."Products" USING btree (client_org_id, is_deleted);


--
-- Name: Products_clinic_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Products_clinic_id_idx" ON public."Products" USING btree (clinic_id);


--
-- Name: Products_sku_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Products_sku_key" ON public."Products" USING btree (sku);


--
-- Name: Products_subcategory_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Products_subcategory_id_idx" ON public."Products" USING btree (subcategory_id);


--
-- Name: QueueEntries_appointment_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "QueueEntries_appointment_id_key" ON public."QueueEntries" USING btree (appointment_id);


--
-- Name: QueueEntries_clinic_id_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "QueueEntries_clinic_id_status_idx" ON public."QueueEntries" USING btree (clinic_id, status);


--
-- Name: QueueEntries_clinician_id_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "QueueEntries_clinician_id_status_idx" ON public."QueueEntries" USING btree (clinician_id, status);


--
-- Name: QueueEvents_queue_entry_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "QueueEvents_queue_entry_id_created_at_idx" ON public."QueueEvents" USING btree (queue_entry_id, created_at);


--
-- Name: Resources_client_org_id_clinic_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Resources_client_org_id_clinic_id_idx" ON public."Resources" USING btree (client_org_id, clinic_id);


--
-- Name: Resources_clinic_id_is_bookable_is_deleted_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Resources_clinic_id_is_bookable_is_deleted_idx" ON public."Resources" USING btree (clinic_id, is_bookable, is_deleted);


--
-- Name: Reviews_appointment_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Reviews_appointment_id_idx" ON public."Reviews" USING btree (appointment_id);


--
-- Name: Reviews_clinic_id_is_deleted_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Reviews_clinic_id_is_deleted_idx" ON public."Reviews" USING btree (clinic_id, is_deleted);


--
-- Name: Reviews_clinician_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Reviews_clinician_id_idx" ON public."Reviews" USING btree (clinician_id);


--
-- Name: Reviews_patient_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Reviews_patient_id_idx" ON public."Reviews" USING btree (patient_id);


--
-- Name: RolePermissions_permission_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RolePermissions_permission_id_idx" ON public."RolePermissions" USING btree (permission_id);


--
-- Name: RolePermissions_role_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RolePermissions_role_id_idx" ON public."RolePermissions" USING btree (role_id);


--
-- Name: RoomBlocks_clinic_id_is_deleted_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RoomBlocks_clinic_id_is_deleted_idx" ON public."RoomBlocks" USING btree (clinic_id, is_deleted);


--
-- Name: RoomBlocks_room_id_block_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RoomBlocks_room_id_block_date_idx" ON public."RoomBlocks" USING btree (room_id, block_date);


--
-- Name: Rooms_clinic_id_is_deleted_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Rooms_clinic_id_is_deleted_idx" ON public."Rooms" USING btree (clinic_id, is_deleted);


--
-- Name: SpacerBlocks_clinic_id_is_deleted_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SpacerBlocks_clinic_id_is_deleted_idx" ON public."SpacerBlocks" USING btree (clinic_id, is_deleted);


--
-- Name: SpacerBlocks_clinician_id_block_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SpacerBlocks_clinician_id_block_date_idx" ON public."SpacerBlocks" USING btree (clinician_id, block_date);


--
-- Name: SpacerBlocks_room_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SpacerBlocks_room_id_idx" ON public."SpacerBlocks" USING btree (room_id);


--
-- Name: StripeConfigurations_client_org_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "StripeConfigurations_client_org_id_key" ON public."StripeConfigurations" USING btree (client_org_id);


--
-- Name: SubscriptionPlans_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "SubscriptionPlans_name_key" ON public."SubscriptionPlans" USING btree (name);


--
-- Name: TestResults_is_deleted_date_ordered_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TestResults_is_deleted_date_ordered_idx" ON public."TestResults" USING btree (is_deleted, date_ordered);


--
-- Name: TestResults_ordered_by_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TestResults_ordered_by_user_id_idx" ON public."TestResults" USING btree (ordered_by_user_id);


--
-- Name: TestResults_patient_id_date_ordered_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TestResults_patient_id_date_ordered_idx" ON public."TestResults" USING btree (patient_id, date_ordered);


--
-- Name: UserProfiles_client_org_id_is_deleted_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UserProfiles_client_org_id_is_deleted_idx" ON public."UserProfiles" USING btree (client_org_id, is_deleted);


--
-- Name: UserProfiles_clinic_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UserProfiles_clinic_id_idx" ON public."UserProfiles" USING btree (clinic_id);


--
-- Name: UserProfiles_clinician_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UserProfiles_clinician_id_idx" ON public."UserProfiles" USING btree (clinician_id);


--
-- Name: UserProfiles_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "UserProfiles_email_key" ON public."UserProfiles" USING btree (email);


--
-- Name: UserProfiles_patient_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UserProfiles_patient_id_idx" ON public."UserProfiles" USING btree (patient_id);


--
-- Name: UserProfiles_phone_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "UserProfiles_phone_key" ON public."UserProfiles" USING btree (phone);


--
-- Name: UserProfiles_role_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UserProfiles_role_id_idx" ON public."UserProfiles" USING btree (role_id);


--
-- Name: UserRoles_client_org_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UserRoles_client_org_id_idx" ON public."UserRoles" USING btree (client_org_id);


--
-- Name: clinician_types_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX clinician_types_name_key ON public.clinician_types USING btree (name);


--
-- Name: clinics_one_primary_per_org; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX clinics_one_primary_per_org ON public."Clinics" USING btree (client_org_id) WHERE ((is_primary = true) AND (is_deleted = false));


--
-- Name: org_role_name; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX org_role_name ON public."UserRoles" USING btree (client_org_id, name);


--
-- Name: room_types_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX room_types_name_key ON public.room_types USING btree (name);


--
-- Name: Diagnoses diagnoses_lock_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER diagnoses_lock_guard BEFORE DELETE OR UPDATE ON public."Diagnoses" FOR EACH ROW EXECUTE FUNCTION public.reject_write_if_encounter_locked();


--
-- Name: EncounterNotes encounter_notes_lock_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER encounter_notes_lock_guard BEFORE DELETE OR UPDATE ON public."EncounterNotes" FOR EACH ROW EXECUTE FUNCTION public.reject_write_if_encounter_locked();


--
-- Name: AppointmentPayments AppointmentPayments_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AppointmentPayments"
    ADD CONSTRAINT "AppointmentPayments_appointment_id_fkey" FOREIGN KEY (appointment_id) REFERENCES public."Appointments"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AppointmentPayments AppointmentPayments_client_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AppointmentPayments"
    ADD CONSTRAINT "AppointmentPayments_client_org_id_fkey" FOREIGN KEY (client_org_id) REFERENCES public."ClientOrganizations"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AppointmentPayments AppointmentPayments_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AppointmentPayments"
    ADD CONSTRAINT "AppointmentPayments_clinic_id_fkey" FOREIGN KEY (clinic_id) REFERENCES public."Clinics"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AppointmentPayments AppointmentPayments_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AppointmentPayments"
    ADD CONSTRAINT "AppointmentPayments_patient_id_fkey" FOREIGN KEY (patient_id) REFERENCES public."Patients"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AppointmentResources AppointmentResources_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AppointmentResources"
    ADD CONSTRAINT "AppointmentResources_appointment_id_fkey" FOREIGN KEY (appointment_id) REFERENCES public."Appointments"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AppointmentResources AppointmentResources_resource_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AppointmentResources"
    ADD CONSTRAINT "AppointmentResources_resource_id_fkey" FOREIGN KEY (resource_id) REFERENCES public."Resources"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AppointmentStatusLogs AppointmentStatusLogs_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AppointmentStatusLogs"
    ADD CONSTRAINT "AppointmentStatusLogs_appointment_id_fkey" FOREIGN KEY (appointment_id) REFERENCES public."Appointments"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AppointmentStatusLogs AppointmentStatusLogs_changed_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AppointmentStatusLogs"
    ADD CONSTRAINT "AppointmentStatusLogs_changed_by_user_id_fkey" FOREIGN KEY (changed_by_user_id) REFERENCES public."UserProfiles"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Appointments Appointments_booked_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Appointments"
    ADD CONSTRAINT "Appointments_booked_by_user_id_fkey" FOREIGN KEY (booked_by_user_id) REFERENCES public."UserProfiles"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Appointments Appointments_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Appointments"
    ADD CONSTRAINT "Appointments_clinic_id_fkey" FOREIGN KEY (clinic_id) REFERENCES public."Clinics"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Appointments Appointments_clinician_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Appointments"
    ADD CONSTRAINT "Appointments_clinician_id_fkey" FOREIGN KEY (clinician_id) REFERENCES public."Clinicians"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Appointments Appointments_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Appointments"
    ADD CONSTRAINT "Appointments_patient_id_fkey" FOREIGN KEY (patient_id) REFERENCES public."Patients"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Appointments Appointments_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Appointments"
    ADD CONSTRAINT "Appointments_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public."Products"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Appointments Appointments_product_variation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Appointments"
    ADD CONSTRAINT "Appointments_product_variation_id_fkey" FOREIGN KEY (product_variation_id) REFERENCES public."ProductVariations"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Appointments Appointments_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Appointments"
    ADD CONSTRAINT "Appointments_room_id_fkey" FOREIGN KEY (room_id) REFERENCES public."Rooms"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Attachments Attachments_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Attachments"
    ADD CONSTRAINT "Attachments_encounter_id_fkey" FOREIGN KEY (encounter_id) REFERENCES public."Encounters"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Attachments Attachments_uploaded_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Attachments"
    ADD CONSTRAINT "Attachments_uploaded_by_id_fkey" FOREIGN KEY (uploaded_by_id) REFERENCES public."UserProfiles"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AuditLogs AuditLogs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuditLogs"
    ADD CONSTRAINT "AuditLogs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."Users"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ClientOrganizations ClientOrganizations_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ClientOrganizations"
    ADD CONSTRAINT "ClientOrganizations_owner_user_id_fkey" FOREIGN KEY (owner_user_id) REFERENCES public."Users"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ClinicianAvailability ClinicianAvailability_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ClinicianAvailability"
    ADD CONSTRAINT "ClinicianAvailability_clinic_id_fkey" FOREIGN KEY (clinic_id) REFERENCES public."Clinics"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ClinicianAvailability ClinicianAvailability_clinician_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ClinicianAvailability"
    ADD CONSTRAINT "ClinicianAvailability_clinician_id_fkey" FOREIGN KEY (clinician_id) REFERENCES public."Clinicians"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ClinicianAvailability ClinicianAvailability_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ClinicianAvailability"
    ADD CONSTRAINT "ClinicianAvailability_room_id_fkey" FOREIGN KEY (room_id) REFERENCES public."Rooms"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ClinicianLanguages ClinicianLanguages_clinician_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ClinicianLanguages"
    ADD CONSTRAINT "ClinicianLanguages_clinician_id_fkey" FOREIGN KEY (clinician_id) REFERENCES public."Clinicians"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ClinicianLanguages ClinicianLanguages_language_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ClinicianLanguages"
    ADD CONSTRAINT "ClinicianLanguages_language_id_fkey" FOREIGN KEY (language_id) REFERENCES public."Languages"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ClinicianServices ClinicianServices_clinician_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ClinicianServices"
    ADD CONSTRAINT "ClinicianServices_clinician_id_fkey" FOREIGN KEY (clinician_id) REFERENCES public."Clinicians"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ClinicianServices ClinicianServices_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ClinicianServices"
    ADD CONSTRAINT "ClinicianServices_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public."Products"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Clinicians Clinicians_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Clinicians"
    ADD CONSTRAINT "Clinicians_clinic_id_fkey" FOREIGN KEY (clinic_id) REFERENCES public."Clinics"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Clinics Clinics_client_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Clinics"
    ADD CONSTRAINT "Clinics_client_org_id_fkey" FOREIGN KEY (client_org_id) REFERENCES public."ClientOrganizations"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Diagnoses Diagnoses_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Diagnoses"
    ADD CONSTRAINT "Diagnoses_encounter_id_fkey" FOREIGN KEY (encounter_id) REFERENCES public."Encounters"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Drugs Drugs_client_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Drugs"
    ADD CONSTRAINT "Drugs_client_org_id_fkey" FOREIGN KEY (client_org_id) REFERENCES public."ClientOrganizations"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: EncounterAddenda EncounterAddenda_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EncounterAddenda"
    ADD CONSTRAINT "EncounterAddenda_author_id_fkey" FOREIGN KEY (author_id) REFERENCES public."UserProfiles"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: EncounterAddenda EncounterAddenda_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EncounterAddenda"
    ADD CONSTRAINT "EncounterAddenda_encounter_id_fkey" FOREIGN KEY (encounter_id) REFERENCES public."Encounters"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EncounterNotes EncounterNotes_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EncounterNotes"
    ADD CONSTRAINT "EncounterNotes_encounter_id_fkey" FOREIGN KEY (encounter_id) REFERENCES public."Encounters"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EncounterTemplates EncounterTemplates_client_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EncounterTemplates"
    ADD CONSTRAINT "EncounterTemplates_client_org_id_fkey" FOREIGN KEY (client_org_id) REFERENCES public."ClientOrganizations"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: EncounterTemplates EncounterTemplates_clinician_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EncounterTemplates"
    ADD CONSTRAINT "EncounterTemplates_clinician_id_fkey" FOREIGN KEY (clinician_id) REFERENCES public."Clinicians"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Encounters Encounters_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Encounters"
    ADD CONSTRAINT "Encounters_appointment_id_fkey" FOREIGN KEY (appointment_id) REFERENCES public."Appointments"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Encounters Encounters_client_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Encounters"
    ADD CONSTRAINT "Encounters_client_org_id_fkey" FOREIGN KEY (client_org_id) REFERENCES public."ClientOrganizations"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Encounters Encounters_clinician_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Encounters"
    ADD CONSTRAINT "Encounters_clinician_id_fkey" FOREIGN KEY (clinician_id) REFERENCES public."Clinicians"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Encounters Encounters_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Encounters"
    ADD CONSTRAINT "Encounters_patient_id_fkey" FOREIGN KEY (patient_id) REFERENCES public."Patients"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Encounters Encounters_signed_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Encounters"
    ADD CONSTRAINT "Encounters_signed_by_id_fkey" FOREIGN KEY (signed_by_id) REFERENCES public."UserProfiles"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InvoiceSequences InvoiceSequences_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InvoiceSequences"
    ADD CONSTRAINT "InvoiceSequences_clinic_id_fkey" FOREIGN KEY (clinic_id) REFERENCES public."Clinics"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: LunchBreaks LunchBreaks_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LunchBreaks"
    ADD CONSTRAINT "LunchBreaks_clinic_id_fkey" FOREIGN KEY (clinic_id) REFERENCES public."Clinics"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: LunchBreaks LunchBreaks_clinician_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LunchBreaks"
    ADD CONSTRAINT "LunchBreaks_clinician_id_fkey" FOREIGN KEY (clinician_id) REFERENCES public."Clinicians"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MessageParticipants MessageParticipants_thread_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MessageParticipants"
    ADD CONSTRAINT "MessageParticipants_thread_id_fkey" FOREIGN KEY (thread_id) REFERENCES public."MessageThreads"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MessageParticipants MessageParticipants_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MessageParticipants"
    ADD CONSTRAINT "MessageParticipants_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."Users"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MessageThreads MessageThreads_assigned_to_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MessageThreads"
    ADD CONSTRAINT "MessageThreads_assigned_to_user_id_fkey" FOREIGN KEY (assigned_to_user_id) REFERENCES public."Users"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: MessageThreads MessageThreads_client_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MessageThreads"
    ADD CONSTRAINT "MessageThreads_client_org_id_fkey" FOREIGN KEY (client_org_id) REFERENCES public."ClientOrganizations"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Messages Messages_from_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Messages"
    ADD CONSTRAINT "Messages_from_id_fkey" FOREIGN KEY (from_id) REFERENCES public."Users"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Messages Messages_thread_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Messages"
    ADD CONSTRAINT "Messages_thread_id_fkey" FOREIGN KEY (thread_id) REFERENCES public."MessageThreads"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: NotificationPreferences NotificationPreferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."NotificationPreferences"
    ADD CONSTRAINT "NotificationPreferences_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."Users"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: NotificationProviderConfig NotificationProviderConfig_client_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."NotificationProviderConfig"
    ADD CONSTRAINT "NotificationProviderConfig_client_org_id_fkey" FOREIGN KEY (client_org_id) REFERENCES public."ClientOrganizations"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Notifications Notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Notifications"
    ADD CONSTRAINT "Notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."Users"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: OrganizationSubscriptions OrganizationSubscriptions_client_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrganizationSubscriptions"
    ADD CONSTRAINT "OrganizationSubscriptions_client_org_id_fkey" FOREIGN KEY (client_org_id) REFERENCES public."ClientOrganizations"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: OrganizationSubscriptions OrganizationSubscriptions_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrganizationSubscriptions"
    ADD CONSTRAINT "OrganizationSubscriptions_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES public."SubscriptionPlans"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PatientMerges PatientMerges_merged_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PatientMerges"
    ADD CONSTRAINT "PatientMerges_merged_by_user_id_fkey" FOREIGN KEY (merged_by_user_id) REFERENCES public."UserProfiles"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PatientMerges PatientMerges_merged_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PatientMerges"
    ADD CONSTRAINT "PatientMerges_merged_patient_id_fkey" FOREIGN KEY (merged_patient_id) REFERENCES public."Patients"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PatientMerges PatientMerges_surviving_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PatientMerges"
    ADD CONSTRAINT "PatientMerges_surviving_patient_id_fkey" FOREIGN KEY (surviving_patient_id) REFERENCES public."Patients"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PatientRelations PatientRelations_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PatientRelations"
    ADD CONSTRAINT "PatientRelations_patient_id_fkey" FOREIGN KEY (patient_id) REFERENCES public."Patients"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PatientRelations PatientRelations_related_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PatientRelations"
    ADD CONSTRAINT "PatientRelations_related_patient_id_fkey" FOREIGN KEY (related_patient_id) REFERENCES public."Patients"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PaymentTransactions PaymentTransactions_client_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PaymentTransactions"
    ADD CONSTRAINT "PaymentTransactions_client_org_id_fkey" FOREIGN KEY (client_org_id) REFERENCES public."ClientOrganizations"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PaymentTransactions PaymentTransactions_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PaymentTransactions"
    ADD CONSTRAINT "PaymentTransactions_subscription_id_fkey" FOREIGN KEY (subscription_id) REFERENCES public."OrganizationSubscriptions"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PrescriptionItems PrescriptionItems_drug_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PrescriptionItems"
    ADD CONSTRAINT "PrescriptionItems_drug_id_fkey" FOREIGN KEY (drug_id) REFERENCES public."Drugs"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PrescriptionItems PrescriptionItems_prescription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PrescriptionItems"
    ADD CONSTRAINT "PrescriptionItems_prescription_id_fkey" FOREIGN KEY (prescription_id) REFERENCES public."Prescriptions"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PrescriptionSetItems PrescriptionSetItems_drug_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PrescriptionSetItems"
    ADD CONSTRAINT "PrescriptionSetItems_drug_id_fkey" FOREIGN KEY (drug_id) REFERENCES public."Drugs"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PrescriptionSetItems PrescriptionSetItems_prescription_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PrescriptionSetItems"
    ADD CONSTRAINT "PrescriptionSetItems_prescription_set_id_fkey" FOREIGN KEY (prescription_set_id) REFERENCES public."PrescriptionSets"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PrescriptionSets PrescriptionSets_client_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PrescriptionSets"
    ADD CONSTRAINT "PrescriptionSets_client_org_id_fkey" FOREIGN KEY (client_org_id) REFERENCES public."ClientOrganizations"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PrescriptionSets PrescriptionSets_clinician_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PrescriptionSets"
    ADD CONSTRAINT "PrescriptionSets_clinician_id_fkey" FOREIGN KEY (clinician_id) REFERENCES public."Clinicians"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Prescriptions Prescriptions_clinician_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Prescriptions"
    ADD CONSTRAINT "Prescriptions_clinician_id_fkey" FOREIGN KEY (clinician_id) REFERENCES public."Clinicians"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Prescriptions Prescriptions_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Prescriptions"
    ADD CONSTRAINT "Prescriptions_encounter_id_fkey" FOREIGN KEY (encounter_id) REFERENCES public."Encounters"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Prescriptions Prescriptions_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Prescriptions"
    ADD CONSTRAINT "Prescriptions_patient_id_fkey" FOREIGN KEY (patient_id) REFERENCES public."Patients"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Prescriptions Prescriptions_repeated_from_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Prescriptions"
    ADD CONSTRAINT "Prescriptions_repeated_from_id_fkey" FOREIGN KEY (repeated_from_id) REFERENCES public."Prescriptions"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProductCancellationRules ProductCancellationRules_client_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductCancellationRules"
    ADD CONSTRAINT "ProductCancellationRules_client_org_id_fkey" FOREIGN KEY (client_org_id) REFERENCES public."ClientOrganizations"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProductCancellationRules ProductCancellationRules_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductCancellationRules"
    ADD CONSTRAINT "ProductCancellationRules_clinic_id_fkey" FOREIGN KEY (clinic_id) REFERENCES public."Clinics"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProductCancellationRules ProductCancellationRules_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductCancellationRules"
    ADD CONSTRAINT "ProductCancellationRules_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public."Products"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProductCategories ProductCategories_client_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductCategories"
    ADD CONSTRAINT "ProductCategories_client_org_id_fkey" FOREIGN KEY (client_org_id) REFERENCES public."ClientOrganizations"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ProductCategories ProductCategories_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductCategories"
    ADD CONSTRAINT "ProductCategories_clinic_id_fkey" FOREIGN KEY (clinic_id) REFERENCES public."Clinics"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ProductSubcategories ProductSubcategories_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductSubcategories"
    ADD CONSTRAINT "ProductSubcategories_category_id_fkey" FOREIGN KEY (category_id) REFERENCES public."ProductCategories"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProductSubcategories ProductSubcategories_client_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductSubcategories"
    ADD CONSTRAINT "ProductSubcategories_client_org_id_fkey" FOREIGN KEY (client_org_id) REFERENCES public."ClientOrganizations"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ProductSubcategories ProductSubcategories_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductSubcategories"
    ADD CONSTRAINT "ProductSubcategories_clinic_id_fkey" FOREIGN KEY (clinic_id) REFERENCES public."Clinics"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ProductVariations ProductVariations_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductVariations"
    ADD CONSTRAINT "ProductVariations_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public."Products"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Products Products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Products"
    ADD CONSTRAINT "Products_category_id_fkey" FOREIGN KEY (category_id) REFERENCES public."ProductCategories"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Products Products_client_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Products"
    ADD CONSTRAINT "Products_client_org_id_fkey" FOREIGN KEY (client_org_id) REFERENCES public."ClientOrganizations"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Products Products_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Products"
    ADD CONSTRAINT "Products_clinic_id_fkey" FOREIGN KEY (clinic_id) REFERENCES public."Clinics"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Products Products_subcategory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Products"
    ADD CONSTRAINT "Products_subcategory_id_fkey" FOREIGN KEY (subcategory_id) REFERENCES public."ProductSubcategories"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: QueueEntries QueueEntries_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."QueueEntries"
    ADD CONSTRAINT "QueueEntries_appointment_id_fkey" FOREIGN KEY (appointment_id) REFERENCES public."Appointments"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: QueueEntries QueueEntries_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."QueueEntries"
    ADD CONSTRAINT "QueueEntries_clinic_id_fkey" FOREIGN KEY (clinic_id) REFERENCES public."Clinics"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: QueueEntries QueueEntries_clinician_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."QueueEntries"
    ADD CONSTRAINT "QueueEntries_clinician_id_fkey" FOREIGN KEY (clinician_id) REFERENCES public."Clinicians"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: QueueEvents QueueEvents_changed_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."QueueEvents"
    ADD CONSTRAINT "QueueEvents_changed_by_user_id_fkey" FOREIGN KEY (changed_by_user_id) REFERENCES public."UserProfiles"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: QueueEvents QueueEvents_queue_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."QueueEvents"
    ADD CONSTRAINT "QueueEvents_queue_entry_id_fkey" FOREIGN KEY (queue_entry_id) REFERENCES public."QueueEntries"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Resources Resources_client_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Resources"
    ADD CONSTRAINT "Resources_client_org_id_fkey" FOREIGN KEY (client_org_id) REFERENCES public."ClientOrganizations"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Resources Resources_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Resources"
    ADD CONSTRAINT "Resources_clinic_id_fkey" FOREIGN KEY (clinic_id) REFERENCES public."Clinics"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Reviews Reviews_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Reviews"
    ADD CONSTRAINT "Reviews_appointment_id_fkey" FOREIGN KEY (appointment_id) REFERENCES public."Appointments"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Reviews Reviews_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Reviews"
    ADD CONSTRAINT "Reviews_clinic_id_fkey" FOREIGN KEY (clinic_id) REFERENCES public."Clinics"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Reviews Reviews_clinician_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Reviews"
    ADD CONSTRAINT "Reviews_clinician_id_fkey" FOREIGN KEY (clinician_id) REFERENCES public."Clinicians"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Reviews Reviews_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Reviews"
    ADD CONSTRAINT "Reviews_patient_id_fkey" FOREIGN KEY (patient_id) REFERENCES public."Patients"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RolePermissions RolePermissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RolePermissions"
    ADD CONSTRAINT "RolePermissions_permission_id_fkey" FOREIGN KEY (permission_id) REFERENCES public."Permissions"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RolePermissions RolePermissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RolePermissions"
    ADD CONSTRAINT "RolePermissions_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public."UserRoles"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RoomBlocks RoomBlocks_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RoomBlocks"
    ADD CONSTRAINT "RoomBlocks_clinic_id_fkey" FOREIGN KEY (clinic_id) REFERENCES public."Clinics"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RoomBlocks RoomBlocks_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RoomBlocks"
    ADD CONSTRAINT "RoomBlocks_room_id_fkey" FOREIGN KEY (room_id) REFERENCES public."Rooms"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Rooms Rooms_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Rooms"
    ADD CONSTRAINT "Rooms_clinic_id_fkey" FOREIGN KEY (clinic_id) REFERENCES public."Clinics"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SpacerBlocks SpacerBlocks_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SpacerBlocks"
    ADD CONSTRAINT "SpacerBlocks_clinic_id_fkey" FOREIGN KEY (clinic_id) REFERENCES public."Clinics"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SpacerBlocks SpacerBlocks_clinician_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SpacerBlocks"
    ADD CONSTRAINT "SpacerBlocks_clinician_id_fkey" FOREIGN KEY (clinician_id) REFERENCES public."Clinicians"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SpacerBlocks SpacerBlocks_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SpacerBlocks"
    ADD CONSTRAINT "SpacerBlocks_room_id_fkey" FOREIGN KEY (room_id) REFERENCES public."Rooms"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: StripeConfigurations StripeConfigurations_client_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StripeConfigurations"
    ADD CONSTRAINT "StripeConfigurations_client_org_id_fkey" FOREIGN KEY (client_org_id) REFERENCES public."ClientOrganizations"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TestResults TestResults_ordered_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TestResults"
    ADD CONSTRAINT "TestResults_ordered_by_user_id_fkey" FOREIGN KEY (ordered_by_user_id) REFERENCES public."UserProfiles"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TestResults TestResults_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TestResults"
    ADD CONSTRAINT "TestResults_patient_id_fkey" FOREIGN KEY (patient_id) REFERENCES public."Patients"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: UserProfiles UserProfiles_client_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserProfiles"
    ADD CONSTRAINT "UserProfiles_client_org_id_fkey" FOREIGN KEY (client_org_id) REFERENCES public."ClientOrganizations"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: UserProfiles UserProfiles_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserProfiles"
    ADD CONSTRAINT "UserProfiles_clinic_id_fkey" FOREIGN KEY (clinic_id) REFERENCES public."Clinics"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: UserProfiles UserProfiles_clinician_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserProfiles"
    ADD CONSTRAINT "UserProfiles_clinician_id_fkey" FOREIGN KEY (clinician_id) REFERENCES public."Clinicians"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: UserProfiles UserProfiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserProfiles"
    ADD CONSTRAINT "UserProfiles_id_fkey" FOREIGN KEY (id) REFERENCES public."Users"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: UserProfiles UserProfiles_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserProfiles"
    ADD CONSTRAINT "UserProfiles_patient_id_fkey" FOREIGN KEY (patient_id) REFERENCES public."Patients"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: UserProfiles UserProfiles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserProfiles"
    ADD CONSTRAINT "UserProfiles_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public."UserRoles"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: UserRoles UserRoles_client_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserRoles"
    ADD CONSTRAINT "UserRoles_client_org_id_fkey" FOREIGN KEY (client_org_id) REFERENCES public."ClientOrganizations"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict wenWwFhQg5WjGx6Odl6Wk4FKIDOqOXaDUGHfD6TkfmhkEVPNga9O5xq8jEAa7fY

