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
};

const PESSOA_LIST_SELECT =
  "id, nome, telefone, tipo, status, pilar_principal, responsavel_id, profiles:responsavel_id(id, nome)";

type PessoaListQueryRow = Pick<
  PessoaRow,
  "id" | "nome" | "telefone" | "tipo" | "status" | "pilar_principal"
> & {
  profiles: { id: string; nome: string } | { id: string; nome: string }[] | null;
};

function mapPessoaListItem(row: PessoaListQueryRow): PessoaListItem {
  const responsavel = Array.isArray(row.profiles) ? (row.profiles[0] ?? null) : (row.profiles ?? null);
  return {
    id: row.id,
    nome: row.nome,
    telefone: row.telefone,
    tipo: row.tipo,
    status: row.status,
    pilar_principal: row.pilar_principal,
    responsavel: responsavel ? { id: responsavel.id, nome: responsavel.nome } : null,
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

  return (data as PessoaListQueryRow[]).map(mapPessoaListItem);
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
