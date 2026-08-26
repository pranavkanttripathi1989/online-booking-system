-- P1-01/REQ144: optional per-tenant WhatsApp monthly conversation-spend cap,
-- surfaced on admin/Communications.jsx's spend card. Null = no cap configured.

ALTER TABLE "ClientOrganizations"
  ADD COLUMN "whatsapp_monthly_cap_paise" INTEGER;
