import "react-native-gesture-handler";
import React from "react";
import { View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import {
  Home,
  DoorOpen,
  Bell,
  User,
  MessageCircle,
  ShieldCheck,
} from "lucide-react-native";
import { api } from "./services/api";

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
import GameDetailScreen from "./screens/GameDetailScreen";

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
import AdminEventsManagementScreen from "./screens/AdminEventsManagementScreen";
import AdminReportsScreen from "./screens/AdminReportsScreen";
import GamesListScreen from "./screens/GameListScreen";

const queryClient = new QueryClient();
const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const THEME = {
  primary: "#c73636",
  primaryDark: "#9f1d1d",
  text: "#FFF",
  textMuted: "#78716c",
  background: "#faf6f1",
};

// Navegação por Abas (Dinâmica para User e Admin)
function TabNavigator() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  // Busca global para os Badges de Chats
  const { data: chatsData } = useQuery({
    queryKey: ["chats"],
    queryFn: async () => (await api.get("/chats")).data,
    refetchInterval: 5000,
  });

  // Busca global para os Badges de Avisos
  const { data: notifsData } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () =>
      (await api.get("/notifications", { params: { skip: 0, take: 50 } })).data,
    refetchInterval: 5000,
  });

  // Busca global para Solicitações de Amizade
  const { data: reqsData } = useQuery({
    queryKey: ["friendRequests", "pending_global"],
    queryFn: async () => (await api.get("/friends/requests/pending")).data,
    refetchInterval: 5000,
  });

  const hasUnreadChats = chatsData?.data?.some((c: any) => c.unreadCount > 0);
  const unreadNotifsCount =
    notifsData?.data?.filter((n: any) => !n.isRead).length || 0;

  // Como sua API é paginada, normalmente reqsData.data terá a lista
  const pendingReqsCount = reqsData?.data?.length || reqsData?.length || 0;

  const totalNotifications = unreadNotifsCount + pendingReqsCount;

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: THEME.primary,
        tabBarInactiveTintColor: THEME.textMuted,
        tabBarStyle: {
          height: 64 + (insets.bottom || 0),
          paddingBottom: (insets.bottom || 0) + 8,
          paddingTop: 8,
          backgroundColor: "#fff",
          borderTopWidth: 0,
          elevation: 12,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
        },
        tabBarLabelStyle: { fontWeight: "600", fontSize: 12 },
        headerTitleStyle: { fontWeight: "bold", color: THEME.text },
        headerStyle: {
          backgroundColor: THEME.primary,
          elevation: 0,
          shadowOpacity: 0,
        },
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
          tabBarBadge: hasUnreadChats ? "" : undefined,
          tabBarBadgeStyle: {
            minWidth: 10,
            maxHeight: 10,
            borderRadius: 5,
            backgroundColor: THEME.primary,
          },
        }}
      />

      {/* <Tab.Screen
        name="Salas"
        component={RoomsScreen}
        options={{
          tabBarIcon: ({ color }) => <DoorOpen color={color} size={22} />,
          headerShown: false,
        }}
      /> */}

      <Tab.Screen
        name="Notificações"
        component={NotificationsScreen}
        options={{
          tabBarIcon: ({ color }) => <Bell color={color} size={22} />,
          // Agora soma avisos E amizades para acender a bolinha vermelha!
          tabBarBadge: totalNotifications > 0 ? totalNotifications : undefined,
          tabBarBadgeStyle: { backgroundColor: THEME.primary },
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
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: THEME.background,
        }}
      >
        <ActivityIndicator size="large" color={THEME.primary} />
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
        headerStyle: { backgroundColor: THEME.primary },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "bold", fontSize: 18 },
        headerBackTitle: "",
        cardStyle: { backgroundColor: THEME.background },
      }}
    >
      <Stack.Screen
        name="MainTabs"
        component={TabNavigator}
        options={{ headerShown: false }}
      />
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
      <Stack.Screen
        name="AdminEventsManagement"
        component={AdminEventsManagementScreen}
        options={{ title: "Gerenciar Eventos" }}
      />
      <Stack.Screen
        name="AdminCreateEvent"
        component={AdminCreateEventScreen}
        options={{
          title: user?.role === "ADMIN" ? "Evento Oficial" : "Solicitar Evento",
        }}
      />
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
      <Stack.Screen
        name="AdminReports"
        component={AdminReportsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="GamesList"
        component={GamesListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="GameDetail"
        component={GameDetailScreen}
        options={{ headerShown: false }}
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
