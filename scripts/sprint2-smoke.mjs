const apiUrl = (process.env.SMOKE_API_URL || "https://mekha-api.wen-kt2020.workers.dev").replace(/\/$/, "");
const checks = [];
const check = async (name, fn) => {
  try { await fn(); checks.push(["PASS", name]); }
  catch (error) { checks.push(["FAIL", `${name}: ${error.message}`]); }
};
const expect = (value, message) => { if (!value) throw new Error(message); };

await check("API health", async () => {
  const response = await fetch(`${apiUrl}/v1/health`);
  expect(response.ok, `HTTP ${response.status}`);
});
await check("public seller search remains anonymous", async () => {
  const response = await fetch(`${apiUrl}/v1/sellers/search?q=xx&type=shop_name`);
  expect([200, 404].includes(response.status), `HTTP ${response.status}`);
});
await check("customer prefetch is protected", async () => {
  const response = await fetch(`${apiUrl}/v1/customers`);
  expect([401, 403].includes(response.status), `HTTP ${response.status}`);
});
await check("export is protected", async () => {
  const response = await fetch(`${apiUrl}/v1/sellers/test/export?type=orders`);
  expect([401, 403].includes(response.status), `HTTP ${response.status}`);
});
await check("Facebook webhook rejects unsigned payloads", async () => {
  const response = await fetch(`${apiUrl}/v1/webhooks/facebook`, { method: "POST", body: "{}" });
  expect(response.status === 403, `expected 403, got ${response.status}`);
});

for (const [status, name] of checks) console.log(`${status.padEnd(4)} ${name}`);
if (checks.some(([status]) => status === "FAIL")) process.exitCode = 1;
