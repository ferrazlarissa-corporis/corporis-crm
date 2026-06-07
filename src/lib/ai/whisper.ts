/**
 * Transcreve áudio via OpenAI Whisper API.
 * Fail-open: retorna null em qualquer erro ou quando OPENAI_API_KEY não está configurada.
 * Sem dependência do pacote `openai` — usa raw fetch + FormData.
 */
export async function transcribeAudio(base64: string, mimeType: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  try {
    const buf  = Buffer.from(base64, "base64");
    const blob = new Blob([buf], { type: mimeType });
    const form = new FormData();
    form.append("file", blob, "audio.ogg");
    form.append("model", "whisper-1");
    form.append("language", "pt");

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method:  "POST",
      headers: { Authorization: `Bearer ${key}` },
      body:    form,
    });

    if (!res.ok) return null;

    const json = await res.json() as { text?: string };
    return json.text?.trim() || null;
  } catch {
    return null;
  }
}
