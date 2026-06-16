import { createClient as createSupabase } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { Pilar } from "@/types/database";

/**
 * Ponte de posting OS → Corporis Finance (unidirecional, idempotente).
 * Regime de competência em duas fases (ver CLAUDE-OS §4 / data-model §6):
 *  - postAccrual:  reconhecimento (status 'pending', event_date = competência)
 *  - settleIncome: liquidação    (status 'cleared', cash_date = recebido_at)
 * Idempotência garantida pelo índice único (organization_id, source, external_id) no Finance.
 *
 * Tudo é no-op se as envs FINANCE_* não estiverem configuradas — nunca quebra o fluxo do OS.
 */

const SOURCE = "corporis_os";
const FALLBACK_CHART_CODE = "1.02"; // Fisioterapia genérica quando não há mapeamento por pilar.

type FinanceConfig = {
  url: string;
  serviceRoleKey: string;
  orgId: string;
  accountId: string;
};

function getFinanceConfig(): FinanceConfig | null {
  const url = process.env.FINANCE_SUPABASE_URL;
  const serviceRoleKey = process.env.FINANCE_SERVICE_ROLE_KEY;
  const orgId = process.env.FINANCE_ORG_ID;
  const accountId = process.env.FINANCE_DEFAULT_ACCOUNT_ID;
  if (!url || !serviceRoleKey || !orgId || !accountId) return null;
  return { url, serviceRoleKey, orgId, accountId };
}

export function isFinanceBridgeEnabled(): boolean {
  return getFinanceConfig() !== null;
}

function financeClient(cfg: FinanceConfig) {
  return createSupabase(cfg.url, cfg.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Código do chart_of_accounts (Finance) para o pilar, via financeiro.finance_map (OS). */
async function chartCodeForPilar(pilar: Pilar | null): Promise<string> {
  if (!pilar) return FALLBACK_CHART_CODE;
  const os = createServiceRoleClient();
  const { data } = await os.schema("financeiro").from("finance_map").select("chart_code").eq("pilar", pilar).maybeSingle();
  return (data as { chart_code: string } | null)?.chart_code ?? FALLBACK_CHART_CODE;
}

type FinanceClient = ReturnType<typeof financeClient>;

async function chartIdByCode(fin: FinanceClient, orgId: string, code: string): Promise<string | null> {
  const { data } = await fin
    .from("chart_of_accounts")
    .select("id")
    .eq("organization_id", orgId)
    .eq("code", code)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

export type PostResult = { ok: true; skipped?: boolean } | { ok: false; error: string };

export type AccrualInput = {
  lancamentoId: string;
  competencia: string;   // YYYY-MM-DD (event_date)
  vencimento: string;    // YYYY-MM-DD (cash_date provisório)
  valor: number;
  pessoaNome: string;
  pilar: Pilar | null;
  descricao: string;
};

/** Fase 1 — reconhecimento (accrual) na criação do lançamento a_receber. */
export async function postAccrual(input: AccrualInput): Promise<PostResult> {
  const cfg = getFinanceConfig();
  if (!cfg) return { ok: true, skipped: true };

  try {
    const fin = financeClient(cfg);
    const code = await chartCodeForPilar(input.pilar);
    const categoryId = await chartIdByCode(fin, cfg.orgId, code);
    if (!categoryId) return { ok: false, error: `chart_of_accounts code ${code} não encontrado no Finance.` };

    const { error } = await fin.from("transactions").upsert(
      {
        organization_id: cfg.orgId,
        account_id: cfg.accountId,
        category_id: categoryId,
        type: "income",
        amount: input.valor,
        description: `${input.pessoaNome} · ${input.descricao}`,
        event_date: input.competencia,
        cash_date: input.vencimento,
        status: "pending",
        source: SOURCE,
        external_id: input.lancamentoId,
      },
      { onConflict: "organization_id,source,external_id", ignoreDuplicates: true },
    );
    if (error) return { ok: false, error: error.message };

    // Marca o rastro no OS.
    const os = createServiceRoleClient();
    await os.schema("financeiro").from("lancamento")
      .update({ finance_tx_external_id: input.lancamentoId })
      .eq("id", input.lancamentoId);

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Fase 2 — liquidação (caixa) quando o lançamento vira 'recebido'. */
export async function settleIncome(lancamentoId: string, recebidoAtIso: string): Promise<PostResult> {
  const cfg = getFinanceConfig();
  if (!cfg) return { ok: true, skipped: true };

  try {
    const fin = financeClient(cfg);
    const { error } = await fin
      .from("transactions")
      .update({ cash_date: recebidoAtIso.slice(0, 10), status: "cleared" })
      .match({ organization_id: cfg.orgId, source: SOURCE, external_id: lancamentoId });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
