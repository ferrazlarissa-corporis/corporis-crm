import { NextResponse, type NextRequest } from "next/server";
import JSZip from "jszip";
import { createClient } from "@/lib/supabase/server";

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data: profile } = await supabase.schema("crm").from("profiles").select("ativo, role").eq("id", user.id).maybeSingle();
  if (!profile?.ativo || !["staff", "recepcao", "profissional", "gestao"].includes(profile.role)) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const [{ data: post }, { data: slides }, { data: ctaLead }] = await Promise.all([
    supabase.schema("conteudo").from("post").select("id, titulo, legenda, hashtags").eq("id", id).maybeSingle(),
    supabase.schema("conteudo").from("post_slide").select("ordem, template_id, imagem_url, template:template_id(tipo)").eq("post_id", id).order("ordem"),
    supabase.schema("conteudo").from("cta_lead").select("short_code").eq("post_id", id).maybeSingle(),
  ]);

  if (!post) {
    return NextResponse.json({ error: "Post não encontrado." }, { status: 404 });
  }

  const zip = new JSZip();

  const slidesComImagem = (slides ?? []).filter((s) => s.imagem_url);
  const imagens = await Promise.all(
    slidesComImagem.map(async (s) => {
      const res = await fetch(s.imagem_url as string);
      const buffer = Buffer.from(await res.arrayBuffer());
      const tipo = (s.template as unknown as { tipo: string } | null)?.tipo ?? "slide";
      return { ordem: s.ordem, tipo, buffer };
    }),
  );
  for (const img of imagens) {
    zip.file(`${String(img.ordem).padStart(2, "0")}-${img.tipo}.png`, img.buffer);
  }

  const legendaCompleta = [post.legenda ?? "", post.hashtags.length > 0 ? post.hashtags.join(" ") : ""].filter(Boolean).join("\n\n");
  zip.file("legenda.txt", legendaCompleta || "(sem legenda gerada ainda)");

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "") || "http://localhost:3000";
  const trackedLink = ctaLead?.short_code ? `${baseUrl}/l/${ctaLead.short_code}` : null;
  zip.file("link-bio.txt", trackedLink ? `Link rastreável (colar na bio/stories):\n${trackedLink}` : "(sem link rastreável gerado ainda)");

  const buffer = await zip.generateAsync({ type: "uint8array" });
  // TS tipa Uint8Array como genérico sobre ArrayBufferLike (inclui SharedArrayBuffer),
  // mas BlobPart exige especificamente ArrayBuffer — falso positivo, o buffer é real.
  const blob = new Blob([buffer as BlobPart], { type: "application/zip" });
  const filename = `corporis-${slugify(post.titulo) || "post"}.zip`;

  return new NextResponse(blob, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.length),
    },
  });
}
