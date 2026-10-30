import React from "react";
import { View } from "react-native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import {
  Bell,
  Calendar,
  QrCode,
  BarChart3,
  UserCheck,
  UtensilsCrossed,
  CalendarPlus,
  CheckSquare,
  Dice5,
  Flag,
  Gift,
  Medal,
  Megaphone,
  Star,
  Trophy,
  Users,
  Wallet,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { Card, Character, IconBox, MipoText, Screen } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { AccentName } from "../theme/tokens";

interface AdminDashboardProps {
  navigation: Pick<NavigationProp<ParamListBase>, "navigate">;
}

interface AdminMenuItem {
  title: string;
  icon: LucideIcon;
  tone: AccentName;
  route: string;
  roles?: StaffRole[];
}

type StaffRole = "MODERATOR" | "WAITER";

const menuItems: AdminMenuItem[] = [
  { title: "Pedidos", icon: Bell, tone: "red", route: "StaffOrders", roles: ["WAITER"] },
  { title: "Check-in manual", icon: UserCheck, tone: "teal", route: "StaffCheckIn", roles: ["WAITER"] },
  { title: "Cardápio", icon: UtensilsCrossed, tone: "orange", route: "AdminMenu" },
  { title: "QR da loja", icon: QrCode, tone: "lilac", route: "AdminStore" },
  { title: "Frequência", icon: BarChart3, tone: "lime", route: "AdminVisitsStats" },
  { title: "Avaliações", icon: Star, tone: "yellow", route: "AdminReviews" },
  { title: "Aprovações", icon: CheckSquare, tone: "pink", route: "AdminApprovals", roles: ["MODERATOR"] },
  { title: "Eventos", icon: Calendar, tone: "teal", route: "AdminEventsManagement" },
  { title: "Denúncias", icon: Flag, tone: "red", route: "AdminReports", roles: ["MODERATOR"] },
  { title: "Notificar", icon: Megaphone, tone: "teal", route: "AdminNotifications" },
  { title: "Financeiro", icon: Wallet, tone: "lime", route: "AdminFinance" },
  { title: "Usuários", icon: Users, tone: "lilac", route: "AdminUsers" },
  { title: "Jogos", icon: Dice5, tone: "yellow", route: "AdminGames" },
  { title: "Jogos do mês", icon: Medal, tone: "orange", route: "AdminMonthlyGames" },
  { title: "Criar evento", icon: CalendarPlus, tone: "pink", route: "AdminCreateEvent" },
  { title: "Recompensas", icon: Gift, tone: "orange", route: "AdminRewards" },
  { title: "Conquistas", icon: Trophy, tone: "yellow", route: "AdminAchievements" },
];

export default function AdminDashboard({ navigation }: AdminDashboardProps) {
  const { user } = useAuth();
  const role = user?.role;
  const visibleItems =
    role === "ADMIN" ? menuItems : menuItems.filter((item) => role !== undefined && role !== "USER" && item.roles?.includes(role));

  return (
    <Screen scroll withTabBar>
      <Card tone="yellow" style={{ marginTop: 10, marginBottom: 18 }} contentStyle={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 96 }}>
        <View style={{ flex: 1 }}>
          <MipoText variant="screenTitle" color="onColor" accessibilityRole="header">
            Painel da Mipo
          </MipoText>
        </View>
        <Character name="pocao2" size={80} />
      </Card>

      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 14 }}>
        {visibleItems.map((item) => (
          <Card
            key={item.route}
            onPress={() => navigation.navigate(item.route)}
            accessibilityLabel={item.title}
            style={{ width: "47.5%" }}
            contentStyle={{ alignItems: "flex-start", gap: 10, minHeight: 96 }}
          >
            <IconBox icon={item.icon} tone={item.tone} size={40} />
            <MipoText variant="cardTitle" numberOfLines={2}>
              {item.title}
            </MipoText>
          </Card>
        ))}
      </View>
    </Screen>
  );
}
