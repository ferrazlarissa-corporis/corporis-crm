// E2E da ponte Finance — replica postAccrual/settleIncome contra o projeto Finance.
// Roda: node --env-file=.env.local scripts/finance-bridge-e2e.mjs
import { createClient } from "@supabase/supabase-js";

const URL = process.env.FINANCE_SUPABASE_URL;
const KEY = process.env.FINANCE_SERVICE_ROLE_KEY;
const ORG = process.env.FINANCE_ORG_ID;
const ACC = process.env.FINANCE_DEFAULT_ACCOUNT_ID;

if (!URL || !KEY || !ORG || !ACC) {
  console.error("FALTA env FINANCE_*"); process.exit(1);
}

const fin = createClient(URL, KEY, { auth: { persistSession: false } });
const SOURCE = "corporis_os";
const EXT = `e2e-${Date.now()}`;
const fail = (m, e) => { console.error("❌", m, e?.message ?? e ?? ""); process.exit(1); };

// chart 1.01 (Pilates)
const { data: chart, error: cErr } = await fin
  .from("chart_of_accounts").select("id").eq("organization_id", ORG).eq("code", "1.01").maybeSingle();
if (cErr || !chart) fail("chart 1.01 não encontrado", cErr);
console.log("✓ chart 1.01 id:", chart.id);

// Fase 1: accrual (upsert idempotente, status pending)
const accrual = {
  organization_id: ORG, account_id: ACC, category_id: chart.id, type: "income",
  amount: 123.45, description: "E2E OS · Mensalidade teste",
  event_date: "2026-06-01", cash_date: "2026-06-10", status: "pending",
  source: SOURCE, external_id: EXT,
};
let r = await fin.from("transactions").upsert(accrual, { onConflict: "organization_id,source,external_id", ignoreDuplicates: true });
if (r.error) fail("postAccrual insert", r.error);
console.log("✓ accrual inserido");

// idempotência: repost não duplica
r = await fin.from("transactions").upsert(accrual, { onConflict: "organization_id,source,external_id", ignoreDuplicates: true });
if (r.error) fail("repost", r.error);
const { count } = await fin.from("transactions").select("id", { count: "exact", head: true })
  .match({ organization_id: ORG, source: SOURCE, external_id: EXT });
if (count !== 1) fail(`idempotência falhou: count=${count}`);
console.log("✓ idempotente (count=1)");

// verifica pending
let { data: tx } = await fin.from("transactions").select("id,status,event_date,cash_date,amount,category_id")
  .match({ organization_id: ORG, source: SOURCE, external_id: EXT }).single();
console.log("  pending:", { status: tx.status, event_date: tx.event_date, cash_date: tx.cash_date, amount: tx.amount });
if (tx.status !== "pending" || tx.event_date !== "2026-06-01" || tx.category_id !== chart.id) fail("estado accrual incorreto");

// Fase 2: settle (cleared, cash_date = recebido)
r = await fin.from("transactions").update({ cash_date: "2026-06-09", status: "cleared" })
  .match({ organization_id: ORG, source: SOURCE, external_id: EXT });
if (r.error) fail("settleIncome", r.error);
({ data: tx } = await fin.from("transactions").select("status,cash_date")
  .match({ organization_id: ORG, source: SOURCE, external_id: EXT }).single());
console.log("  cleared:", tx);
if (tx.status !== "cleared" || tx.cash_date !== "2026-06-09") fail("estado settle incorreto");
console.log("✓ liquidação ok");

// cleanup
r = await fin.from("transactions").delete().match({ organization_id: ORG, source: SOURCE, external_id: EXT });
if (r.error) fail("cleanup", r.error);
console.log("✓ limpo. PONTE OK ✅");
