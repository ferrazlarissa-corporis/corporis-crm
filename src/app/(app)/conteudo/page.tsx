import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Conteúdo · Corporis" };

export default async function ConteudoPage() {
  const supabase = await createClient();
  const { data: pilares } = await supabase
    .schema("conteudo")
    .from("pilar_editorial")
    .select("id, nome, cor_token")
    .eq("ativo", true)
    .order("nome");

  return (
    <div className="flex min-h-dvh flex-col gap-6 p-8">
      <div>
        <h1 className="font-display text-3xl text-text-primary">Corporis Conteúdo</h1>
        <p className="type-body-sm mt-1 text-text-secondary">
          Módulo em construção — M2: tokens de marca e pilares editoriais.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {pilares?.map((pilar) => (
          <span
            key={pilar.id}
            className="type-ui-label rounded-[var(--radius-pill)] px-3 py-1.5"
            style={{
              backgroundColor: `color-mix(in srgb, var(--${pilar.cor_token}) 16%, transparent)`,
              color: `var(--${pilar.cor_token})`,
            }}
          >
            {pilar.nome}
          </span>
        ))}
      </div>
    </div>
  );
}
