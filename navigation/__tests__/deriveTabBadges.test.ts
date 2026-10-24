import { deriveTabBadges } from "../useTabBadges";

test("sem dados não mostra badges", () => {
  expect(deriveTabBadges(undefined, undefined, undefined)).toEqual({ social: false, avisos: 0 });
});

test("chat com não lidas acende o Social", () => {
  const chats = { data: [{ unreadCount: 0 }, { unreadCount: 2 }] };
  expect(deriveTabBadges(chats, undefined, undefined).social).toBe(true);
});

test("Avisos soma notificações não lidas e pedidos pendentes", () => {
  const notifications = { data: [{ isRead: false }, { isRead: true }, { isRead: false }] };
  const requests = { data: [{}, {}] };
  expect(deriveTabBadges(undefined, notifications, requests).avisos).toBe(4);
});

test("pedidos podem vir como lista direta", () => {
  expect(deriveTabBadges(undefined, undefined, [{}, {}, {}]).avisos).toBe(3);
});
