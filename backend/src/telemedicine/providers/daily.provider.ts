import { BadRequestException } from '@nestjs/common';

// P1-16 (PRD v2 D5, "vendor SDK, not a simulated stub") — Daily.co is the
// fixed telemedicine vendor. Unlike ai-clinical's transcription provider
// or notifications' SMS provider, video is NOT one of Hard Rule 9's
// admin-configurable-per-org exceptions, so this is a single, platform-
// wide credential from env (matching appointment-payments.service.ts's
// own RAZORPAY_KEY_ID/SECRET convention), not a per-org registry.
//
// Real REST API integration, honestly not live-verified in this
// environment (no real Daily.co account/API key configured) — the same
// documented status as ai-clinical's own Sarvam provider.

const DAILY_API_BASE = 'https://api.daily.co/v1';

function apiKey(): string {
  const key = process.env.DAILY_API_KEY;
  if (!key) throw new BadRequestException('Telemedicine video is not configured for this deployment');
  return key;
}

async function dailyFetch(path: string, init: RequestInit) {
  const res = await fetch(`${DAILY_API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey()}`, ...(init.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new BadRequestException(`Video provider error (${res.status}): ${body || res.statusText}`);
  }
  return res.json();
}

export interface CreatedRoom {
  name: string;
  url: string;
}

export const dailyProvider = {
  // Idempotent by room name is NOT assumed here — the caller
  // (telemedicine.service.ts) only ever calls this once per encounter,
  // inside the same find-then-create race guard getOrCreateEncounter()
  // already established as this codebase's pattern for a unique-per-
  // parent child row.
  async createRoom(roomName: string, validTo: Date): Promise<CreatedRoom> {
    const data = await dailyFetch('/rooms', {
      method: 'POST',
      body: JSON.stringify({
        name: roomName,
        privacy: 'private',
        properties: {
          exp: Math.floor(validTo.getTime() / 1000),
          enable_screenshare: true,
          enable_chat: false, // this app's own real messaging (REQ024/058) is the chat channel, not a second one
          eject_at_room_exp: true,
        },
      }),
    });
    return { name: data.name, url: data.url };
  },

  // A per-participant, short-lived join credential — regenerated on every
  // joinSession() call rather than cached, matching a real join link's
  // "valid for this visit, not reusable later" property (US-TEL-02).
  async createMeetingToken(roomName: string, userName: string, isOwner: boolean, exp: Date): Promise<string> {
    const data = await dailyFetch('/meeting-tokens', {
      method: 'POST',
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          user_name: userName,
          is_owner: isOwner,
          exp: Math.floor(exp.getTime() / 1000),
        },
      }),
    });
    return data.token;
  },
};

export type DailyProviderClient = typeof dailyProvider;
