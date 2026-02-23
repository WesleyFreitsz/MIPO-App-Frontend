import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import {
  Users,
  Calendar,
  Gamepad2,
  Trophy,
  Gift,
  DollarSign,
  Bell,
  CheckSquare,
  PlusCircle,
} from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const AdminMenuCard = ({ title, icon: Icon, color, onPress }: any) => (
  <TouchableOpacity style={styles.menuCard} onPress={onPress}>
    <View style={[styles.iconBox, { backgroundColor: color }]}>
      <Icon color="#fff" size={24} />
    </View>
    <Text style={styles.menuText}>{title}</Text>
  </TouchableOpacity>
);

export default function AdminDashboard({ navigation }: any) {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.welcome}>Painel Administrativo 🛡️</Text>

        <View style={styles.grid}>
          <AdminMenuCard
            title="Aprovar Reservas"
            icon={CheckSquare}
            color="#E11D48"
            onPress={() => navigation.navigate("AdminApprovals")}
          />
          <AdminMenuCard
            title="Gerenciar Eventos"
            icon={Calendar}
            color="#f59e0b"
            onPress={() => navigation.navigate("AdminEventsManagement")}
          />
          <AdminMenuCard
            title="Notificações"
            icon={Bell}
            color="#06b6d4"
            onPress={() => navigation.navigate("AdminNotifications")} // Atualize aqui
          />
          <AdminMenuCard
            title="Financeiro"
            icon={DollarSign}
            color="#10b981"
            onPress={() => navigation.navigate("AdminFinance")}
          />
          <AdminMenuCard
            title="Usuários"
            icon={Users}
            color="#6366f1"
            onPress={() => navigation.navigate("AdminUsers")}
          />
          <AdminMenuCard
            title="Cadastrar Jogos"
            icon={Gamepad2}
            color="#f59e0b"
            onPress={() => navigation.navigate("AdminGames")}
          />
          <AdminMenuCard
            title="Criar Evento"
            icon={PlusCircle}
            color="#8b5cf6"
            onPress={() => navigation.navigate("AdminCreateEvent")}
          />
          <AdminMenuCard
            title="Recompensas"
            icon={Gift}
            color="#f43f5e"
            onPress={() => navigation.navigate("AdminRewards")}
          />
          <AdminMenuCard
            title="Conquistas"
            icon={Trophy}
            color="#ec4899"
            onPress={() => navigation.navigate("AdminAchievements")}
          />
          <AdminMenuCard
            title="Notificações"
            icon={Bell}
            color="#06b6d4"
            onPress={() => {}}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  scroll: { padding: 20 },
  welcome: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 25,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  menuCard: {
    backgroundColor: "#fff",
    width: "47%",
    padding: 20,
    borderRadius: 20,
    marginBottom: 15,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  iconBox: { padding: 12, borderRadius: 15, marginBottom: 10 },
  menuText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#475569",
    textAlign: "center",
  },
});
