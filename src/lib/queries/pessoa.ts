import { createClient } from "@/lib/supabase/server";
import type { Database, PessoaStatus, Pilar, PessoaTipo } from "@/types/database";

export type PessoaRow = Database["core"]["Tables"]["pessoa"]["Row"];

export type PessoaListItem = {
  id: string;
  nome: string;
  telefone: string | null;
  tipo: PessoaTipo;
  status: PessoaStatus;
  pilar_principal: Pilar | null;
  responsavel: { id: string; nome: string } | null;
  leadConvertido?: boolean;
  semPlanoAtivo?: boolean;
  cadastroIncompleto?: boolean;
  precisaAtencao?: boolean;
};

const PESSOA_LIST_SELECT =
  "id, nome, cpf, nascimento, telefone, email, genero, tipo, status, pilar_principal, responsavel_id";

type PessoaListQueryRow = Pick<
  PessoaRow,
  | "id"
  | "nome"
  | "cpf"
  | "nascimento"
  | "telefone"
  | "email"
  | "genero"
  | "tipo"
  | "status"
  | "pilar_principal"
  | "responsavel_id"
>;

type PessoaListMeta = {
  leadConvertido?: boolean;
  semPlanoAtivo?: boolean;
};

function cadastroIncompleto(row: PessoaListQueryRow): boolean {
  return !row.cpf || !row.nascimento || !row.telefone || !row.email || !row.genero || !row.pilar_principal;
}

function mapPessoaListItem(
  row: PessoaListQueryRow,
  responsavelById: Map<string, { id: string; nome: string }>,
  meta: PessoaListMeta = {},
): PessoaListItem {
  const responsavel = row.responsavel_id ? (responsavelById.get(row.responsavel_id) ?? null) : null;
  const cadastroPendente = cadastroIncompleto(row);
  const semPlanoAtivo = meta.semPlanoAtivo ?? false;
  return {
    id: row.id,
    nome: row.nome,
    telefone: row.telefone,
    tipo: row.tipo,
    status: row.status,
    pilar_principal: row.pilar_principal,
    responsavel: responsavel ? { id: responsavel.id, nome: responsavel.nome } : null,
    leadConvertido: meta.leadConvertido,
    semPlanoAtivo,
    cadastroIncompleto: cadastroPendente,
    precisaAtencao: semPlanoAtivo || cadastroPendente,
  };
}

export type PessoaFilter = {
  status?: PessoaStatus;
  pilar?: Pilar;
};

export async function getPessoas(filter: PessoaFilter = {}): Promise<PessoaListItem[]> {
  const supabase = await createClient();
  let query = supabase
    .schema("core")
    .from("pessoa")
    .select(PESSOA_LIST_SELECT)
    .is("archived_at", null)
    .order("nome", { ascending: true });

  if (filter.status) query = query.eq("status", filter.status);
  if (filter.pilar) query = query.eq("pilar_principal", filter.pilar);

  const { data, error } = await query;
  if (error || !data) return [];

  const pessoas = data as PessoaListQueryRow[];
  const responsavelById = await getResponsavelById(supabase, pessoas);
  return pessoas.map((p) => mapPessoaListItem(p, responsavelById));
}

export async function getPessoasParaVenda(): Promise<PessoaListItem[]> {
  const supabase = await createClient();
  const [pessoasRes, leadsConvertidosRes, matriculasRes] = await Promise.all([
    supabase
      .schema("core")
      .from("pessoa")
      .select(PESSOA_LIST_SELECT)
      .is("archived_at", null)
      .order("nome", { ascending: true }),
    supabase
      .schema("crm")
      .from("leads")
      .select("pessoa_id")
      .eq("estagio", "convertido")
      .is("archived_at", null),
    supabase
      .schema("vendas")
      .from("matricula")
      .select("pessoa_id")
      .eq("status", "ativa"),
  ]);

  if (pessoasRes.error || !pessoasRes.data) return [];

  const pessoas = pessoasRes.data as PessoaListQueryRow[];
  const pessoasConvertidas = new Set(
    ((leadsConvertidosRes.data ?? []) as { pessoa_id: string | null }[])
      .map((l) => l.pessoa_id)
      .filter((id): id is string => Boolean(id)),
  );
  const pessoasComPlano = new Set(
    ((matriculasRes.data ?? []) as { pessoa_id: string }[]).map((m) => m.pessoa_id),
  );
  const elegiveis = pessoas.filter((p) => p.status !== "lead" || pessoasConvertidas.has(p.id));
  const responsavelById = await getResponsavelById(supabase, elegiveis);

  return elegiveis.map((p) =>
    mapPessoaListItem(p, responsavelById, {
      leadConvertido: pessoasConvertidas.has(p.id),
      semPlanoAtivo: !pessoasComPlano.has(p.id),
    }),
  );
}

async function getResponsavelById(
  supabase: Awaited<ReturnType<typeof createClient>>,
  pessoas: PessoaListQueryRow[],
): Promise<Map<string, { id: string; nome: string }>> {
  const responsavelIds = [
    ...new Set(pessoas.map((p) => p.responsavel_id).filter((id): id is string => Boolean(id))),
  ];
  const responsavelById = new Map<string, { id: string; nome: string }>();

  if (responsavelIds.length === 0) return responsavelById;

  const { data: profiles } = await supabase
    .schema("crm")
    .from("profiles")
    .select("id, nome")
    .in("id", responsavelIds);

  for (const profile of (profiles ?? []) as { id: string; nome: string }[]) {
    responsavelById.set(profile.id, profile);
  }

  return responsavelById;
}

export async function getPessoaById(id: string): Promise<PessoaRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("core")
    .from("pessoa")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as PessoaRow;
}
