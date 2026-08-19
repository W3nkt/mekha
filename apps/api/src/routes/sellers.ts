import { Hono, type Context } from "hono";
import { encode as encodePng } from "@cf-wasm/png";
import {
  CreateSellerSchema,
  SellerExportSchema,
  SellerSearchSchema,
  SubmitVerificationSchema,
  UpdateSellerSchema,
  VerificationUploadSchema,
  type CautionLevel,
} from "@mekha/types";
import { computeTrustProfile } from "@mekha/utils";

import { apiError } from "../lib/errors";
import { buildCsv, formatDateDMY } from "../lib/csv";
import { createSupabaseClient } from "../lib/supabase";
import type { ApiEnv } from "../types";
import { requireAuth } from "../middleware/auth";

export const sellersRoute = new Hono<ApiEnv>();

const ownedSeller = async (context: Context<ApiEnv>) => {
  const sellerId = context.req.param("id") ?? "";
  const user = context.get("user");
  const supabase = createSupabaseClient(context.env);
  const result = await supabase
    .from("seller_profiles")
    .select("id")
    .eq("id", sellerId)
    .eq("owner_user_id", user.id)
    .maybeSingle();
  return { sellerId, supabase, seller: result.data, error: result.error };
};

sellersRoute.get("/", (context) => context.json({ data: [] }));

sellersRoute.post("/", requireAuth, async (context) => {
  const parsed = CreateSellerSchema.safeParse(
    await context.req.json().catch(() => null),
  );
  if (!parsed.success)
    return apiError(context, 400, "BAD_REQUEST", "ຂໍ້ມູນຮ້ານຄ້າບໍ່ຖືກຕ້ອງ", {
      fields: parsed.error.flatten().fieldErrors,
    });
  const user = context.get("user");
  if (user.phone !== parsed.data.phone)
    return apiError(
      context,
      403,
      "PHONE_MISMATCH",
      "ເບີໂທບໍ່ກົງກັບເບີທີ່ຢືນຢັນ",
    );
  const supabase = createSupabaseClient(context.env);
  const existing = await supabase
    .from("seller_profiles")
    .select("id")
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (existing.error)
    return apiError(context, 500, "INTERNAL_ERROR", "ບໍ່ສາມາດກວດສອບບັນຊີໄດ້");
  if (existing.data)
    return apiError(context, 409, "SELLER_EXISTS", "ບັນຊີນີ້ມີຮ້ານຄ້າແລ້ວ");
  const { data: location } = await supabase
    .from("lao_districts")
    .select("id,province_id")
    .eq("id", parsed.data.district)
    .eq("province_id", parsed.data.province)
    .maybeSingle();
  if (!location)
    return apiError(
      context,
      400,
      "INVALID_LOCATION",
      "ແຂວງ ຫຼື ເມືອງບໍ່ຖືກຕ້ອງ",
    );
  const upsertUser = await supabase
    .from("users")
    .upsert(
      { id: user.id, phone: user.phone, role: "seller" },
      { onConflict: "id" },
    );
  if (upsertUser.error)
    return apiError(context, 500, "INTERNAL_ERROR", "ບໍ່ສາມາດສ້າງໂປຣໄຟລ໌ໄດ້");
  const { data: seller, error } = await supabase
    .from("seller_profiles")
    .insert({
      ...parsed.data,
      business_name: parsed.data.business_name || parsed.data.business_name_lao,
      owner_user_id: user.id,
      verification_status: "unverified",
    })
    .select()
    .single();
  if (error)
    return apiError(
      context,
      error.code === "23505" ? 409 : 500,
      error.code === "23505" ? "SELLER_EXISTS" : "INTERNAL_ERROR",
      error.code === "23505"
        ? "ບັນຊີນີ້ມີຮ້ານຄ້າແລ້ວ"
        : "ບໍ່ສາມາດສ້າງຮ້ານຄ້າໄດ້",
    );
  const related = await Promise.all([
    supabase
      .from("subscriptions")
      .insert({ seller_id: seller.id, plan: "free", status: "active" }),
    supabase.from("audit_logs").insert({
      actor_id: user.id,
      event: "seller.created",
      entity_type: "seller_profile",
      entity_id: seller.id,
      metadata: { source: "phone_registration" },
    }),
  ]);
  if (related.some(({ error: relatedError }) => relatedError)) {
    await supabase.from("seller_profiles").delete().eq("id", seller.id);
    console.error(
      JSON.stringify({
        event: "seller_registration_related_write_failed",
        sellerId: seller.id,
      }),
    );
    return apiError(context, 500, "INTERNAL_ERROR", "ບໍ່ສາມາດສ້າງຮ້ານຄ້າໄດ້");
  }
  return context.json({ data: seller }, 201);
});

