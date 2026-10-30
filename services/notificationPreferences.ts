export const NOTIFICATION_PREFERENCE_LABELS: Record<string, string> = {
  chat: "Mensagens do chat",
  event: "Eventos e lembretes",
  friend: "Amizades",
  post: "Curtidas e comentários",
  achievement: "Conquistas",
  "monthly-game": "Jogos do mês",
  order: "Pedidos na loja",
  "friend-arrived": "Amigos chegando na loja",
  lfg: "Procuro jogadores",
  general: "Avisos gerais",
};

export const notificationPreferenceLabel = (type: string) => NOTIFICATION_PREFERENCE_LABELS[type] ?? "Outros avisos";
