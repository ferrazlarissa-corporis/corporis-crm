export type PhoneNormalizationResult =
  | { ok: true; e164: string; nationalDigits: string }
  | { ok: false; error: string };

const BR_COUNTRY_CODE = "55";

export function normalizeBrazilPhone(input: unknown): PhoneNormalizationResult {
  let digits = String(input ?? "").replace(/\D/g, "");

  if (!digits) {
    return { ok: false, error: "Informe o telefone com DDD." };
  }

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  let nationalDigits = digits;
  if (digits.startsWith(BR_COUNTRY_CODE) && (digits.length === 12 || digits.length === 13)) {
    nationalDigits = digits.slice(BR_COUNTRY_CODE.length);
  }

  if (nationalDigits.startsWith("0") && (nationalDigits.length === 11 || nationalDigits.length === 12)) {
    nationalDigits = nationalDigits.slice(1);
  }

  if (nationalDigits.length !== 10 && nationalDigits.length !== 11) {
    return {
      ok: false,
      error: "Informe o telefone com DDD. Exemplo: (49) 99929-2140.",
    };
  }

  const ddd = Number(nationalDigits.slice(0, 2));
  if (!Number.isInteger(ddd) || ddd < 11 || ddd > 99) {
    return { ok: false, error: "Informe um DDD válido. Exemplo: (49) 99929-2140." };
  }

  return {
    ok: true,
    e164: `+${BR_COUNTRY_CODE}${nationalDigits}`,
    nationalDigits,
  };
}

export function formatBrazilPhoneInput(input: unknown): string {
  const normalized = normalizeBrazilPhone(input);
  return normalized.ok ? normalized.e164 : String(input ?? "");
}

export function brazilPhoneIdentityVariants(input: unknown): string[] {
  const normalized = normalizeBrazilPhone(input);
  const base = normalized.ok ? normalized.e164 : String(input ?? "").trim();
  const variants = new Set<string>();
  if (base) variants.add(base);

  if (!normalized.ok) return [...variants];

  const { nationalDigits } = normalized;
  const ddd = nationalDigits.slice(0, 2);
  const subscriber = nationalDigits.slice(2);

  if (nationalDigits.length === 11 && subscriber.startsWith("9")) {
    variants.add(`+${BR_COUNTRY_CODE}${ddd}${subscriber.slice(1)}`);
  }

  if (nationalDigits.length === 10) {
    variants.add(`+${BR_COUNTRY_CODE}${ddd}9${subscriber}`);
  }

  return [...variants];
}

export function isPhoneInBypassList(phone: string, bypassList: string[]): boolean {
  const phoneVariants = brazilPhoneIdentityVariants(phone);
  const bypassVariants = new Set(
    bypassList.flatMap((item) => brazilPhoneIdentityVariants(item))
  );

  return phoneVariants.some((variant) => bypassVariants.has(variant));
}