const dashboardProfileFields =
  "id,business_name,business_name_lao,description,province,district,logo_url,facebook_url,tiktok_url,verification_status,created_at" as const;

sellersRoute.get("/me", requireAuth, async (context) => {
  const supabase = createSupabaseClient(context.env);
  const { data: seller, error } = await supabase
    .from("seller_profiles")
    .select(dashboardProfileFields)
    .eq("owner_user_id", context.get("user").id)
    .maybeSingle();
  if (error)
    return apiError(context, 500, "INTERNAL_ERROR", "ໂຫລດຮ້ານຄ້າບໍ່ສຳເລັດ");
  if (!seller) return apiError(context, 404, "NOT_FOUND", "ບໍ່ພົບຮ້ານຄ້າ");

  const [subscription, verifications, verifiedOrders, anyOrders, customers] =
    await Promise.all([
      supabase
        .from("subscriptions")
        .select("plan")
        .eq("seller_id", seller.id)
        .eq("status", "active")
        .maybeSingle(),
      supabase
        .from("seller_verifications")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", seller.id),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", seller.id)
        .in("status", ["delivered", "settled"]),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", seller.id),
      supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", seller.id),
    ]);
  if (
    subscription.error ||
    verifications.error ||
    verifiedOrders.error ||
    anyOrders.error ||
    customers.error
  )
    return apiError(context, 500, "INTERNAL_ERROR", "ໂຫລດແດຊບອດບໍ່ສຳເລັດ");

  return context.json({
    data: {
      ...seller,
      subscription_plan: subscription.data?.plan ?? "free",
      checklist: {
        profile_created: true,
        verification_submitted: (verifications.count ?? 0) > 0,
        verification_approved: seller.verification_status === "verified",
        first_order_created: (anyOrders.count ?? 0) > 0,
      },
      stats: {
        total_orders: 0,
        verified_orders: verifiedOrders.count ?? 0,
        mtd_revenue: 0,
        total_customers: customers.count ?? 0,
      },
    },
  });
});

sellersRoute.patch("/:id", requireAuth, async (context) => {
  const parsed = UpdateSellerSchema.safeParse(
    await context.req.json().catch(() => null),
  );
  if (!parsed.success)
    return apiError(context, 400, "BAD_REQUEST", "ຂໍ້ມູນຮ້ານຄ້າບໍ່ຖືກຕ້ອງ", {
      fields: parsed.error.flatten().fieldErrors,
    });
  if (Object.keys(parsed.data).length === 0)
    return apiError(context, 400, "BAD_REQUEST", "ບໍ່ມີຂໍ້ມູນທີ່ຈະບັນທຶກ");

  const sellerId = context.req.param("id");
  const supabase = createSupabaseClient(context.env);
  const { data: seller, error: ownerError } = await supabase
    .from("seller_profiles")
    .select("id,province,district")
    .eq("id", sellerId)
    .eq("owner_user_id", context.get("user").id)
    .maybeSingle();
  if (ownerError)
    return apiError(context, 500, "INTERNAL_ERROR", "ກວດສອບຮ້ານຄ້າບໍ່ສຳເລັດ");
  if (!seller)
    return apiError(context, 403, "FORBIDDEN", "ທ່ານບໍ່ມີສິດແກ້ໄຂຮ້ານນີ້");

  if (parsed.data.province || parsed.data.district) {
    const nextProvince = parsed.data.province ?? seller.province;
    const nextDistrict = parsed.data.district ?? seller.district;
    const { data: location } = await supabase
      .from("lao_districts")
      .select("id")
      .eq("id", nextDistrict ?? "")
      .eq("province_id", nextProvince ?? "")
      .maybeSingle();
    if (!location)
      return apiError(
        context,
        400,
        "INVALID_LOCATION",
        "ແຂວງ ຫຼື ເມືອງບໍ່ຖືກຕ້ອງ",
      );
  }

  const { data: updated, error } = await supabase
    .from("seller_profiles")
    .update(parsed.data)
    .eq("id", sellerId)
    .select(dashboardProfileFields)
    .single();
  if (error)
    return apiError(context, 500, "INTERNAL_ERROR", "ບັນທຶກຮ້ານຄ້າບໍ່ສຳເລັດ");

  const audit = await supabase.from("audit_logs").insert({
    actor_id: context.get("user").id,
    event: "seller.profile_updated",
    entity_type: "seller_profile",
    entity_id: sellerId,
    metadata: { fields: Object.keys(parsed.data) },
  });
  if (audit.error)
    return apiError(context, 500, "INTERNAL_ERROR", "ບັນທຶກປະຫວັດບໍ່ສຳເລັດ");

  return context.json({ data: updated });
});

