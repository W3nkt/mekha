import type { Database } from "../database.types";
import type { CautionLevel, TrustSignalType } from "../enums";

export type SellerProfile =
  Database["public"]["Tables"]["seller_profiles"]["Row"];
export type SellerId = SellerProfile["id"];
export type SellerInsert =
  Database["public"]["Tables"]["seller_profiles"]["Insert"];
export type SellerUpdate =
  Database["public"]["Tables"]["seller_profiles"]["Update"];

export type PublicSellerProfile = Pick<
  SellerProfile,
  | "id"
  | "business_name"
  | "business_name_lao"
  | "description"
  | "province"
  | "district"
  | "logo_url"
  | "verification_status"
  | "facebook_url"
  | "tiktok_url"
  | "created_at"
>;

export type TrustSignal = {
  type: TrustSignalType;
  code: string;
  message_lo: string;
  message_en: string;
};

export type SellerTrustProfile = PublicSellerProfile & {
  caution_level: CautionLevel;
  trust_signals: TrustSignal[];
  verified_order_count: number;
  months_active: number;
  on_time_rate: number | null;
  dispute_rate: number | null;
};
