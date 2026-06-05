export const CLINIC_CONFIG_ID = "00000000-0000-0000-0000-000000000001";
export const CLINIC_ASSETS_BUCKET = "clinic-assets";
export const CLINIC_LOGO_MAX_BYTES = 2 * 1024 * 1024;

export const CLINIC_LOGO_EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

export const CLINIC_LOGO_ACCEPT_ATTRIBUTE = Object.keys(CLINIC_LOGO_EXT_BY_MIME).join(",");

export type ClinicHoursRow = {
  day: string;
  h: string;
  off: boolean;
};

export type ClinicTimeInterval = {
  start: string;
  end: string;
  startMinutes: number;
  endMinutes: number;
};

export type ClinicScheduleDay = ClinicHoursRow & {
  index: number;
  intervals: ClinicTimeInterval[];
};

export const CLINIC_WEEK_DAYS = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
  "Domingo",
] as const;

const CLINIC_DAY_INDEX: Record<string, number> = CLINIC_WEEK_DAYS.reduce(
  (acc, day, index) => ({ ...acc, [day]: index }),
  {} as Record<string, number>,
);

export type ClinicInfo = {
  razao_social: string;
  documento: string;
  nome_comercial: string;
  endereco: string;
  endereco_complemento: string;
  telefone: string;
  telefone_observacao: string;
  email: string;
  funcionamento: ClinicHoursRow[];
};

export const DEFAULT_CLINIC_INFO: ClinicInfo = {
  razao_social: "Corporis Fisioterapia e Pilates LTDA",
  documento: "CNPJ 47.612.358/0001-09 · CREFITO-10 / 21.345-F",
  nome_comercial: "Corporis · Fisioterapia e Pilates",
  endereco: "Rua Coronel Santos Marinho, 347 — Sala 903",
  endereco_complemento: "Centro Médico Xanxerê · Centro · Xanxerê / SC · CEP 89820-000",
  telefone: "+55 49 99183-1900",
  telefone_observacao: "WhatsApp da clínica · também recebe ligações",
  email: "contato@corporisxre.com.br",
  funcionamento: [
    { day: "Segunda", h: "06:00 - 11:00 | 14:00 - 21:00", off: false },
    { day: "Terça", h: "06:00 - 11:00 | 15:00 - 21:00", off: false },
    { day: "Quarta", h: "06:00 - 11:00 | 15:00 - 21:00", off: false },
    { day: "Quinta", h: "06:00 - 12:00 | 15:00 - 21:00", off: false },
    { day: "Sexta", h: "06:00 - 11:00 | 15:00 - 21:00", off: false },
    { day: "Sábado", h: "Fechado", off: true },
    { day: "Domingo", h: "Fechado", off: true },
  ],
};

export function normalizeClinicHours(value: unknown): ClinicHoursRow[] {
  if (!Array.isArray(value)) {
    return DEFAULT_CLINIC_INFO.funcionamento.map((row) => ({ ...row }));
  }

  const rows = value.filter((row): row is ClinicHoursRow => (
    typeof row === "object" &&
    row !== null &&
    typeof (row as ClinicHoursRow).day === "string" &&
    typeof (row as ClinicHoursRow).h === "string" &&
    typeof (row as ClinicHoursRow).off === "boolean"
  ));

  return rows.length === 7
    ? rows.map((row) => ({ ...row }))
    : DEFAULT_CLINIC_INFO.funcionamento.map((row) => ({ ...row }));
}

function minutesFromTime(hour: string, minute: string): number | null {
  const h = Number(hour);
  const m = Number(minute);

  if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || h > 23 || m < 0 || m > 59) {
    return null;
  }

  return h * 60 + m;
}

function formatMinutes(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function parseClinicHoursText(value: string): ClinicTimeInterval[] {
  return value
    .split("|")
    .map((part) => part.trim())
    .flatMap((part) => {
      const match = part.match(/^(\d{1,2}):(\d{2})\s*(?:-|–|—)\s*(\d{1,2}):(\d{2})$/);
      if (!match) return [];

      const startMinutes = minutesFromTime(match[1], match[2]);
      const endMinutes = minutesFromTime(match[3], match[4]);

      if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
        return [];
      }

      return [{
        start: formatMinutes(startMinutes),
        end: formatMinutes(endMinutes),
        startMinutes,
        endMinutes,
      }];
    });
}

export function buildClinicSchedule(value: unknown): ClinicScheduleDay[] {
  return normalizeClinicHours(value)
    .map((row, fallbackIndex) => {
      const index = CLINIC_DAY_INDEX[row.day] ?? fallbackIndex;

      return {
        ...row,
        index,
        intervals: row.off ? [] : parseClinicHoursText(row.h),
      };
    })
    .sort((a, b) => a.index - b.index);
}

export function formatClinicHoursCompact(row: ClinicHoursRow): string {
  const intervals = row.off ? [] : parseClinicHoursText(row.h);
  if (intervals.length === 0) return "Fechado";

  return intervals
    .map((interval) => `${interval.start.replace(":00", "h")} - ${interval.end.replace(":00", "h")}`)
    .join(" / ");
}
