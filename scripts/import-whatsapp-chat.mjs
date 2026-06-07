#!/usr/bin/env node
/**
 * Importa conversas do WhatsApp (ZIP exports) como exemplos few-shot do agente.
 *
 * Uso:
 *   node scripts/import-whatsapp-chat.mjs [--dry-run] [zip1 zip2 ...]
 *
 * Sem ZIPs passados: processa tudo em exemplos-conversas/
 * --dry-run: só exibe o JSON, não grava no Supabase
 *
 * Requer: OPENAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * (carrega automaticamente de .env.local)
 */

import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync, readdirSync } from "fs";
import { execSync } from "child_process";
import { join, basename, resolve } from "path";
import { tmpdir } from "os";

// ─── Env ─────────────────────────────────────────────────────────────────────

function loadEnv() {
  const envFile = resolve(process.cwd(), ".env.local");
  if (!existsSync(envFile)) return;
  for (const line of readFileSync(envFile, "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const key = t.slice(0, eq).trim();
    const val = t.slice(eq + 1).trim();
    if (key && !process.env[key]) process.env[key] = val;
  }
}

loadEnv();

// ─── Whisper ─────────────────────────────────────────────────────────────────

async function transcribeAudio(filePath) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const data = readFileSync(filePath);
  const blob = new Blob([data], { type: "audio/ogg" });

  const form = new FormData();
  form.append("file", blob, "audio.ogg");
  form.append("model", "whisper-1");
  form.append("language", "pt");

  try {
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    if (!res.ok) {
      console.error(`    Whisper error ${res.status}:`, await res.text().catch(() => ""));
      return null;
    }
    const json = await res.json();
    return json.text?.trim() || null;
  } catch (err) {
    console.error("    Whisper fetch error:", err.message);
    return null;
  }
}

// ─── WhatsApp chat parser ─────────────────────────────────────────────────────

// Matches: [DD/MM/YYYY, HH:MM:SS] Sender: content
const MSG_RE = /^\[(\d{2}\/\d{2}\/\d{4}),\s*(\d{2}:\d{2}:\d{2})\]\s+([^:]+):\s*([\s\S]*)$/;

function parseChat(chatText) {
  const messages = [];
  let current = null;

  for (const raw of chatText.split("\n")) {
    // Remove invisible Unicode control characters (LTR mark, etc.)
    const line = raw.replace(/[‎‏‪-‮﻿]/g, "").trim();
    if (!line) continue;

    const m = line.match(MSG_RE);
    if (m) {
      if (current) messages.push(current);
      current = { sender: m[3].trim(), content: m[4].trim() };
    } else if (current) {
      current.content += "\n" + line;
    }
  }
  if (current) messages.push(current);
  return messages;
}

// ─── Content classification ───────────────────────────────────────────────────

const SYSTEM_PATTERNS = [
  /As mensagens e ligações são protegidas/,
  /está na sua lista de contatos/,
  /Esta conversa foi iniciada em/,
  /criptografia de ponta a ponta/,
  /Mensagem apagada/,
  /Você bloqueou este contato/,
  /Ligação de voz/,
  /Chamada de vídeo/,
  /Missed voice call/,
];

function classify(content) {
  for (const p of SYSTEM_PATTERNS) if (p.test(content)) return { type: "system" };

  const audioM =
    content.match(/<anexado:\s*([\w.\-]+\.opus)>/i) ||
    content.match(/<anexado:\s*([\w.\-]+\.ogg)>/i)  ||
    content.match(/<anexado:\s*([\w.\-]+\.m4a)>/i)  ||
    content.match(/<anexado:\s*([\w.\-]+\.mp3)>/i);
  if (audioM) return { type: "audio", filename: audioM[1] };

  if (
    /<anexado:\s*[\w.\-]+\.(webp|jpg|jpeg|png|gif)>/i.test(content) ||
    /imagem ocultada/i.test(content)   ||
    /figurinha omitida/i.test(content) ||
    /sticker omitido/i.test(content)
  ) return { type: "media" };

  if (/documento omitido/i.test(content) || /<anexado:.*\.pdf>/i.test(content))
    return { type: "document" };

  if (/^https?:\/\/\S+$/.test(content.trim())) return { type: "url" };

  const text = content
    .replace(/\s*<Mensagem editada>\s*$/g, "")
    // strip inline media placeholders that appear mid-message
    .replace(/<anexado:[^>]+>/g, "")
    .trim();

  return text ? { type: "text", text } : { type: "empty" };
}

// ─── Interesse por lead (enriquece o título no system prompt) ────────────────

const INTERESSE_MAP = {
  "Michelle":   "Pilates",
  "Andressa":   "Pilates Gestante",
  "Claudimara": "Fisioterapia Pélvica",
  "Isadora":    "Fisioterapia Pélvica",
  "Simone":     "Fisioterapia Pélvica Gestante",
};

