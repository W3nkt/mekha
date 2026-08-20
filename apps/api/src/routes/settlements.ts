import { Hono } from "hono";
import { ImportSettlementSchema } from "@mekha/types";

import { apiError } from "../lib/errors";
import { createSupabaseClient } from "../lib/supabase";
import { requireAuth } from "../middleware/auth";
import { authenticatedRateLimit } from "../middleware/rateLimit";
import { getCourierAdapter } from "../couriers";
import type { ApiEnv } from "../types";

export const settlementsRoute = new Hono<ApiEnv>();
settlementsRoute.use("*", requireAuth, authenticatedRateLimit);

const AMOUNT_TOLERANCE = 100;

settlementsRoute.post("/settlements/import", async (context) => {
  const parsed = ImportSettlementSchema.safeParse(
    await context.req.json().catch(() => null),
  );
  if (!parsed.success)
    return apiError(context, 400, "BAD_REQUEST", "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ");

  const supabase = createSupabaseClient(context.env);
  const user = context.get("user");
  const { data: seller, error: sellerError } = await supabase
    .from("seller_profiles")
    .select("id")
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (sellerError)
    return apiError(context, 500, "INTERNAL_ERROR", "ກວດສອບຮ້ານຄ້າບໍ່ສຳເລັດ");
  if (!seller)
    return apiError(context, 403, "FORBIDDEN", "ທ່ານຍັງບໍ່ໄດ້ລົງທະບຽນຮ້ານຄ້າ");

  const adapter = getCourierAdapter(context.env);
  let lines;
  try {
    lines = await adapter.parseCODSettlement(parsed.data.file_content);
  } catch {
    return apiError(context, 400, "BAD_REQUEST", "ອ່ານໄຟລ໌ CSV ບໍ່ສຳເລັດ");
  }
  if (lines.length === 0)
    return apiError(context, 400, "BAD_REQUEST", "ໄຟລ໌ບໍ່ມີຂໍ້ມູນ");

  const { data: settlement, error: settlementError } = await supabase
    .from("cod_settlements")
    .insert({
      seller_id: seller.id,
      courier: parsed.data.courier,
      import_status: "processing",
    })
    .select("id")
    .single();
  if (settlementError || !settlement)
    return apiError(context, 500, "INTERNAL_ERROR", "ສ້າງການນຳເຂົ້າບໍ່ສຳເລັດ");

  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("id,friendly_id,amount,tracking_number,status")
    .eq("seller_id", seller.id)
    .in(
      "tracking_number",
      lines.map((line) => line.tracking_number),
    );
  if (ordersError)
    return apiError(context, 500, "INTERNAL_ERROR", "ໂຫລດຄຳສັ່ງບໍ່ສຳເລັດ");
  const orderByTracking = new Map(
    (orders ?? []).map((order) => [order.tracking_number, order]),
  );

  let matchedCount = 0;
  let unmatchedCount = 0;
  const settlementLines = [];
  for (const line of lines) {
    const order = orderByTracking.get(line.tracking_number);
    if (!order) {
      unmatchedCount += 1;
      settlementLines.push({
        settlement_id: settlement.id,
        tracking_number: line.tracking_number,
        order_id: null,
        amount: line.amount,
        matched: false,
        discrepancy: null,
        status: "unmatched",
      });
      continue;
    }
    const discrepancy = line.amount - order.amount;
    const withinTolerance = Math.abs(discrepancy) < AMOUNT_TOLERANCE;
    if (line.status === "returned") {
      await supabase.from("orders").update({ status: "returned" }).eq("id", order.id);
      matchedCount += 1;
      settlementLines.push({
        settlement_id: settlement.id,
        tracking_number: line.tracking_number,
        order_id: order.id,
        amount: line.amount,
        matched: true,
        discrepancy,
        status: "matched",
      });
    } else if (line.status === "paid" && withinTolerance) {
      await supabase.from("orders").update({ status: "settled" }).eq("id", order.id);
      matchedCount += 1;
      settlementLines.push({
        settlement_id: settlement.id,
        tracking_number: line.tracking_number,
        order_id: order.id,
        amount: line.amount,
        matched: true,
        discrepancy,
        status: "matched",
      });
    } else {
      matchedCount += 1;
      settlementLines.push({
        settlement_id: settlement.id,
        tracking_number: line.tracking_number,
        order_id: order.id,
        amount: line.amount,
        matched: true,
        discrepancy,
        status: "discrepancy",
      });
    }
  }

  const { error: linesError } = await supabase
    .from("cod_settlement_lines")
    .insert(settlementLines);
  if (linesError) {
    await supabase.from("cod_settlements").delete().eq("id", settlement.id);
    return apiError(context, 500, "INTERNAL_ERROR", "ບັນທຶກຂໍ້ມູນບໍ່ສຳເລັດ");
  }

  await supabase
    .from("cod_settlements")
    .update({
      import_status: "completed",
      matched_count: matchedCount,
      unmatched_count: unmatchedCount,
    })
    .eq("id", settlement.id);

  await supabase.from("audit_logs").insert({
    actor_id: user.id,
    event: "settlement.imported",
    entity_type: "cod_settlement",
    entity_id: settlement.id,
    metadata: { courier: parsed.data.courier, matched: matchedCount, unmatched: unmatchedCount },
  });

  return context.json(
    {
      data: {
        settlement_id: settlement.id,
        matched_count: matchedCount,
        unmatched_count: unmatchedCount,
        discrepancy_count: settlementLines.filter((line) => line.status === "discrepancy").length,
        lines: settlementLines,
      },
    },
    201,
  );
});

