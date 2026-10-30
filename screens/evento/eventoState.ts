import { EventoDetail } from "../../types";

export interface EventoParticipationState {
  isConfirmed: boolean;
  hasCheckedIn: boolean;
  canCheckIn: boolean;
}

export function eventoParticipation(
  evento: EventoDetail | null | undefined,
  userId: string | undefined,
  now: Date = new Date(),
): EventoParticipationState {
  if (!evento || !userId) return { isConfirmed: false, hasCheckedIn: false, canCheckIn: false };
  const start = new Date(evento.dateTime);
  const isConfirmed = Boolean(evento.participants?.some((participant) => participant.id === userId));
  const hasCheckedIn = Boolean(evento.checkedInUserIds?.includes(userId));
  const isEventDay = now.toDateString() === start.toDateString();
  return { isConfirmed, hasCheckedIn, canCheckIn: isConfirmed && isEventDay && now >= start && !hasCheckedIn };
}

export function eventoLocation(evento: Pick<EventoDetail, "space" | "customLocation">): string {
  if (evento.space !== "PERSONALIZADO") return evento.space;
  return evento.customLocation?.trim() || "Local a definir";
}

export function formatEventoTime(dateIso: string): string {
  const date = new Date(dateIso);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

const weekdayNames = ["DOMINGO", "SEGUNDA", "TERÇA", "QUARTA", "QUINTA", "SEXTA", "SÁBADO"];

export function formatEventoChip(dateIso: string): string {
  return `${weekdayNames[new Date(dateIso).getDay()]} · ${formatEventoTime(dateIso)}`;
}

export function participantLabel(participant: { name: string; nickname?: string | null }): string {
  return participant.nickname?.trim() || participant.name.trim().split(/\s+/)[0] || participant.name;
}

export type EventoPeriod = "all" | "today" | "week" | "month";

const DAY_MS = 86_400_000;

export function filterEventos(eventos: EventoDetail[], period: EventoPeriod, search: string, now: Date = new Date()): EventoDetail[] {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const days = { all: Infinity, today: 1, week: 7, month: 31 }[period];
  const term = search.trim().toLowerCase();
  return eventos
    .filter((evento) => {
      const time = new Date(evento.dateTime).getTime();
      if (period !== "all" && (time < startOfToday || time >= startOfToday + days * DAY_MS)) return false;
      if (!term) return true;
      return [evento.title, evento.description, evento.customLocation].some((text) => text?.toLowerCase().includes(term));
    })
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
}

export function groupEventosByDay(eventos: EventoDetail[]): { day: Date; eventos: EventoDetail[] }[] {
  const groups: { day: Date; eventos: EventoDetail[] }[] = [];
  for (const evento of eventos) {
    const date = new Date(evento.dateTime);
    const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const last = groups[groups.length - 1];
    if (last && last.day.getTime() === day.getTime()) last.eventos.push(evento);
    else groups.push({ day, eventos: [evento] });
  }
  return groups;
}

export function upcomingApprovedEventos(eventos: EventoDetail[], now: Date, limit: number): EventoDetail[] {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  return eventos
    .filter((evento) => evento.status === "APPROVED" && new Date(evento.dateTime) >= startOfToday)
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
    .slice(0, limit);
}
