import React from "react";
import { View } from "react-native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import {
  Calendar,
  CalendarPlus,
  CheckSquare,
  Dice5,
  Flag,
  Gift,
  Megaphone,
  Trophy,
  Users,
  Wallet,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { Card, Character, IconBox, MipoText, Screen } from "../components/ui";
import { AccentName } from "../theme/tokens";

interface AdminDashboardProps {
  navigation: Pick<NavigationProp<ParamListBase>, "navigate">;
}

interface AdminMenuItem {
  title: string;
  icon: LucideIcon;
  tone: AccentName;
  route: string;
}

const menuItems: AdminMenuItem[] = [
  { title: "Aprovações", icon: CheckSquare, tone: "pink", route: "AdminApprovals" },
  { title: "Eventos", icon: Calendar, tone: "teal", route: "AdminEventsManagement" },
  { title: "Denúncias", icon: Flag, tone: "red", route: "AdminReports" },
  { title: "Notificar", icon: Megaphone, tone: "teal", route: "AdminNotifications" },
  { title: "Financeiro", icon: Wallet, tone: "lime", route: "AdminFinance" },
  { title: "Usuários", icon: Users, tone: "lilac", route: "AdminUsers" },
  { title: "Jogos", icon: Dice5, tone: "yellow", route: "AdminGames" },
  { title: "Criar evento", icon: CalendarPlus, tone: "pink", route: "AdminCreateEvent" },
  { title: "Recompensas", icon: Gift, tone: "orange", route: "AdminRewards" },
  { title: "Conquistas", icon: Trophy, tone: "yellow", route: "AdminAchievements" },
];

export default function AdminDashboard({ navigation }: AdminDashboardProps) {
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
        {menuItems.map((item) => (
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
