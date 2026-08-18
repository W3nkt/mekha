import { createClient } from "@supabase/supabase-js";
import data from "./lao-admin-divisions.json";

type SeedRow = {
  id: string;
  name_en: string;
  name_lo: string;
  sort_order: number;
};

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to seed Lao admin divisions.",
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function upsertInBatches(
  table: string,
  rows: SeedRow[],
  batchSize = 100,
) {
  for (let start = 0; start < rows.length; start += batchSize) {
    const { error } = await supabase
      .from(table)
      .upsert(rows.slice(start, start + batchSize), { onConflict: "id" });

    if (error) {
      throw new Error(`Failed to seed ${table}: ${error.message}`);
    }
  }
}

async function seed() {
  const provinces = data.provinces.map((province, sort_order) => ({
    id: province.id,
    name_en: province.name_en,
    name_lo: province.name_lo,
    sort_order,
  }));
  const districts = data.provinces.flatMap((province) =>
    province.districts.map((district, sort_order) => ({
      id: district.id,
      province_id: province.id,
      name_en: district.name_en,
      name_lo: district.name_lo,
      sort_order,
    })),
  );

  await upsertInBatches("lao_provinces", provinces);
  await upsertInBatches("lao_districts", districts);

  const [provinceResult, districtResult] = await Promise.all([
    supabase.from("lao_provinces").select("*", { count: "exact", head: true }),
    supabase.from("lao_districts").select("*", { count: "exact", head: true }),
  ]);

  if (provinceResult.error || districtResult.error) {
    throw new Error(
      `Failed to verify seed counts: ${provinceResult.error?.message ?? districtResult.error?.message}`,
    );
  }
  if (provinceResult.count !== 18 || (districtResult.count ?? 0) < 140) {
    throw new Error(
      `Unexpected seed counts: ${provinceResult.count} provinces, ${districtResult.count} districts.`,
    );
  }

  console.log(
    `Seeded and verified ${provinceResult.count} provinces and ${districtResult.count} districts.`,
  );
}

seed().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
