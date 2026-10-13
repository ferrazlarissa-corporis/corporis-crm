const UNIDADES = ["zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const DEZENAS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CENTENAS = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

function ate999(n: number, fem: boolean): string {
  if (n === 100) return "cem";
  const c = Math.floor(n / 100);
  const r = n % 100;
  const partes: string[] = [];
  if (c) partes.push(fem ? CENTENAS[c].replace(/os$/, "as") : CENTENAS[c]);
  if (r) {
    if (r < 20) partes.push(fem && r <= 2 ? (r === 1 ? "uma" : "duas") : UNIDADES[r]);
    else {
      const u = r % 10;
      partes.push(u ? `${DEZENAS[Math.floor(r / 10)]} e ${fem && u <= 2 ? (u === 1 ? "uma" : "duas") : UNIDADES[u]}` : DEZENAS[Math.floor(r / 10)]);
    }
  }
  return partes.join(" e ");
}

/** Inteiro (0 a 999.999.999) por extenso, em pt-BR. `fem` para concordar com "parcelas", "sessões". */
export function extensoInteiro(n: number, fem = false): string {
  const v = Math.floor(Math.abs(n));
  if (v === 0) return "zero";
  const milhoes = Math.floor(v / 1_000_000);
  const milhares = Math.floor((v % 1_000_000) / 1000);
  const resto = v % 1000;
  const partes: string[] = [];
  if (milhoes) partes.push(`${ate999(milhoes, false)} ${milhoes === 1 ? "milhão" : "milhões"}`);
  if (milhares) partes.push(milhares === 1 ? "mil" : `${ate999(milhares, fem)} mil`);
  if (resto) partes.push(ate999(resto, fem));
  // "e" antes do último bloco quando ele é < 100 ou centena exata
  if (partes.length > 1 && (resto < 100 || resto % 100 === 0)) {
    return `${partes.slice(0, -1).join(" ")} e ${partes[partes.length - 1]}`;
  }
  return partes.join(" ");
}

/** Valor em reais por extenso: 1170 → "mil cento e setenta reais". */
export function extensoReais(valor: number): string {
  const centavosTotal = Math.round(Math.abs(valor) * 100);
  const reais = Math.floor(centavosTotal / 100);
  const centavos = centavosTotal % 100;
  const parteReais = reais ? `${extensoInteiro(reais)} ${reais === 1 ? "real" : reais % 1_000_000 === 0 ? "de reais" : "reais"}` : "";
  const parteCent = centavos ? `${extensoInteiro(centavos)} ${centavos === 1 ? "centavo" : "centavos"}` : "";
  if (parteReais && parteCent) return `${parteReais} e ${parteCent}`;
  return parteReais || parteCent || "zero real";
}
