import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

export const GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image";
export const OPENAI_IMAGE_MODEL = "gpt-image-1";

export type ImagemProvedor = "gemini" | "openai";

export type ImagemGerada = {
  base64: string;
  mimeType: string;
  modelo: string;
  provedor: ImagemProvedor;
};

async function gerarViaGemini(prompt: string): Promise<ImagemGerada> {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY não configurada.");

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: GEMINI_IMAGE_MODEL,
    contents: prompt,
  });

  const part = response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  if (!part?.inlineData?.data) {
    throw new Error("Gemini não retornou imagem.");
  }

  return {
    base64: part.inlineData.data,
    mimeType: part.inlineData.mimeType || "image/png",
    modelo: GEMINI_IMAGE_MODEL,
    provedor: "gemini",
  };
}

async function gerarViaOpenAI(prompt: string): Promise<ImagemGerada> {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY não configurada.");

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await openai.images.generate({
    model: OPENAI_IMAGE_MODEL,
    prompt,
    size: "1024x1024",
    n: 1,
  });

  const image = response.data?.[0];
  if (!image?.b64_json) {
    throw new Error("OpenAI não retornou imagem.");
  }

  return {
    base64: image.b64_json,
    mimeType: "image/png",
    modelo: OPENAI_IMAGE_MODEL,
    provedor: "openai",
  };
}

/**
 * Gera uma imagem a partir do prompt. `provedor` pede um provedor específico
 * (usado no "gerar de novo" com escolha manual); sem isso, tenta Gemini
 * (padrão, mais barato) e cai para OpenAI (premium) se o Gemini falhar.
 */
export async function gerarImagem(prompt: string, provedor?: ImagemProvedor): Promise<ImagemGerada> {
  if (provedor === "openai") return gerarViaOpenAI(prompt);
  if (provedor === "gemini") return gerarViaGemini(prompt);

  try {
    return await gerarViaGemini(prompt);
  } catch {
    return gerarViaOpenAI(prompt);
  }
}
