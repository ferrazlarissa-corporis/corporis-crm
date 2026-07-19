import { readFile } from "node:fs/promises";
import path from "node:path";

const FONTS_DIR = path.join(process.cwd(), "src/lib/ai/imagem/fonts");

export type SatoriFont = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 500;
  style: "normal";
};

let cached: Promise<SatoriFont[]> | null = null;

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

/** Carrega as fontes usadas nos slides (Quicksand = display, Ubuntu = body) uma vez por processo. */
export async function loadSlideFonts(): Promise<SatoriFont[]> {
  if (!cached) {
    cached = Promise.all([
      readFile(path.join(FONTS_DIR, "Quicksand-Regular.ttf")),
      readFile(path.join(FONTS_DIR, "Ubuntu-Regular.ttf")),
      readFile(path.join(FONTS_DIR, "Ubuntu-Medium.ttf")),
    ]).then(([quicksand, ubuntuRegular, ubuntuMedium]) => [
      { name: "Quicksand", data: toArrayBuffer(quicksand), weight: 400, style: "normal" },
      { name: "Ubuntu", data: toArrayBuffer(ubuntuRegular), weight: 400, style: "normal" },
      { name: "Ubuntu", data: toArrayBuffer(ubuntuMedium), weight: 500, style: "normal" },
    ] satisfies SatoriFont[]);
  }
  return cached;
}
