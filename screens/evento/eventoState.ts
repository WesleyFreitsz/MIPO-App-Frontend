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

export function upcomingApprovedEventos(eventos: EventoDetail[], now: Date, limit: number): EventoDetail[] {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  return eventos
    .filter((evento) => evento.status === "APPROVED" && new Date(evento.dateTime) >= startOfToday)
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
    .slice(0, limit);
}
