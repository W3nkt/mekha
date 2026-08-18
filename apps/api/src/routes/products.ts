import { Hono, type Context } from "hono";
import {
  CreateProductSchema,
  ProductPhotoUploadSchema,
  UpdateProductSchema,
} from "@mekha/types";

import { apiError } from "../lib/errors";
import { createSupabaseClient } from "../lib/supabase";
import { requireAuth } from "../middleware/auth";
import { authenticatedRateLimit } from "../middleware/rateLimit";
import type { ApiEnv } from "../types";

export const productsRoute = new Hono<ApiEnv>();

productsRoute.use("*", requireAuth, authenticatedRateLimit);

const productFields =
  "id,seller_id,name,name_lao,photo_urls,price,cost,stock_count,sku,is_active,created_at,updated_at" as const;

const ownSeller = async (context: Context<ApiEnv>) => {
  const supabase = createSupabaseClient(context.env);
  const { data, error } = await supabase
    .from("seller_profiles")
    .select("id")
    .eq("owner_user_id", context.get("user").id)
    .maybeSingle();
  return { supabase, seller: data, error };
};

const photoUrlsValid = (
  photoUrls: string[],
  env: Context<ApiEnv>["env"],
  sellerId: string,
) => {
  const prefix = `${env.SUPABASE_URL}/storage/v1/object/public/product-photos/${sellerId}/`;
  return photoUrls.every((url) => url.startsWith(prefix));
};

