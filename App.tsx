import "react-native-gesture-handler";
import React from "react";
import { View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  Home,
  DoorOpen,
  Bell,
  User,
  MessageCircle,
  ShieldCheck,
} from "lucide-react-native";

// Contexto
import { AuthProvider, useAuth } from "./context/AuthContext";

// Telas de Usuário
import LoginScreen from "./screens/LoginScreen";
import HomeScreen from "./screens/HomeScreen";
import RoomsScreen from "./screens/RoomsScreen";
import ProfileScreen from "./screens/ProfileScreen";
import NotificationsScreen from "./screens/NotificationsScreen";
import SocialScreen from "./screens/SocialScreen";
import ChatDetailScreen from "./screens/ChatDetailScreen";
import EventsListScreen from "./screens/EventsListScreen";
import CreateChatGroupScreen from "./screens/CreateChatGroupScreen";
import PlayerProfileScreen from "./screens/PlayerProfileScreen";

// Telas de Administração
import AdminDashboard from "./screens/AdminDashboard";
import AdminUsersScreen from "./screens/AdminUsersScreen";
import AdminFinanceScreen from "./screens/AdminFinanceScreen";
import AdminGamesScreen from "./screens/AdminGamesScreen";
import AdminRewardsScreen from "./screens/AdminRewardsScreen";
import AdminApprovalsScreen from "./screens/AdminApprovalsScreen";
import AdminAchievementsScreen from "./screens/AdminAchievementsScreen";
import AdminCreateEventScreen from "./screens/AdminCreateEventScreen";
import AdminSendNotificationScreen from "./screens/AdminSendNotificationScreen";
import AdminEventsManagementScreen from "./screens/AdminEventsManagementScreen"; // <--- NOVA TELA

const queryClient = new QueryClient();
const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const MIPO_COLORS = {
  primary: "#E11D48",
  text: "#1e293b",
  inactive: "#94a3b8",
};

// Navegação por Abas (Dinâmica para User e Admin)
function TabNavigator() {
  const { user } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: MIPO_COLORS.primary,
        tabBarInactiveTintColor: MIPO_COLORS.inactive,
        tabBarStyle: { height: 60, paddingBottom: 8 },
        headerTitleStyle: { fontWeight: "bold", color: MIPO_COLORS.text },
      }}
    >
      <Tab.Screen
        name="Início"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color }) => <Home color={color} size={22} />,
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Salas"
        component={RoomsScreen}
        options={{
          tabBarIcon: ({ color }) => <DoorOpen color={color} size={22} />,
          headerShown: false,
        }}
      />

      {/* ABA EXCLUSIVA DO ADMIN NO TAB BAR */}
      {user?.role === "ADMIN" && (
        <Tab.Screen
          name="Painel"
          component={AdminDashboard}
          options={{
            tabBarIcon: ({ color }) => <ShieldCheck color={color} size={22} />,
            title: "Painel Admin",
          }}
        />
      )}

      <Tab.Screen
        name="Social"
        component={SocialScreen}
        options={{
          tabBarIcon: ({ color }) => <MessageCircle color={color} size={22} />,
        }}
      />
      <Tab.Screen
        name="Alertas"
        component={NotificationsScreen}
        options={{
          tabBarIcon: ({ color }) => <Bell color={color} size={22} />,
        }}
      />
      <Tab.Screen
        name="Perfil"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color }) => <User color={color} size={22} />,
          headerShown: false,
        }}
      />
    </Tab.Navigator>
  );
}

function Routes() {
  const { user, signed, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={MIPO_COLORS.primary} />
      </View>
    );
  }

  if (!signed) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: MIPO_COLORS.primary },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "bold" },
      }}
    >
      {/* A navegação base agora é o TabNavigator para todos */}
      <Stack.Screen
        name="MainTabs"
        component={TabNavigator}
        options={{ headerShown: false }}
      />

      {/* ROTAS COMPARTILHADAS E DE ADMIN (STACK) */}
      <Stack.Screen
        name="ChatDetail"
        component={ChatDetailScreen}
        options={({ route }: any) => ({ title: route.params.name })}
      />
      <Stack.Screen
        name="CreateChatGroup"
        component={CreateChatGroupScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PlayerProfile"
        component={PlayerProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EventsList"
        component={EventsListScreen}
        options={{ title: "Eventos" }}
      />

      {/* GERENCIAMENTO DE EVENTOS (NOVA TELA) */}
      <Stack.Screen
        name="AdminEventsManagement"
        component={AdminEventsManagementScreen}
        options={{ title: "Gerenciar Eventos" }}
      />

      {/* CRIAÇÃO/EDIÇÃO DE EVENTO (USADA POR AMBOS) */}
      <Stack.Screen
        name="AdminCreateEvent"
        component={AdminCreateEventScreen}
        options={{
          title: user?.role === "ADMIN" ? "Evento Oficial" : "Solicitar Evento",
        }}
      />

      {/* DEMAIS TELAS ADMIN */}
      <Stack.Screen
        name="AdminUsers"
        component={AdminUsersScreen}
        options={{ title: "Usuários" }}
      />
      <Stack.Screen
        name="AdminFinance"
        component={AdminFinanceScreen}
        options={{ title: "Financeiro" }}
      />
      <Stack.Screen
        name="AdminGames"
        component={AdminGamesScreen}
        options={{ title: "Catálogo" }}
      />
      <Stack.Screen
        name="AdminRewards"
        component={AdminRewardsScreen}
        options={{ title: "Recompensas" }}
      />
      <Stack.Screen
        name="AdminApprovals"
        component={AdminApprovalsScreen}
        options={{ title: "Aprovações" }}
      />
      <Stack.Screen
        name="AdminAchievements"
        component={AdminAchievementsScreen}
        options={{ title: "Conquistas" }}
      />
      <Stack.Screen
        name="AdminNotifications"
        component={AdminSendNotificationScreen}
        options={{ title: "Notificações" }}
      />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <NavigationContainer>
            <StatusBar style="light" />
            <Routes />
          </NavigationContainer>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