sellersRoute.post("/:id/verification-upload", requireAuth, async (context) => {
  const parsed = VerificationUploadSchema.safeParse(
    await context.req.json().catch(() => null),
  );
  if (!parsed.success)
    return apiError(context, 400, "BAD_REQUEST", "ປະເພດໄຟລ໌ບໍ່ຖືກຕ້ອງ");
  const {
    sellerId,
    supabase,
    seller,
    error: ownerError,
  } = await ownedSeller(context);
  if (ownerError)
    return apiError(context, 500, "INTERNAL_ERROR", "ກວດສອບຮ້ານຄ້າບໍ່ສຳເລັດ");
  if (!seller)
    return apiError(context, 403, "FORBIDDEN", "ທ່ານບໍ່ມີສິດຈັດການຮ້ານນີ້");
  const extension =
    parsed.data.mime_type === "image/jpeg"
      ? "jpg"
      : parsed.data.mime_type === "image/png"
        ? "png"
        : "pdf";
  const path = `${sellerId}/${crypto.randomUUID()}-${parsed.data.verification_type}.${extension}`;
  const { data, error } = await supabase.storage
    .from("verification-docs")
    .createSignedUploadUrl(path);
  if (error)
    return apiError(context, 500, "INTERNAL_ERROR", "ສ້າງລິ້ງອັບໂຫລດບໍ່ສຳເລັດ");
  const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString();
  const intent = await supabase.from("verification_upload_intents").insert({
    path,
    seller_id: sellerId,
    verification_type: parsed.data.verification_type,
    mime_type: parsed.data.mime_type,
    expires_at: expiresAt,
  });
  if (intent.error)
    return apiError(context, 500, "INTERNAL_ERROR", "ສ້າງການອັບໂຫລດບໍ່ສຳເລັດ");
  return context.json({
    upload_url: data.signedUrl,
    token: data.token,
    path,
    expires_at: expiresAt,
  });
});

sellersRoute.post("/:id/verification", requireAuth, async (context) => {
  const parsed = SubmitVerificationSchema.safeParse(
    await context.req.json().catch(() => null),
  );
  if (!parsed.success)
    return apiError(context, 400, "BAD_REQUEST", "ຂໍ້ມູນເອກະສານບໍ່ຖືກຕ້ອງ");
  const {
    sellerId,
    supabase,
    seller,
    error: ownerError,
  } = await ownedSeller(context);
  if (ownerError)
    return apiError(context, 500, "INTERNAL_ERROR", "ກວດສອບຮ້ານຄ້າບໍ່ສຳເລັດ");
  if (!seller)
    return apiError(context, 403, "FORBIDDEN", "ທ່ານບໍ່ມີສິດຈັດການຮ້ານນີ້");
  const pathPattern = new RegExp(
    `^${sellerId}/[0-9a-f-]{36}-${parsed.data.verification_type}\\.(jpg|png|pdf)$`,
  );
  if (!pathPattern.test(parsed.data.document_path))
    return apiError(context, 400, "BAD_REQUEST", "ທີ່ຢູ່ເອກະສານບໍ່ຖືກຕ້ອງ");
  const now = new Date().toISOString();
  const { data: intent, error: intentError } = await supabase
    .from("verification_upload_intents")
    .update({ expires_at: now })
    .eq("path", parsed.data.document_path)
    .eq("seller_id", sellerId)
    .eq("verification_type", parsed.data.verification_type)
    .gt("expires_at", now)
    .select("path")
    .maybeSingle();
  if (intentError)
    return apiError(
      context,
      500,
      "INTERNAL_ERROR",
      "ກວດສອບການອັບໂຫລດບໍ່ສຳເລັດ",
    );
  if (!intent)
    return apiError(context, 400, "BAD_REQUEST", "ລິ້ງອັບໂຫລດໝົດອາຍຸແລ້ວ");
  const downloaded = await supabase.storage
    .from("verification-docs")
    .download(parsed.data.document_path);
  if (downloaded.error || !downloaded.data)
    return apiError(context, 400, "BAD_REQUEST", "ບໍ່ພົບໄຟລ໌ທີ່ອັບໂຫລດ");
  if (downloaded.data.size > 10 * 1024 * 1024)
    return apiError(context, 400, "BAD_REQUEST", "ໄຟລ໌ໃຫຍ່ເກີນ 10MB");
  const digest = await crypto.subtle.digest(
    "SHA-256",
    await downloaded.data.arrayBuffer(),
  );
  const serverHash = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  if (serverHash !== parsed.data.file_hash) {
    await supabase.storage
      .from("verification-docs")
      .remove([parsed.data.document_path]);
    return apiError(
      context,
      422,
      "UNPROCESSABLE_ENTITY",
      "ໄຟລ໌ຖືກປ່ຽນແປງ ກະລຸນາອັບໂຫລດໃໝ່",
    );
  }
  const { data: verification, error } = await supabase
    .from("seller_verifications")
    .insert({
      seller_id: sellerId,
      verification_type: parsed.data.verification_type,
      document_paths: [parsed.data.document_path],
      status: "pending",
      submitted_data: {
        file_hash: serverHash,
        notes: parsed.data.notes ?? null,
      },
    })
    .select("id,status,created_at")
    .single();
  if (error)
    return apiError(context, 500, "INTERNAL_ERROR", "ບັນທຶກເອກະສານບໍ່ສຳເລັດ");
  const audit = await supabase.from("audit_logs").insert({
    actor_id: context.get("user").id,
    event: "seller.verification_submitted",
    entity_type: "seller_verification",
    entity_id: verification.id,
    metadata: {
      seller_id: sellerId,
      verification_type: parsed.data.verification_type,
      file_hash: serverHash,
    },
  });
  if (audit.error) {
    await supabase
      .from("seller_verifications")
      .delete()
      .eq("id", verification.id);
    return apiError(context, 500, "INTERNAL_ERROR", "ບັນທຶກປະຫວັດບໍ່ສຳເລັດ");
  }
  await supabase
    .from("verification_upload_intents")
    .delete()
    .eq("path", parsed.data.document_path);
  return context.json(
    { verification_id: verification.id, status: verification.status },
    201,
  );
});