productsRoute.get("/", async (context) => {
  const requestedSellerId = context.req.query("seller_id");
  const { supabase, seller, error } = await ownSeller(context);
  if (error)
    return apiError(context, 500, "INTERNAL_ERROR", "ກວດສອບຮ້ານຄ້າບໍ່ສຳເລັດ");
  if (!seller)
    return apiError(context, 403, "FORBIDDEN", "ທ່ານຍັງບໍ່ໄດ້ລົງທະບຽນຮ້ານຄ້າ");
  if (requestedSellerId && requestedSellerId !== seller.id)
    return apiError(context, 403, "FORBIDDEN", "ທ່ານບໍ່ມີສິດເບິ່ງສິນຄ້ານີ້");

  const { data, error: listError } = await supabase
    .from("products")
    .select(productFields)
    .eq("seller_id", seller.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(200);
  if (listError)
    return apiError(context, 500, "INTERNAL_ERROR", "ໂຫລດສິນຄ້າບໍ່ສຳເລັດ");
  return context.json({ data });
});

productsRoute.post("/", async (context) => {
  const parsed = CreateProductSchema.safeParse(
    await context.req.json().catch(() => null),
  );
  if (!parsed.success)
    return apiError(context, 400, "BAD_REQUEST", "ຂໍ້ມູນສິນຄ້າບໍ່ຖືກຕ້ອງ", {
      fields: parsed.error.flatten().fieldErrors,
    });
  const { supabase, seller, error } = await ownSeller(context);
  if (error)
    return apiError(context, 500, "INTERNAL_ERROR", "ກວດສອບຮ້ານຄ້າບໍ່ສຳເລັດ");
  if (!seller)
    return apiError(context, 403, "FORBIDDEN", "ທ່ານຍັງບໍ່ໄດ້ລົງທະບຽນຮ້ານຄ້າ");
  if (!photoUrlsValid(parsed.data.photo_urls, context.env, seller.id))
    return apiError(context, 400, "BAD_REQUEST", "ຮູບສິນຄ້າບໍ່ຖືກຕ້ອງ");

  const { data, error: insertError } = await supabase
    .from("products")
    .insert({ ...parsed.data, seller_id: seller.id })
    .select(productFields)
    .single();
  if (insertError)
    return apiError(context, 500, "INTERNAL_ERROR", "ສ້າງສິນຄ້າບໍ່ສຳເລັດ");
  return context.json({ data }, 201);
});

productsRoute.patch("/:id", async (context) => {
  const parsed = UpdateProductSchema.safeParse(
    await context.req.json().catch(() => null),
  );
  if (!parsed.success)
    return apiError(context, 400, "BAD_REQUEST", "ຂໍ້ມູນສິນຄ້າບໍ່ຖືກຕ້ອງ", {
      fields: parsed.error.flatten().fieldErrors,
    });
  if (Object.keys(parsed.data).length === 0)
    return apiError(context, 400, "BAD_REQUEST", "ບໍ່ມີຂໍ້ມູນທີ່ຈະບັນທຶກ");
  const { supabase, seller, error } = await ownSeller(context);
  if (error)
    return apiError(context, 500, "INTERNAL_ERROR", "ກວດສອບຮ້ານຄ້າບໍ່ສຳເລັດ");
  if (!seller)
    return apiError(context, 403, "FORBIDDEN", "ທ່ານຍັງບໍ່ໄດ້ລົງທະບຽນຮ້ານຄ້າ");
  if (
    parsed.data.photo_urls &&
    !photoUrlsValid(parsed.data.photo_urls, context.env, seller.id)
  )
    return apiError(context, 400, "BAD_REQUEST", "ຮູບສິນຄ້າບໍ່ຖືກຕ້ອງ");

  const { data, error: updateError } = await supabase
    .from("products")
    .update(parsed.data)
    .eq("id", context.req.param("id"))
    .eq("seller_id", seller.id)
    .select(productFields)
    .maybeSingle();
  if (updateError)
    return apiError(context, 500, "INTERNAL_ERROR", "ບັນທຶກສິນຄ້າບໍ່ສຳເລັດ");
  if (!data) return apiError(context, 404, "NOT_FOUND", "ບໍ່ພົບສິນຄ້າ");
  return context.json({ data });
});

productsRoute.delete("/:id", async (context) => {
  const { supabase, seller, error } = await ownSeller(context);
  if (error)
    return apiError(context, 500, "INTERNAL_ERROR", "ກວດສອບຮ້ານຄ້າບໍ່ສຳເລັດ");
  if (!seller)
    return apiError(context, 403, "FORBIDDEN", "ທ່ານຍັງບໍ່ໄດ້ລົງທະບຽນຮ້ານຄ້າ");

  const { data, error: deleteError } = await supabase
    .from("products")
    .update({ is_active: false })
    .eq("id", context.req.param("id"))
    .eq("seller_id", seller.id)
    .select("id")
    .maybeSingle();
  if (deleteError)
    return apiError(context, 500, "INTERNAL_ERROR", "ລຶບສິນຄ້າບໍ່ສຳເລັດ");
  if (!data) return apiError(context, 404, "NOT_FOUND", "ບໍ່ພົບສິນຄ້າ");
  return context.json({ data: { id: data.id } });
});

productsRoute.post("/photo-upload", async (context) => {
  const parsed = ProductPhotoUploadSchema.safeParse(
    await context.req.json().catch(() => null),
  );
  if (!parsed.success)
    return apiError(context, 400, "BAD_REQUEST", "ຊະນິດໄຟລ໌ບໍ່ຖືກຕ້ອງ");
  const { supabase, seller, error } = await ownSeller(context);
  if (error)
    return apiError(context, 500, "INTERNAL_ERROR", "ກວດສອບຮ້ານຄ້າບໍ່ສຳເລັດ");
  if (!seller)
    return apiError(context, 403, "FORBIDDEN", "ທ່ານຍັງບໍ່ໄດ້ລົງທະບຽນຮ້ານຄ້າ");

  const extension = parsed.data.mime_type === "image/png" ? "png" : "jpg";
  const path = `${seller.id}/${crypto.randomUUID()}.${extension}`;
  const { data, error: signError } = await supabase.storage
    .from("product-photos")
    .createSignedUploadUrl(path);
  if (signError)
    return apiError(context, 500, "INTERNAL_ERROR", "ສ້າງລິ້ງອັບໂຫລດບໍ່ສຳເລັດ");

  const { publicUrl } = supabase.storage
    .from("product-photos")
    .getPublicUrl(path).data;
  return context.json({
    upload_url: data.signedUrl,
    token: data.token,
    path,
    public_url: publicUrl,
  });
});
