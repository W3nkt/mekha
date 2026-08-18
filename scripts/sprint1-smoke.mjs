const apiUrl = (process.env.SMOKE_API_URL || "https://mekha-api.wen-kt2020.workers.dev").replace(/\/$/, "");
const webUrl = (process.env.SMOKE_WEB_URL || "https://mekha.satsx.net").replace(/\/$/, "");
const sellerId = process.env.SMOKE_SELLER_ID;

const checks = [];
const check = async (name, fn) => {
  try {
    await fn();
    checks.push(["PASS", name]);
  } catch (error) {
    checks.push(["FAIL", `${name}: ${error.message}`]);
  }
};
const expect = (condition, message) => {
  if (!condition) throw new Error(message);
};

await check("API health", async () => {
  const response = await fetch(`${apiUrl}/v1/health`);
  expect(response.ok, `HTTP ${response.status}`);
  expect((await response.json()).status === "ok", "health status is not ok");
});

await check("public search validates requests", async () => {
  const response = await fetch(`${apiUrl}/v1/sellers/search?q=&type=unknown`);
  expect(response.status === 400, `expected 400, got ${response.status}`);
});

await check("admin route rejects anonymous access", async () => {
  const response = await fetch(`${apiUrl}/v1/admin/verifications`);
  expect([401, 403].includes(response.status), `expected 401/403, got ${response.status}`);
});

await check("web app is reachable", async () => {
  const response = await fetch(`${webUrl}/search`);
  expect(response.ok, `HTTP ${response.status}`);
  const html = await response.text();
  expect(!html.includes("SUPABASE_SERVICE_ROLE_KEY"), "service role key leaked in HTML");
});

if (sellerId) {
  await check("public seller profile is reachable", async () => {
    const response = await fetch(`${apiUrl}/v1/sellers/${sellerId}`);
    expect(response.ok, `HTTP ${response.status}`);
    const payload = await response.json();
    expect(payload.data?.id === sellerId, "seller id mismatch");
    expect(!Object.hasOwn(payload.data ?? {}, "score"), "numeric trust score exposed");
  });

  await check("seller OG endpoint returns PNG", async () => {
    const response = await fetch(`${apiUrl}/v1/sellers/${sellerId}/og-image`);
    expect(response.ok, `HTTP ${response.status}`);
    expect(response.headers.get("content-type")?.startsWith("image/png"), "not image/png");
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(bytes.slice(0, 8).every((byte, index) => byte === [137, 80, 78, 71, 13, 10, 26, 10][index]), "invalid PNG signature");
  });
} else {
  checks.push(["SKIP", "seller profile/OG checks (set SMOKE_SELLER_ID)"]);
}

for (const [status, name] of checks) console.log(`${status.padEnd(4)} ${name}`);
if (checks.some(([status]) => status === "FAIL")) process.exitCode = 1;
