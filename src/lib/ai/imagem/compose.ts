import { ImageResponse } from "@vercel/og";
import sharp from "sharp";
import { loadSlideFonts } from "./fonts";
import { buildSlideElement, type SlideJsxInput } from "./slide-jsx";

/**
 * Renderiza um slide (fundo + camada de texto/marca) via Satori e exporta o PNG final.
 * Não chama IA — o fundo já vem pronto (URL do bucket, gerado no M7) ou cai no gradiente
 * do pilar quando ainda não há fundo. Por isso trocar o texto é instantâneo.
 */
export async function composeSlide(input: SlideJsxInput): Promise<Buffer> {
  const fonts = await loadSlideFonts();
  const element = buildSlideElement(input);

  const response = new ImageResponse(element, {
    width: 1080,
    height: 1350,
    fonts,
  });

  const arrayBuffer = await response.arrayBuffer();
  // `quality` no png() do sharp liga quantização de paleta — gera banding em degradês.
  // compressionLevel é sem perda, só ajusta o esforço de compressão.
  return sharp(Buffer.from(arrayBuffer)).png({ compressionLevel: 9 }).toBuffer();
}