function resolveTitle(zipName) {
  const name = zipName.replace(/^WhatsApp Chat - /, "").trim();
  const firstName = name.split(" ")[0];
  const interesse = INTERESSE_MAP[firstName];
  return interesse ? `${interesse} — ${name}` : name;
}

// ─── Process single ZIP ───────────────────────────────────────────────────────

async function processZip(zipPath, { maxMessages = 40 } = {}) {
  const title = resolveTitle(basename(zipPath, ".zip"));
  const tempDir = mkdtempSync(join(tmpdir(), "corporis-"));

  try {
    execSync(`unzip -q "${zipPath}" -d "${tempDir}"`, { stdio: "pipe" });

    const chatFile = join(tempDir, "_chat.txt");
    if (!existsSync(chatFile)) {
      console.error(`  [skip] no _chat.txt in ${zipPath}`);
      return null;
    }

    const raw = parseChat(readFileSync(chatFile, "utf-8"));
    const dialogo = [];
    let audioCount = 0;

    for (const msg of raw) {
      if (dialogo.length >= maxMessages) break;
      const c = classify(msg.content);

      if (["system", "media", "document", "url", "empty"].includes(c.type)) continue;

      const autor = msg.sender === "Corporis" ? "clara" : "lead";

      if (c.type === "audio") {
        const audioPath = join(tempDir, c.filename);
        if (existsSync(audioPath)) {
          process.stdout.write(`  Transcribing ${c.filename}... `);
          const transcript = await transcribeAudio(audioPath);
          if (transcript) {
            audioCount++;
            dialogo.push({ autor, texto: transcript });
            console.log(`"${transcript.slice(0, 60)}${transcript.length > 60 ? "..." : ""}"`);
          } else {
            console.log("(failed — skipped)");
          }
        }
        continue;
      }

      if (c.type === "text") {
        dialogo.push({ autor, texto: c.text });
      }
    }

    console.log(
      `  ${dialogo.length} mensagens | ${audioCount} áudio(s) transcritos | ${title}`
    );
    return { titulo: title, dialogo };
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

// ─── Supabase upsert ──────────────────────────────────────────────────────────

async function insertExamples(examples) {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");

  // Read current config id (crm schema via Accept-Profile header)
  const getRes = await fetch(
    `${url}/rest/v1/agent_config?select=id&limit=1`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Accept-Profile": "crm",
      },
    }
  );
  const rows = await getRes.json();
  if (!Array.isArray(rows) || !rows.length) {
    throw new Error(`No agent_config row found. Response: ${JSON.stringify(rows)}`);
  }
  const id = rows[0].id;

  const patchRes = await fetch(
    `${url}/rest/v1/agent_config?id=eq.${id}`,
    {
      method: "PATCH",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "Content-Profile": "crm",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ exemplos_conversa: examples }),
    }
  );

  if (!patchRes.ok) {
    const err = await patchRes.text().catch(() => "");
    throw new Error(`Supabase PATCH failed ${patchRes.status}: ${err}`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const zipArgs = args.filter((a) => !a.startsWith("--"));

  let zipPaths;
  if (zipArgs.length > 0) {
    zipPaths = zipArgs.map((p) => resolve(p));
  } else {
    const dir = resolve("exemplos-conversas");
    if (!existsSync(dir)) {
      console.error("exemplos-conversas/ not found. Pass ZIP paths as arguments.");
      process.exit(1);
    }
    zipPaths = readdirSync(dir)
      .filter((f) => f.endsWith(".zip"))
      .map((f) => join(dir, f));
  }

  if (zipPaths.length === 0) {
    console.error("No ZIP files found.");
    process.exit(1);
  }

  console.log(`Processing ${zipPaths.length} ZIP(s)...\n`);

  const examples = [];
  for (const zp of zipPaths) {
    console.log(`\n[ ${basename(zp)} ]`);
    const ex = await processZip(zp);
    if (ex && ex.dialogo.length > 0) examples.push(ex);
  }

  console.log(`\n─── ${examples.length} conversas prontas ───`);

  // Write JSON output regardless
  const outPath = resolve("exemplos-conversas/output.json");
  writeFileSync(outPath, JSON.stringify(examples, null, 2), "utf-8");
  console.log(`JSON salvo em: ${outPath}`);

  if (dryRun) {
    console.log("\n[--dry-run] Supabase skip.");
    return;
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("\nFaltam variáveis Supabase. Rode com --dry-run ou adicione ao .env.local.");
    process.exit(1);
  }

  console.log("\nInserindo no Supabase...");
  await insertExamples(examples);
  console.log("Pronto! exemplos_conversa atualizado em agent_config.");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
