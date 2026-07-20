import React from "react";
import type { TipoTemplate } from "@/types/database";

// Mesmos hexes de design-system/app-tokens.css (--pillar-*) — satori não lê var(),
// precisa do valor literal.
const PILLAR_HEX: Record<string, string> = {
  diastase: "#F08353",
  pelvica: "#ACC095",
  postura: "#D2B06E",
  gestante: "#F6A958",
  terapeutico: "#C97448",
  preventiva: "#7E9469",
  bastidores: "#7A6E68",
  indefinido: "#B9B0A6",
};

const ESPRESSO = "#2A1F1A";

export function pillarHex(corToken: string): string {
  const key = corToken.replace(/^pillar-/, "");
  return PILLAR_HEX[key] ?? PILLAR_HEX.indefinido;
}

// Escala do mockup (canvas 420x525, ver "Editor de post.html") pro tamanho real de export (1080x1350, 4:5).
const SCALE = 1080 / 420;
const px = (n: number) => Math.round(n * SCALE);

export type SlideJsxInput = {
  tipo: TipoTemplate;
  pilarLabel: string;
  pilarCorToken: string;
  titulo: string;
  corpo: string;
  trackedLink?: string | null;
  /** url http(s) ou data: URI já pronta pro satori buscar/embutir. Sem fundo = gradiente do pilar (placeholder). */
  backgroundImageUrl?: string | null;
};

function backgroundFor(input: SlideJsxInput): string {
  if (input.backgroundImageUrl) return `url(${input.backgroundImageUrl})`;
  const hex = pillarHex(input.pilarCorToken);
  return `linear-gradient(150deg, ${hex} 0%, ${ESPRESSO} 100%)`;
}

// Scrim escuro sobre a imagem de fundo pra garantir contraste do texto branco — necessário pra
// fundos fotográficos reais da IA (M7), que não têm o degradê espresso do mockup embutido.
const SCRIM_TOP = "linear-gradient(180deg, rgba(42,31,26,.62) 0%, rgba(42,31,26,0) 42%)";
const SCRIM_BOTTOM = "linear-gradient(0deg, rgba(42,31,26,.68) 0%, rgba(42,31,26,0) 42%)";
const SCRIM_FULL = "linear-gradient(0deg, rgba(42,31,26,.32), rgba(42,31,26,.32))";

function Scrim({ gradient }: { gradient: string }) {
  // satori não suporta o shorthand `inset` — precisa dos 4 eixos explícitos.
  return <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundImage: gradient, display: "flex" }} />;
}

const eyebrowStyle = {
  fontFamily: "Ubuntu",
  fontWeight: 500 as const,
  fontSize: px(11),
  letterSpacing: px(2),
  textTransform: "uppercase" as const,
  color: "rgba(255,255,255,.85)",
};

function Eyebrow({ label }: { label: string }) {
  return <div style={{ ...eyebrowStyle, display: "flex" }}>{label}</div>;
}

function Root({ input, children }: { input: SlideJsxInput; children: React.ReactNode }) {
  return (
    <div
      style={{
        width: 1080,
        height: 1350,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        backgroundColor: ESPRESSO,
        backgroundImage: backgroundFor(input),
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {children}
    </div>
  );
}

function Capa(input: SlideJsxInput) {
  return (
    <Root input={input}>
      <Scrim gradient={SCRIM_BOTTOM} />
      <div style={{ position: "relative", display: "flex", flexDirection: "column", height: "100%", padding: `${px(24)}px ${px(28)}px` }}>
        <Eyebrow label={input.pilarLabel} />
        <div
          style={{
            display: "flex",
            fontFamily: "Quicksand",
            fontWeight: 400,
            fontSize: px(34),
            lineHeight: 1.1,
            color: "#fff",
            marginTop: "auto",
            paddingBottom: px(6),
          }}
        >
          {input.titulo}
        </div>
      </div>
    </Root>
  );
}

function Conteudo(input: SlideJsxInput) {
  return (
    <Root input={input}>
      <Scrim gradient={SCRIM_TOP} />
      <div style={{ position: "relative", display: "flex", flexDirection: "column", padding: `${px(24)}px ${px(28)}px` }}>
        <Eyebrow label={input.pilarLabel} />
        <div
          style={{
            display: "flex",
            fontFamily: "Quicksand",
            fontWeight: 400,
            fontSize: px(27),
            lineHeight: 1.18,
            color: "#fff",
            marginTop: px(16),
          }}
        >
          {input.titulo}
        </div>
        <div
          style={{
            display: "flex",
            fontFamily: "Ubuntu",
            fontWeight: 400,
            fontSize: px(15),
            lineHeight: 1.55,
            color: "rgba(255,255,255,.92)",
            marginTop: px(14),
          }}
        >
          {input.corpo}
        </div>
      </div>
    </Root>
  );
}

function Citacao(input: SlideJsxInput) {
  return (
    <Root input={input}>
      <Scrim gradient={SCRIM_FULL} />
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          height: "100%",
          padding: `0 ${px(40)}px`,
        }}
      >
        <div
          style={{
            display: "flex",
            fontFamily: "Quicksand",
            fontWeight: 400,
            fontSize: px(24),
            lineHeight: 1.35,
            color: "#fff",
          }}
        >
          {input.titulo}
        </div>
        <div
          style={{
            display: "flex",
            fontFamily: "Ubuntu",
            fontWeight: 400,
            fontSize: px(13),
            color: "rgba(255,255,255,.75)",
            marginTop: px(16),
          }}
        >
          {input.corpo}
        </div>
      </div>
    </Root>
  );
}

function Cta(input: SlideJsxInput) {
  return (
    <Root input={input}>
      <Scrim gradient={SCRIM_FULL} />
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          height: "100%",
          padding: `0 ${px(32)}px`,
        }}
      >
        <div style={{ display: "flex", fontFamily: "Quicksand", fontWeight: 400, fontSize: px(28), lineHeight: 1.2, color: "#fff" }}>
          {input.titulo}
        </div>
        <div
          style={{
            display: "flex",
            fontFamily: "Ubuntu",
            fontWeight: 400,
            fontSize: px(14),
            color: "rgba(255,255,255,.92)",
            padding: `0 ${px(8)}px`,
            marginTop: px(10),
          }}
        >
          {input.corpo}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: px(20),
            background: "#fff",
            color: ESPRESSO,
            fontFamily: "Ubuntu",
            fontWeight: 500,
            fontSize: px(13),
            padding: `${px(12)}px ${px(24)}px`,
            borderRadius: 999,
          }}
        >
          Agendar avaliação
        </div>
        {input.trackedLink ? (
          <div
            style={{
              display: "flex",
              fontFamily: "Ubuntu",
              fontWeight: 400,
              fontSize: px(10.5),
              color: "rgba(255,255,255,.65)",
              marginTop: px(10),
            }}
          >
            {input.trackedLink}
          </div>
        ) : null}
      </div>
    </Root>
  );
}

export function buildSlideElement(input: SlideJsxInput) {
  switch (input.tipo) {
    case "capa":
      return <Capa {...input} />;
    case "conteudo":
      return <Conteudo {...input} />;
    case "citacao":
      return <Citacao {...input} />;
    case "cta":
      return <Cta {...input} />;
  }
}
