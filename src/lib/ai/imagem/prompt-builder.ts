const STYLE_GUIDE = `Estilo visual: ilustração/fundo abstrato em traço suave e orgânico, paleta terrosa e quente
(laranja queimado, bege, verde suave), luz difusa, sem texto, sem letras, sem números, sem logotipos,
sem rostos reconhecíveis de pessoas reais. Nada clínico-frio, nada estridente, sem elementos médicos
literais (sem seringas, sem raio-x, sem hospital). O fundo serve de camada para texto ser composto por
cima depois — deixe áreas com respiro visual, sem excesso de detalhe no terço inferior.`;

export function buildImagePrompt(input: {
  briefing: string;
  pilarNome: string;
  templateTipo: "capa" | "conteudo" | "citacao" | "cta";
}): string {
  const { briefing, pilarNome, templateTipo } = input;

  const templateHint: Record<typeof templateTipo, string> = {
    capa: "Fundo de abertura de carrossel — deve funcionar como primeira impressão, gancho visual forte.",
    conteudo: "Fundo de slide de conteúdo — mais neutro, para não competir com o texto explicativo.",
    citacao: "Fundo para uma citação/depoimento em destaque — atmosfera calma, quase contemplativa.",
    cta: "Fundo de encerramento com chamada para ação — deve transmitir acolhimento e convite, não urgência.",
  };

  return [
    `Pilar editorial: ${pilarNome}.`,
    `Contexto do post: ${briefing}`,
    templateHint[templateTipo],
    STYLE_GUIDE,
  ].join("\n\n");
}
