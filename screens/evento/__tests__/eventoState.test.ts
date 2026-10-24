import { EventoDetail } from "../../../types";
import { eventoLocation, eventoParticipation, formatEventoTime, upcomingApprovedEventos } from "../eventoState";

const base: EventoDetail = {
  id: "e1",
  title: "Noite de Eurogames",
  dateTime: new Date(2026, 9, 23, 19, 30).toISOString(),
  space: "SALÃO",
  participants: [{ id: "ana", name: "Ana Souza" }],
  checkedInUserIds: [],
};

describe("eventoParticipation", () => {
  const sameDayAfterStart = new Date(2026, 9, 23, 20, 0);

  test("quem não confirmou não pode fazer check-in", () => {
    expect(eventoParticipation(base, "bia", sameDayAfterStart)).toEqual({ isConfirmed: false, hasCheckedIn: false, canCheckIn: false });
  });

  test("confirmado, no dia e depois do início pode fazer check-in", () => {
    expect(eventoParticipation(base, "ana", sameDayAfterStart).canCheckIn).toBe(true);
  });

  test("confirmado, mas antes do horário, ainda não pode", () => {
    expect(eventoParticipation(base, "ana", new Date(2026, 9, 23, 18, 0)).canCheckIn).toBe(false);
  });

  test("confirmado, mas no dia seguinte, não pode mais", () => {
    expect(eventoParticipation(base, "ana", new Date(2026, 9, 24, 10, 0)).canCheckIn).toBe(false);
  });

  test("quem já fez check-in não faz de novo", () => {
    const evento = { ...base, checkedInUserIds: ["ana"] };
    expect(eventoParticipation(evento, "ana", sameDayAfterStart)).toEqual({ isConfirmed: true, hasCheckedIn: true, canCheckIn: false });
  });

  test("sem usuário ou sem evento nada é permitido", () => {
    expect(eventoParticipation(null, "ana", sameDayAfterStart).canCheckIn).toBe(false);
    expect(eventoParticipation(base, undefined, sameDayAfterStart).isConfirmed).toBe(false);
  });

  test("evento sem lista de participantes conta como não confirmado", () => {
    expect(eventoParticipation({ ...base, participants: undefined }, "ana", sameDayAfterStart).isConfirmed).toBe(false);
  });
});

describe("eventoLocation", () => {
  test("usa o espaço padrão", () => {
    expect(eventoLocation(base)).toBe("SALÃO");
  });

  test("usa o local personalizado quando for o caso", () => {
    expect(eventoLocation({ ...base, space: "PERSONALIZADO", customLocation: "Praça Tiradentes" })).toBe("Praça Tiradentes");
  });

  test("personalizado sem local não mostra texto vazio estranho", () => {
    expect(eventoLocation({ ...base, space: "PERSONALIZADO", customLocation: null })).toBe("Local a definir");
  });
});

describe("formatEventoTime", () => {
  test("mostra hora e minuto com dois dígitos", () => {
    expect(formatEventoTime(new Date(2026, 9, 23, 9, 5).toISOString())).toBe("09:05");
  });
});

describe("upcomingApprovedEventos", () => {
  const now = new Date(2026, 9, 23, 22, 0);
  const evento = (id: string, day: number, status = "APPROVED"): EventoDetail => ({
    ...base,
    id,
    status,
    dateTime: new Date(2026, 9, day, 19, 0).toISOString(),
  });

  test("mantém eventos aprovados de hoje em diante, em ordem, limitados", () => {
    const list = [evento("c", 26), evento("a", 23), evento("old", 20), evento("pend", 24, "PENDING"), evento("b", 25), evento("d", 27)];
    expect(upcomingApprovedEventos(list, now, 3).map((e) => e.id)).toEqual(["a", "b", "c"]);
  });

  test("não altera a lista original", () => {
    const list = [evento("b", 25), evento("a", 24)];
    upcomingApprovedEventos(list, now, 3);
    expect(list.map((e) => e.id)).toEqual(["b", "a"]);
  });
});
