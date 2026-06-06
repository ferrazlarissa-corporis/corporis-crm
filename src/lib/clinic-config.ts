export const CLINIC_CONFIG_ID = "00000000-0000-0000-0000-000000000001";
export const CLINIC_ASSETS_BUCKET = "clinic-assets";
export const CLINIC_LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const CLINIC_TIME_ZONE = "America/Sao_Paulo";

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

const CLINIC_WEEKDAY_INDEX: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

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

function clinicDateParts(date: Date, timeZone = CLINIC_TIME_ZONE) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  const hour = Number(parts.hour);
  const minute = Number(parts.minute);

  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    dayIndex: CLINIC_WEEKDAY_INDEX[parts.weekday] ?? 0,
    minutes: hour * 60 + minute,
  };
}

function formatClinicIntervals(intervals: ClinicTimeInterval[]): string {
  return intervals
    .map((interval) => `${interval.start} - ${interval.end}`)
    .join(" / ");
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

export function validateAppointmentWithinClinicHours(
  value: unknown,
  start: Date,
  end: Date,
  timeZone = CLINIC_TIME_ZONE,
): { ok: true } | { ok: false; message: string } {
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return { ok: false, message: "Informe uma data e hora válidas para a avaliação." };
  }

  const schedule = buildClinicSchedule(value);
  const startParts = clinicDateParts(start, timeZone);
  const endParts = clinicDateParts(end, timeZone);
  const day = schedule.find((item) => item.index === startParts.dayIndex);
  const dayName = day?.day ?? CLINIC_WEEK_DAYS[startParts.dayIndex] ?? "este dia";

  if (!day || day.off || day.intervals.length === 0) {
    return { ok: false, message: `A clínica está fechada em ${dayName}. Escolha um dia de atendimento.` };
  }

  if (startParts.dateKey !== endParts.dateKey) {
    return { ok: false, message: `O agendamento precisa começar e terminar no mesmo dia de atendimento. Em ${dayName}: ${formatClinicIntervals(day.intervals)}.` };
  }

  const fitsClinicHours = day.intervals.some((interval) => (
    startParts.minutes >= interval.startMinutes &&
    endParts.minutes <= interval.endMinutes
  ));

  if (!fitsClinicHours) {
    return { ok: false, message: `Este horário está fora do funcionamento de ${dayName}. Disponível: ${formatClinicIntervals(day.intervals)}.` };
  }

  return { ok: true };
}

export function formatClinicHoursCompact(row: ClinicHoursRow): string {
  const intervals = row.off ? [] : parseClinicHoursText(row.h);
  if (intervals.length === 0) return "Fechado";

  return intervals
    .map((interval) => `${interval.start.replace(":00", "h")} - ${interval.end.replace(":00", "h")}`)
    .join(" / ");
}
