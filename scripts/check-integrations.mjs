// Verifies Backboard and TigerData with the keys in .env.local.
// Run: npm run check:integrations
// Read-only for Backboard; for TigerData it creates the clinical_metrics
// table if missing (same as the app does on first use). Prints no secrets.
import pg from "pg";

const ok = (msg) => console.log(`  ✓ ${msg}`);
const bad = (msg) => console.log(`  ✗ ${msg}`);
let failures = 0;

async function checkBackboard() {
  console.log("\nBackboard (assistant memory)");
  const key = process.env.BACKBOARD_API_KEY?.trim();
  if (!key) return bad("BACKBOARD_API_KEY is not set, so memory is off");
  const base = (process.env.BACKBOARD_API_BASE?.trim() || "https://app.backboard.io/api").replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/assistants?limit=100`, {
      headers: { "X-API-Key": key },
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 401 || res.status === 403) {
      failures++;
      return bad(`key rejected (HTTP ${res.status}); check BACKBOARD_API_KEY`);
    }
    if (!res.ok) {
      failures++;
      return bad(`HTTP ${res.status}: ${(await res.text()).slice(0, 160)}`);
    }
    const list = await res.json();
    const circles = Array.isArray(list) ? list.filter((a) => a.name?.startsWith("familyr-circle-")) : [];
    ok("API key accepted");
    ok(`${circles.length} circle memory assistant(s) so far (created on first assistant message)`);
    for (const assistant of circles.slice(0, 5)) {
      const search = await fetch(`${base}/assistants/${assistant.assistant_id}/memories/search`, {
        method: "POST",
        headers: { "X-API-Key": key, "Content-Type": "application/json" },
        body: JSON.stringify({ query: "family routines and preferences", limit: 5 }),
        signal: AbortSignal.timeout(10_000),
      });
      const data = search.ok ? await search.json() : { memories: [] };
      console.log(`    ${assistant.name}: ${data.memories?.length ?? 0} memories`);
      for (const memory of data.memories ?? []) console.log(`      - ${memory.content}`);
    }
  } catch (error) {
    failures++;
    bad(`could not reach Backboard: ${error.message}`);
  }
}

async function checkTigerData() {
  console.log("\nTigerData (clinical time-series)");
  const url = process.env.TIGERDATA_DATABASE_URL?.trim();
  if (!url) return bad("TIGERDATA_DATABASE_URL is not set, so time-series is off");
  const parsed = new URL(url);
  if (!parsed.password) {
    failures++;
    return bad("the URL has no password. Use postgresql://tsdbadmin:<PASSWORD>@host:port/tsdb?sslmode=require");
  }
  const client = new pg.Client({
    connectionString: url,
    ssl: process.env.TIGERDATA_SSL === "disable" ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: 10_000,
  });
  try {
    await client.connect();
    ok(`connected to ${parsed.hostname}`);
    const ext = await client.query("select extversion from pg_extension where extname = 'timescaledb'");
    ext.rows[0] ? ok(`TimescaleDB ${ext.rows[0].extversion}`) : bad("TimescaleDB extension not found (trend chart needs time_bucket)");
    await client.query(`create table if not exists clinical_metrics (
      member_id text not null, measured_at timestamptz not null, metric_name text not null,
      metric_value double precision not null, source_channel text not null default 'hearth',
      post_id text not null, metadata jsonb not null default '{}'::jsonb)`);
    await client.query("select create_hypertable('clinical_metrics', by_range('measured_at'), if_not_exists => true)");
    await client.query(`create unique index if not exists clinical_metrics_dedupe_idx
      on clinical_metrics (member_id, post_id, metric_name, measured_at)`);
    await client.query(`create index if not exists clinical_metrics_member_metric_time_idx
      on clinical_metrics (member_id, metric_name, measured_at desc)`);
    ok("clinical_metrics hypertable ready");
    const { rows } = await client.query(
      "select member_id, count(*)::int as rows, max(measured_at) as latest from clinical_metrics group by member_id order by rows desc limit 10",
    );
    if (!rows.length) console.log("    no metrics yet: run the daily analysis once (see below)");
    for (const row of rows) console.log(`    ${row.member_id}: ${row.rows} metric rows, latest ${new Date(row.latest).toISOString()}`);
  } catch (error) {
    failures++;
    bad(error.message);
  } finally {
    await client.end().catch(() => {});
  }
}

await checkBackboard();
await checkTigerData();
console.log(`
To fill TigerData from existing posts (dev server running):
  curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/clinical/analyze
`);
process.exit(failures ? 1 : 0);
