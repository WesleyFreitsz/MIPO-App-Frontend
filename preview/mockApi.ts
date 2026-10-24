import type { AxiosAdapter, InternalAxiosRequestConfig } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../services/api";

const PREVIEW_TOKEN_KEY = "@mipo_token";

const now = Date.now();
const minutesAgo = (minutes: number) => new Date(now - minutes * 60_000).toISOString();
const atDay = (days: number, hour: number, minute = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

const ana = { id: "ana", name: "Ana Souza", nickname: "aninha", city: "Londrina", avatarUrl: null };
const joao = { id: "jp", name: "João Pedro", nickname: "jp", city: "Londrina", avatarUrl: null };
const luana = { id: "lu", name: "Luana Martins", nickname: "lu", city: "Cambé", avatarUrl: null };
const marcos = { id: "ma", name: "Marcos Lima", nickname: null, city: "Londrina", avatarUrl: null };
const bia = { id: "bia", name: "Bia Costa", nickname: "bia", city: "Londrina", avatarUrl: null };

const me = {
  ...ana,
  bio: "Rainha do Azul e viciada em jogos cooperativos.",
  role: "ADMIN",
  isProfileComplete: true,
  coins: 120,
};

const eventos = [
  {
    id: "e1",
    title: "Noite de Eurogames",
    description: "Traga seu jogo favorito ou escolha um do acervo. Mesa grande liberada a noite toda.",
    dateTime: atDay(0, 0, 30),
    space: "SALÃO",
    status: "APPROVED",
    chatId: "c-event",
    participants: [ana, joao, luana, marcos],
    checkedInUserIds: [],
    creator: { name: "Mipo" },
  },
  {
    id: "e2",
    title: "Torneio de Azul",
    description: "Inscrição com moedas. Premiação para os três primeiros.",
    dateTime: atDay(2, 15),
    space: "SALINHA",
    status: "APPROVED",
    participants: [joao, bia],
    creator: { name: "Mipo" },
  },
  {
    id: "e3",
    title: "Quarta das Minas",
    description: "Encontro semanal só para elas.",
    dateTime: atDay(4, 19, 30),
    space: "PERSONALIZADO",
    customLocation: "Praça Tiradentes",
    status: "APPROVED",
    participants: [ana, luana, bia],
    creator: { name: "Luana Martins" },
  },
  {
    id: "e4",
    title: "Campeonato de Código Secreto",
    description: "Pedido de jogador.",
    dateTime: atDay(9, 15),
    space: "SALÃO",
    status: "PENDING",
    participants: [],
    creator: { name: "Luana Martins" },
  },
];

const jogos = [
  { id: "g1", name: "Azul", category: ["Abstrato", "Família"], minPlayers: 2, maxPlayers: 4, isFeatured: true, active: true, description: "Monte o mosaico mais bonito do palácio escolhendo azulejos sem deixar sobrar nada para o chão.", videoUrl: null },
  { id: "g2", name: "Dixit", category: "Festa", minPlayers: 3, maxPlayers: 6, isFeatured: true, active: true, description: "Conte histórias com cartas ilustradas." },
  { id: "g3", name: "Catan", category: "Estratégia", minPlayers: 3, maxPlayers: 4, isFeatured: true, active: true, description: "Colonize a ilha trocando recursos." },
  { id: "g4", name: "Código Secreto", category: "Festa", minPlayers: 4, maxPlayers: 8, active: true },
  { id: "g5", name: "Pandemic", category: "Cooperativo", minPlayers: 2, maxPlayers: 4, active: true },
  { id: "g6", name: "Wingspan", category: "Estratégia", minPlayers: 1, maxPlayers: 5, active: true },
];

const posts = [
  { id: "p1", content: "Primeira vitória no Catan!! Obrigado mesa 2 pela paciência 😅", imageUrl: null, createdAt: minutesAgo(12), user: joao, likeCount: 24, likedByUser: false, commentCount: 2 },
  { id: "p2", content: "Alguém pra um Dixit sábado à tarde?", imageUrl: null, createdAt: minutesAgo(70), user: luana, likeCount: 5, likedByUser: true, commentCount: 0 },
  { id: "p3", content: "Fechei o Azul com 92 pontos, recorde pessoal!", imageUrl: null, createdAt: minutesAgo(60 * 26), user: ana, likeCount: 31, likedByUser: false, commentCount: 4 },
];

const chats = [
  { id: "c1", type: "PRIVATE", members: [{ userId: "ana", user: ana }, { userId: "jp", user: joao }], unreadCount: 2, lastMessage: { content: "bora revanche sexta?", createdAt: minutesAgo(8) } },
  { id: "c2", type: "GROUP", name: "Galera do Euro", unreadCount: 3, lastMessage: { content: "Luana: eu levo o Brass", createdAt: minutesAgo(25) } },
  { id: "c-event", type: "EVENT", name: "Noite de Eurogames", unreadCount: 0, lastMessage: { content: "Mesa grande reservada!", createdAt: minutesAgo(60 * 3) } },
  { id: "c3", type: "PRIVATE", members: [{ userId: "ana", user: ana }, { userId: "lu", user: luana }], unreadCount: 0, lastMessage: { content: "kkkkk verdade", createdAt: minutesAgo(60 * 30) } },
];

const messages = [
  { id: "m6", chatId: "c1", userId: "ana", content: "bora!! já confirmei 🎲", createdAt: minutesAgo(1), isRead: false, user: ana },
  { id: "m5", chatId: "c1", userId: "jp", content: "bora revanche sexta? Noite de Euro", createdAt: minutesAgo(8), user: joao },
  { id: "m4", chatId: "c1", userId: "ana", content: "foi sorte nos dados juro", createdAt: minutesAgo(10), isRead: true, user: ana },
  { id: "m3", chatId: "c1", userId: "jp", content: "Ganhou de mim no Catan de novo 😤", createdAt: minutesAgo(12), user: joao },
];

const achievements = [
  { id: "a1", title: "Rei do Catan", description: "Vencer 10 partidas de Catan", condition: "WINS.catan.10", rarity: { id: "r4", name: "Lendária", color: "#E3156B" }, isObtained: true, isHighlighted: true, obtainedPercentage: 3 },
  { id: "a2", title: "Alquimista", description: "Jogar 5 jogos diferentes", condition: "GAMES.5", rarity: { id: "r2", name: "Rara", color: "#7CC8B4" }, isObtained: true, obtainedPercentage: 21 },
  { id: "a3", title: "Sortudo", description: "Tirar 6 três vezes seguidas", condition: null, rarity: { id: "r1", name: "Comum", color: "#999999" }, isObtained: true, obtainedPercentage: 48 },
  { id: "a4", title: "Maratonista", description: "Ficar 8 horas no espaço", condition: "HOURS.8", rarity: { id: "r3", name: "Épica", color: "#B9D531" }, isObtained: false, obtainedPercentage: 9 },
];

const notifications = [
  { id: "n1", title: "Reserva aprovada!", message: "Salinha · Sex 20h · Azul", icon: "check", isRead: false, createdAt: minutesAgo(30), data: {} },
  { id: "n2", title: "Conquista: Rei do Catan", message: "+50 moedas", icon: "trophy", isRead: false, createdAt: minutesAgo(90), data: { achievementId: "a1" } },
  { id: "n3", title: "Torneio de Azul abriu inscrições", message: "Garanta sua vaga", icon: "calendar", isRead: true, createdAt: minutesAgo(60 * 50), data: { eventId: "e2" } },
];

const page = <T>(data: T[]) => ({ data, hasMore: false, skip: 0, take: 20, total: data.length });

function respond(config: InternalAxiosRequestConfig): unknown {
  const url = (config.url ?? "").split("?")[0];
  const query = config.url?.includes("?") ? config.url.split("?")[1] : "";
  const method = (config.method ?? "get").toLowerCase();
  if (method !== "get") return url === "/auth/login" ? { access_token: "preview-token" } : { id: "c1", url: "", success: true };

  if (url === "/users/profile") return me;
  if (url === "/events") return eventos;
  if (url === "/events/pending") return eventos.filter((e) => e.status === "PENDING");
  if (url === "/events/admin/all") return eventos;
  if (url === "/games") {
    if (query.includes("isFeatured")) return jogos.filter((g) => g.isFeatured);
    const category = (config.params as { category?: string } | undefined)?.category;
    return category ? jogos.filter((g) => [g.category].flat().includes(category)) : jogos;
  }
  if (url.startsWith("/games/")) return jogos.find((g) => g.id === url.split("/")[2]) ?? jogos[0];
  if (url === "/posts/feed") return page(posts);
  if (url.startsWith("/posts/user/")) return page(posts.filter((p) => p.user.id === url.split("/")[3]));
  if (/^\/posts\/[^/]+\/comments$/.test(url)) return page([{ id: "k1", content: "Parabéns!!", user: ana }, { id: "k2", content: "Revanche já", user: marcos }]);
  if (url === "/chats") return page(chats);
  if (/^\/chats\/[^/]+\/messages$/.test(url)) return page(messages);
  if (url.startsWith("/chats/")) {
    const chat = chats.find((c) => c.id === url.split("/")[2]) ?? chats[0];
    return { ...chat, description: "Galera que joga eurogame toda sexta.", createdAt: minutesAgo(60 * 24 * 40), members: [{ id: "mm1", userId: "ana", role: "ADMIN", user: ana }, { id: "mm2", userId: "jp", role: "MEMBER", user: joao }, { id: "mm3", userId: "lu", role: "MEMBER", user: luana }] };
  }
  if (url === "/friends") return page([joao, luana, marcos]);
  if (url === "/friends/available/users") return page([bia, { id: "rafa", name: "Rafa Lima", nickname: "rafa", avatarUrl: null }]);
  if (url === "/friends/requests/pending") return page([{ id: "fr1", createdAt: minutesAgo(5), fromUser: { ...bia } }, { id: "fr2", createdAt: minutesAgo(200), fromUser: { id: "rafa", name: "Rafa Lima", nickname: "rafa", city: "Londrina" } }]);
  if (/^\/friends\/[^/]+\/status$/.test(url)) return { id: "f1", status: "ACCEPTED" };
  if (url === "/notifications") return page(notifications);
  if (url === "/achievements") return achievements;
  if (url === "/achievements/rarities") return achievements.map((a) => a.rarity);
  if (url === "/users/admin/list") return [{ ...ana, email: "ana@exemplo.com", coins: 120 }, { ...joao, email: "jp@exemplo.com", coins: 340 }, { ...luana, email: "lu@exemplo.com", coins: 85, banned: true }];
  if (url.startsWith("/users/")) return { ...joao, bio: "Jogo qualquer coisa com dado.", role: "USER" };
  if (url === "/finance/summary") return { totalIn: 9030, totalOut: 610, balance: 8420 };
  if (url === "/finance/transactions") return [
    { id: "t1", type: "in", description: "Salinha · reserva", value: 40, createdAt: minutesAgo(60) },
    { id: "t2", type: "in", description: "Torneio de Azul", value: 480, createdAt: minutesAgo(60 * 30) },
    { id: "t3", type: "out", description: "Compra de jogos", value: 610, createdAt: minutesAgo(60 * 50) },
  ];
  if (url === "/rewards") return [{ id: "rw1", title: "Café grátis", price: 80, stock: 20 }, { id: "rw2", title: "1h de mesa", price: 200, stock: 8 }, { id: "rw3", title: "Camiseta Mipo", price: 900, stock: 3 }];
  if (url === "/reports") return [{ id: "rp1", reason: "spam", createdAt: minutesAgo(120), reporterUser: luana, reportedUser: { id: "x", name: "usuario123", nickname: "usuario123" }, post: { content: "Compre seguidores baratos no link..." } }];
  if (url === "/rooms/salinha/reservations/pending") return [{ id: "rs1", userId: "ma", user: { name: "Marcos Lima" }, date: atDay(1, 0), startTime: "20:00", endTime: "22:00", totalPrice: 40, status: "pending", createdAt: minutesAgo(40) }];
  return [];
}

const previewAdapter: AxiosAdapter = async (config) => ({
  data: respond(config),
  status: 200,
  statusText: "OK",
  headers: {},
  config,
});

export function installPreviewMode() {
  api.defaults.adapter = previewAdapter;
  globalThis.localStorage?.setItem(PREVIEW_TOKEN_KEY, "preview-token");
  AsyncStorage.setItem(PREVIEW_TOKEN_KEY, "preview-token").catch(() => undefined);
}
