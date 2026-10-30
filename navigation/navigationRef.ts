import { createNavigationContainerRef, ParamListBase } from "@react-navigation/native";

export const navigationRef = createNavigationContainerRef<ParamListBase>();

export interface NotificationTarget {
  type?: string;
  chatId?: string;
  eventId?: string;
  postId?: string;
  achievementId?: string;
  userId?: string;
  reportId?: string;
  pending?: boolean;
  orderId?: string;
  staff?: boolean;
  callId?: string;
}

export function parseNotificationData(raw: unknown): NotificationTarget {
  if (typeof raw === "string") {
    try {
      return (JSON.parse(raw) as NotificationTarget) ?? {};
    } catch {
      return {};
    }
  }
  return (raw as NotificationTarget) ?? {};
}

type Navigate = (name: string, params?: object) => void;

export function openNotificationTarget(data: NotificationTarget, navigate: Navigate): boolean {
  if (data.type === "order") navigate(data.staff ? "StaffOrders" : "Store");
  else if (data.type === "friend-arrived") navigate("Store");
  else if (data.type === "review") navigate("MainTabs");
  else if (data.type === "lfg") navigate("PlayCalls", data.callId ? { callId: data.callId } : undefined);
  else if (data.reportId) navigate("AdminReports");
  else if (data.pending) navigate("AdminApprovals");
  else if (data.type === "monthly-game") navigate("MonthlyGames");
  else if (data.chatId) navigate("ChatDetail", { chatId: data.chatId });
  else if (data.eventId) navigate("EventsList", { eventId: data.eventId });
  else if (data.postId) navigate("MainTabs", { screen: "Social", params: { postId: data.postId, t: Date.now() } });
  else if (data.achievementId) navigate("MainTabs", { screen: "Perfil", params: { openAchievements: Date.now() } });
  else if (data.userId) navigate("PlayerProfile", { userId: data.userId });
  else return false;
  return true;
}