sellersRoute.get("/:id/verifications", requireAuth, async (context) => {
  const {
    sellerId,
    supabase,
    seller,
    error: ownerError,
  } = await ownedSeller(context);
  if (ownerError)
    return apiError(context, 500, "INTERNAL_ERROR", "ກວດສອບຮ້ານຄ້າບໍ່ສຳເລັດ");
  if (!seller)
    return apiError(context, 403, "FORBIDDEN", "ທ່ານບໍ່ມີສິດເບິ່ງຂໍ້ມູນນີ້");
  const { data, error } = await supabase
    .from("seller_verifications")
    .select("id,verification_type,status,reviewer_notes,created_at")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });
  if (error)
    return apiError(context, 500, "INTERNAL_ERROR", "ໂຫລດສະຖານະບໍ່ສຳເລັດ");
  return context.json({ data });
});

sellersRoute.get("/:id/export", requireAuth, async (context) => {
  const parsed = SellerExportSchema.safeParse(context.req.query());
  if (!parsed.success)
    return apiError(context, 400, "BAD_REQUEST", "ຄຳຮ້ອງຂໍບໍ່ຖືກຕ້ອງ");
  const sellerId = context.req.param("id");
  const supabase = createSupabaseClient(context.env);
  const { data: seller, error: sellerError } = await supabase
    .from("seller_profiles")
    .select("id,business_name,business_name_lao")
    .eq("id", sellerId)
    .eq("owner_user_id", context.get("user").id)
    .maybeSingle();
  if (sellerError)
    return apiError(context, 500, "INTERNAL_ERROR", "ກວດສອບຮ້ານຄ້າບໍ່ສຳເລັດ");
  if (!seller)
    return apiError(context, 403, "FORBIDDEN", "ທ່ານບໍ່ມີສິດດາວໂຫລດຂໍ້ມູນນີ້");

  const { from, to } = parsed.data;
  const fromIso = from ? `${from}T00:00:00.000Z` : undefined;
  const toIso = to ? `${to}T23:59:59.999Z` : undefined;
  const todayDmy = formatDateDMY(new Date().toISOString());
  const rangeDmy = `${from ? formatDateDMY(fromIso!) : "—"} - ${to ? formatDateDMY(toIso!) : "—"}`;
  const sellerName = seller.business_name_lao || seller.business_name;

  if (parsed.data.type === "orders") {
    let query = supabase
      .from("orders")
      .select(
        "friendly_id,created_at,updated_at,amount,delivery_fee,payment_method,status,tracking_number,customers(phone),order_items(product_name,quantity,unit_price)",
      )
      .eq("seller_id", seller.id)
      .order("created_at", { ascending: true });
    if (fromIso) query = query.gte("created_at", fromIso);
    if (toIso) query = query.lte("created_at", toIso);
    const { data, error } = await query;
    if (error)
      return apiError(context, 500, "INTERNAL_ERROR", "ດຶງຂໍ້ມູນຄຳສັ່ງບໍ່ສຳເລັດ");

    const rows = (data ?? []).flatMap((order) =>
      (order.order_items.length > 0 ? order.order_items : [null]).map(
        (item) => [
          order.friendly_id,
          formatDateDMY(order.created_at),
          order.customers?.phone ?? "",
          item?.product_name ?? "",
          item?.quantity ?? "",
          item?.unit_price ?? "",
          order.amount,
          order.delivery_fee,
          order.payment_method ?? "",
          order.status,
          order.tracking_number ?? "",
          order.status === "settled" ? formatDateDMY(order.updated_at) : "",
          order.amount - order.delivery_fee,
        ],
      ),
    );
    const csv = buildCsv(
      [
        "order_id",
        "date",
        "customer_phone",
        "product_name",
        "quantity",
        "unit_price",
        "total_amount",
        "shipping_fee",
        "payment_method",
        "status",
        "tracking_number",
        "settlement_date",
        "net_amount",
      ],
      rows,
      [
        `# ລາຍງານທຸລະກຳ KhaiDee / ຂາຍດີ`,
        `# ຮ້ານ: ${sellerName}`,
        `# ຊ່ວງວັນທີ: ${rangeDmy}`,
        `# ສ້າງວັນທີ: ${todayDmy}`,
      ],
    );
    return context.body(`\uFEFF${csv}`, 200, {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="khaidee-orders-${from ?? "all"}_${to ?? "all"}.csv"`,
    });
  }

  if (parsed.data.type === "monthly") {
    let query = supabase
      .from("orders")
      .select("created_at,amount,delivery_fee,status,order_items(product_id,quantity)")
      .eq("seller_id", seller.id);
    if (fromIso) query = query.gte("created_at", fromIso);
    if (toIso) query = query.lte("created_at", toIso);
    const { data: orders, error } = await query;
    if (error)
      return apiError(context, 500, "INTERNAL_ERROR", "ດຶງຂໍ້ມູນຄຳສັ່ງບໍ່ສຳເລັດ");

    const productIds = [
      ...new Set(
        (orders ?? []).flatMap((order) =>
          order.order_items.flatMap((item) =>
            item.product_id ? [item.product_id] : [],
          ),
        ),
      ),
    ];
    const costByProduct = new Map<string, number>();
    if (productIds.length > 0) {
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id,cost")
        .in("id", productIds);
      if (productsError)
        return apiError(context, 500, "INTERNAL_ERROR", "ດຶງຂໍ້ມູນສິນຄ້າບໍ່ສຳເລັດ");
      for (const product of products ?? [])
        costByProduct.set(product.id, product.cost ?? 0);
    }

    type MonthAgg = {
      total_orders: number;
      total_revenue: number;
      total_cogs: number;
      total_shipping: number;
      returned_orders: number;
      disputed_orders: number;
    };
    const months = new Map<string, MonthAgg>();
    for (const order of orders ?? []) {
      const month = order.created_at.slice(0, 7);
      const agg = months.get(month) ?? {
        total_orders: 0,
        total_revenue: 0,
        total_cogs: 0,
        total_shipping: 0,
        returned_orders: 0,
        disputed_orders: 0,
      };
      agg.total_orders += 1;
      if (order.status === "returned") agg.returned_orders += 1;
      if (order.status === "disputed") agg.disputed_orders += 1;
      if (order.status === "settled") {
        agg.total_revenue += order.amount;
        agg.total_shipping += order.delivery_fee;
        for (const item of order.order_items)
          agg.total_cogs +=
            (item.product_id ? costByProduct.get(item.product_id) ?? 0 : 0) *
            item.quantity;
      }
      months.set(month, agg);
    }

    const rows = [...months.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, agg]) => [
        month,
        agg.total_orders,
        agg.total_revenue,
        agg.total_cogs,
        agg.total_shipping,
        agg.total_revenue - agg.total_cogs - agg.total_shipping,
        agg.returned_orders,
        agg.disputed_orders,
      ]);
    const csv = buildCsv(
      [
        "month",
        "total_orders",
        "total_revenue",
        "total_cogs",
        "total_shipping",
        "net_profit",
        "returned_orders",
        "disputed_orders",
      ],
      rows,
    );
    return context.body(`\uFEFF${csv}`, 200, {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="khaidee-monthly-${from ?? "all"}_${to ?? "all"}.csv"`,
    });
  }

  const [customersResponse, ordersResponse, placesResponse] =
    await Promise.all([
      supabase
        .from("customers")
        .select("id,phone,name,province,district,order_count")
        .eq("seller_id", seller.id),
      supabase
        .from("orders")
        .select("customer_id,amount,created_at")
        .eq("seller_id", seller.id)
        .not("customer_id", "is", null),
      Promise.all([
        supabase.from("lao_provinces").select("id,name_lo"),
        supabase.from("lao_districts").select("id,name_lo"),
      ]),
    ]);
  if (customersResponse.error || ordersResponse.error)
    return apiError(context, 500, "INTERNAL_ERROR", "ດຶງຂໍ້ມູນລູກຄ້າບໍ່ສຳເລັດ");
  const [provincesResponse, districtsResponse] = placesResponse;
  const provinceNames = new Map(
    (provincesResponse.data ?? []).map((row) => [row.id, row.name_lo]),
  );
  const districtNames = new Map(
    (districtsResponse.data ?? []).map((row) => [row.id, row.name_lo]),
  );

  const byCustomer = new Map<string, { total: number; last: string }>();
  for (const order of ordersResponse.data ?? []) {
    const key = order.customer_id!;
    const current = byCustomer.get(key);
    byCustomer.set(key, {
      total: (current?.total ?? 0) + order.amount,
      last:
        !current || order.created_at > current.last
          ? order.created_at
          : current.last,
    });
  }

  const rows = (customersResponse.data ?? []).map((customer) => {
    const stats = byCustomer.get(customer.id);
    return [
      customer.phone,
      customer.name ?? "",
      customer.province ? provinceNames.get(customer.province) ?? customer.province : "",
      customer.district ? districtNames.get(customer.district) ?? customer.district : "",
      customer.order_count,
      stats?.total ?? 0,
      stats ? formatDateDMY(stats.last) : "",
    ];
  });
  const csv = buildCsv(
    [
      "customer_phone",
      "customer_name",
      "province",
      "district",
      "order_count",
      "total_spent",
      "last_order_date",
    ],
    rows,
  );
  return context.body(`\uFEFF${csv}`, 200, {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="khaidee-customers-${from ?? "all"}_${to ?? "all"}.csv"`,
  });
});

const profileFields =
  "id,business_name,business_name_lao,province,logo_url,verification_status,users!inner(status)" as const;

const ogFont: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01111", "10000", "10000", "10111", "10001", "10001", "01111"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "10000", "11110", "00001", "00001", "11110"],
  "6": ["01110", "10000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
};

const drawText = (pixels: Uint8Array, text: string, x: number, y: number, scale: number, color: [number, number, number, number]) => {
  for (const [index, character] of [...text.toUpperCase()].entries()) {
    const glyph = ogFont[character] ?? ogFont[" "];
    for (let row = 0; row < glyph.length; row++) for (let column = 0; column < glyph[row].length; column++) if (glyph[row][column] === "1") {
      for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
        const px = x + index * 6 * scale + column * scale + dx;
        const py = y + row * scale + dy;
        if (px >= 0 && px < 1200 && py >= 0 && py < 630) pixels.set(color, (py * 1200 + px) * 4);
      }
    }
  }
};

const drawRect = (pixels: Uint8Array, x: number, y: number, width: number, height: number, color: [number, number, number, number]) => {
  for (let py = Math.max(0, y); py < Math.min(630, y + height); py++) for (let px = Math.max(0, x); px < Math.min(1200, x + width); px++) pixels.set(color, (py * 1200 + px) * 4);
};

const phoneCandidates = (value: string) => {
  const digits = value.replace(/\D/g, "");
  const laoDigits = digits.startsWith("856") ? `0${digits.slice(3)}` : digits;
  const internationalDigits = laoDigits.startsWith("0")
    ? `856${laoDigits.slice(1)}`
    : laoDigits;
  return [...new Set([value.trim(), laoDigits, `+${internationalDigits}`])];
};

sellersRoute.get("/search", async (context) => {
  const parsed = SellerSearchSchema.safeParse(context.req.query());
  if (!parsed.success) {
    return apiError(context, 400, "BAD_REQUEST", "Invalid seller search", {
      fields: parsed.error.flatten().fieldErrors,
    });
  }

  const { q, type, limit } = parsed.data;
  const literalPattern = q.replace(/[\\%_]/g, "\\$&");
  const supabase = createSupabaseClient(context.env);
  const baseQuery = () =>
    supabase
      .from("seller_profiles")
      .select(profileFields)
      .neq("verification_status", "suspended")
      .eq("users.status", "active")
      .limit(limit);

  const profileResponses =
    type === "shop_name"
      ? await Promise.all([
          baseQuery().ilike("business_name", `%${literalPattern}%`),
          baseQuery().ilike("business_name_lao", `%${literalPattern}%`),
        ])
      : [
          type === "phone"
            ? await baseQuery().in("phone", phoneCandidates(q))
            : await baseQuery().eq("etrust_id", q),
        ];

  const failedProfileQuery = profileResponses.find(({ error }) => error);
  if (failedProfileQuery?.error) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "seller_search_failed",
        requestId: context.get("requestId"),
        message: failedProfileQuery.error.message,
      }),
    );
    return apiError(context, 500, "INTERNAL_ERROR", "Seller search failed");
  }

  const profiles = Array.from(
    new Map(
      profileResponses
        .flatMap(({ data }) => data ?? [])
        .map(({ users: _users, ...profile }) => [profile.id, profile]),
    ).values(),
  ).slice(0, limit);

  if (profiles.length === 0) return context.json({ data: [] });

  const sellerIds = profiles.map(({ id }) => id);
  const [ordersResponse, risksResponse] = await Promise.all([
    supabase
      .from("orders")
      .select("seller_id")
      .in("seller_id", sellerIds)
      .in("status", ["delivered", "settled"]),
    supabase
      .from("risk_signals")
      .select("seller_id,severity")
      .in("seller_id", sellerIds)
      .eq("is_active", true)
      .eq("status", "active"),
  ]);

  if (ordersResponse.error || risksResponse.error) {
    return apiError(context, 500, "INTERNAL_ERROR", "Seller trust data failed");
  }

  const orderCounts = new Map<string, number>();
  for (const order of ordersResponse.data ?? []) {
    orderCounts.set(
      order.seller_id,
      (orderCounts.get(order.seller_id) ?? 0) + 1,
    );
  }
  const caution = new Map<string, CautionLevel>();
  for (const risk of risksResponse.data ?? []) {
    const next: CautionLevel =
      risk.severity === "critical"
        ? "high"
        : risk.severity === "warning"
          ? "medium"
          : "low";
    const current = caution.get(risk.seller_id);
    if (
      !current ||
      next === "high" ||
      (next === "medium" && current === "low")
    ) {
      caution.set(risk.seller_id, next);
    }
  }

  return context.json({
    data: profiles.map((profile) => ({
      ...profile,
      verified_order_count: orderCounts.get(profile.id) ?? 0,
      caution_level: caution.get(profile.id) ?? "insufficient_information",
    })),
  });
});

sellersRoute.get("/:id/og-image", async (context) => {
  const sellerId = context.req.param("id");
  if (!/^[0-9a-f-]{36}$/i.test(sellerId))
    return apiError(context, 404, "NOT_FOUND", "Seller not found");
  const supabase = createSupabaseClient(context.env);
  const [{ data: seller, error }, { count: orderCount, error: orderError }] =
    await Promise.all([
      supabase
        .from("seller_profiles")
        .select("business_name,business_name_lao,province,verification_status,users!inner(status)")
        .eq("id", sellerId)
        .neq("verification_status", "suspended")
        .eq("users.status", "active")
        .maybeSingle(),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", sellerId)
        .in("status", ["delivered", "settled"]),
    ]);
  if (error || orderError)
    return apiError(context, 500, "INTERNAL_ERROR", "Seller image failed");
  if (!seller) return apiError(context, 404, "NOT_FOUND", "Seller not found");
  const name = (seller.business_name || seller.business_name_lao || "MeKha seller").replace(/[^\x20-\x7E]/g, "").trim() || "MeKha seller";
  const province = (seller.province || "Lao P.D.R.").replace(/[^\x20-\x7E]/g, "").trim();
  const verified = seller.verification_status === "verified";
  const pixels = new Uint8Array(1200 * 630 * 4);
  drawRect(pixels, 0, 0, 1200, 630, [33, 59, 96, 255]);
  drawRect(pixels, 930, 0, 270, 180, [216, 138, 29, 90]);
  drawText(pixels, "MEKHA / LAOTRUST", 72, 75, 5, [246, 195, 108, 255]);
  drawText(pixels, name.slice(0, 28), 72, 205, 9, [255, 255, 255, 255]);
  drawText(pixels, province.slice(0, 28), 72, 320, 5, [219, 232, 245, 255]);
  drawRect(pixels, 72, 400, 500, 78, verified ? [216, 138, 29, 255] : [88, 113, 143, 255]);
  drawText(pixels, verified ? "VERIFIED SELLER" : "TRUST PROFILE", 105, 425, 5, [255, 255, 255, 255]);
  drawText(pixels, `${orderCount ?? 0} VERIFIED ORDERS`, 72, 545, 4, [219, 232, 245, 255]);
  const png = encodePng(pixels, 1200, 630);
  return new Response(png.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=300, s-maxage=3600",
      "Content-Disposition": `inline; filename="seller-${sellerId}.png"`,
    },
  });
});

sellersRoute.get("/:id", async (context) => {
  const sellerId = context.req.param("id");
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      sellerId,
    )
  ) {
    return apiError(context, 404, "NOT_FOUND", "Seller not found");
  }

  const supabase = createSupabaseClient(context.env);
  const profileResponse = await supabase
    .from("seller_profiles")
    .select("*,users!inner(status)")
    .eq("id", sellerId)
    .neq("verification_status", "suspended")
    .eq("users.status", "active")
    .maybeSingle();

  if (profileResponse.error) {
    return apiError(context, 500, "INTERNAL_ERROR", "Seller profile failed");
  }
  if (!profileResponse.data) {
    return apiError(context, 404, "NOT_FOUND", "Seller not found");
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const [
    verifications,
    identifiers,
    verifiedOrders,
    totalOrders,
    disputes,
    ratings,
    unresolvedReports,
    totalReports,
    risks,
    profileChanges,
    verifiedReviews,
    unverifiedReviews,
  ] = await Promise.all([
    supabase.from("seller_verifications").select("*").eq("seller_id", sellerId),
    supabase.from("seller_identifiers").select("*").eq("seller_id", sellerId),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", sellerId)
      .in("status", ["delivered", "settled"]),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", sellerId),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", sellerId)
      .eq("status", "disputed"),
    supabase
      .from("reviews")
      .select("rating_overall")
      .eq("seller_id", sellerId)
      .eq("status", "active")
      .eq("verified_transaction", true)
      .not("rating_overall", "is", null)
      .limit(1000),
    supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", sellerId)
      .in("status", ["pending", "under_review"]),
    supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", sellerId),
    supabase
      .from("risk_signals")
      .select("*")
      .eq("seller_id", sellerId)
      .eq("is_active", true)
      .eq("status", "active"),
    supabase
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .eq("entity_type", "seller_profile")
      .eq("entity_id", sellerId)
      .gte("created_at", sevenDaysAgo),
    supabase
      .from("reviews")
      .select("id,rating_overall,review_text,verified_transaction,created_at")
      .eq("seller_id", sellerId)
      .eq("status", "active")
      .eq("verified_transaction", true)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("reviews")
      .select("id,rating_overall,review_text,verified_transaction,created_at")
      .eq("seller_id", sellerId)
      .eq("status", "active")
      .eq("verified_transaction", false)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);
  if (
    verifications.error ||
    identifiers.error ||
    verifiedOrders.error ||
    totalOrders.error ||
    disputes.error ||
    ratings.error ||
    unresolvedReports.error ||
    totalReports.error ||
    risks.error ||
    profileChanges.error ||
    verifiedReviews.error ||
    unverifiedReviews.error
  ) {
    return apiError(context, 500, "INTERNAL_ERROR", "Seller trust data failed");
  }

  const reviewRatings = (ratings.data ?? []).flatMap(({ rating_overall }) =>
    rating_overall === null ? [] : [rating_overall],
  );
  const engine = computeTrustProfile({
    seller: profileResponse.data,
    verifications: verifications.data ?? [],
    identifiers: identifiers.data ?? [],
    orderStats: {
      total: totalOrders.count ?? 0,
      verified: verifiedOrders.count ?? 0,
      dispute_count: disputes.count ?? 0,
      on_time_count: null,
    },
    reviewStats: {
      count: reviewRatings.length,
      avg_rating: reviewRatings.length
        ? reviewRatings.reduce((sum, rating) => sum + rating, 0) /
          reviewRatings.length
        : 0,
    },
    reportStats: {
      unresolved: unresolvedReports.count ?? 0,
      total: totalReports.count ?? 0,
    },
    riskSignals: risks.data ?? [],
    profileChangeCount: profileChanges.count ?? 0,
    evaluatedAt: new Date().toISOString(),
  });

  const {
    id,
    business_name,
    business_name_lao,
    description,
    province,
    district,
    logo_url,
    facebook_url,
    tiktok_url,
    created_at,
  } = profileResponse.data;

  return context.json({
    data: {
      id,
      business_name,
      business_name_lao,
      description,
      province,
      district,
      logo_url,
      facebook_url,
      tiktok_url,
      created_at,
      verification_status: engine.verification_status,
      caution_level: engine.caution_level,
      trust_signals: engine.signals,
      ...engine.stats,
      reviews: [
        ...(verifiedReviews.data ?? []),
        ...(unverifiedReviews.data ?? []),
      ].map((review) => ({
        id: review.id,
        rating: review.rating_overall ?? 0,
        review_text: review.review_text,
        verified_transaction: review.verified_transaction,
        created_at: review.created_at,
      })),
    },
  });
});