settlementsRoute.get("/settlements", async (context) => {
  const supabase = createSupabaseClient(context.env);
  const { data: seller, error: sellerError } = await supabase
    .from("seller_profiles")
    .select("id")
    .eq("owner_user_id", context.get("user").id)
    .maybeSingle();
  if (sellerError)
    return apiError(context, 500, "INTERNAL_ERROR", "ກວດສອບຮ້ານຄ້າບໍ່ສຳເລັດ");
  if (!seller)
    return apiError(context, 403, "FORBIDDEN", "ທ່ານຍັງບໍ່ໄດ້ລົງທະບຽນຮ້ານຄ້າ");
  const { data, error } = await supabase
    .from("cod_settlements")
    .select("id,courier,import_status,matched_count,unmatched_count,imported_at")
    .eq("seller_id", seller.id)
    .order("imported_at", { ascending: false })
    .limit(20);
  if (error)
    return apiError(context, 500, "INTERNAL_ERROR", "ໂຫລດປະຫວັດບໍ່ສຳເລັດ");
  return context.json({ data });
});

settlementsRoute.get("/settlements/:id", async (context) => {
  const settlementId = context.req.param("id");
  const supabase = createSupabaseClient(context.env);
  const { data: seller, error: sellerError } = await supabase
    .from("seller_profiles")
    .select("id")
    .eq("owner_user_id", context.get("user").id)
    .maybeSingle();
  if (sellerError)
    return apiError(context, 500, "INTERNAL_ERROR", "ກວດສອບຮ້ານຄ້າບໍ່ສຳເລັດ");
  if (!seller)
    return apiError(context, 403, "FORBIDDEN", "ທ່ານຍັງບໍ່ໄດ້ລົງທະບຽນຮ້ານຄ້າ");
  const { data: settlement, error: settlementError } = await supabase
    .from("cod_settlements")
    .select("id,courier,import_status,matched_count,unmatched_count,imported_at")
    .eq("id", settlementId)
    .eq("seller_id", seller.id)
    .maybeSingle();
  if (settlementError)
    return apiError(context, 500, "INTERNAL_ERROR", "ໂຫລດລາຍງານບໍ່ສຳເລັດ");
  if (!settlement) return apiError(context, 404, "NOT_FOUND", "ບໍ່ພົບການນຳເຂົ້ານີ້");
  const { data: lines, error: linesError } = await supabase
    .from("cod_settlement_lines")
    .select("tracking_number,order_id,amount,matched,discrepancy,status,orders(friendly_id,amount)")
    .eq("settlement_id", settlementId);
  if (linesError)
    return apiError(context, 500, "INTERNAL_ERROR", "ໂຫລດລາຍລະອຽດບໍ່ສຳເລັດ");
  return context.json({ data: { ...settlement, lines: lines ?? [] } });
});
