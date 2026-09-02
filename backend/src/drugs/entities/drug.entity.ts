import { ObjectType, Field, ID, Float, Int } from '@nestjs/graphql';

// REQ044/REQ016 — canonical (snake_case) dialect, no pre-existing frontend
// contract to match yet.
@ObjectType('Drug')
export class DrugType {
  @Field(() => ID) id: string;
  @Field() name: string;
  @Field({ nullable: true }) composition?: string;
  @Field({ nullable: true }) strength?: string;
  @Field({ nullable: true }) form?: string;
  @Field({ nullable: true }) schedule_class?: string;
  // REQ026 (US-RX-06) — Telemedicine Practice Guidelines list: O|A|B|prohibited.
  // Null means unclassified — prescriptions.service.ts's TPG guard treats
  // that as fail-closed (blocked in any tele mode), not "safe by default".
  @Field({ nullable: true }) tpg_list?: string;
  @Field({ nullable: true }) hsn?: string;
  @Field(() => Float, { nullable: true }) gst_rate?: number;
  @Field({ nullable: true }) manufacturer?: string;
  // REQ022 (US-PHR-09, scoped) — null means no low-stock alert configured.
  @Field(() => Int, { nullable: true }) reorder_level?: number;
  // REQ179 (IPD slice 3) — drug | consumable | implant | surgical_item | oxygen.
  @Field() item_type: string;
  // true when this row has no client_org_id — a platform-seeded reference
  // entry every tenant sees, as distinct from a tenant's own custom
  // addition. Derived, not a raw column: the resolver boundary should never
  // leak one tenant's client_org_id to another's client.
  @Field() is_platform_seeded: boolean;
}
