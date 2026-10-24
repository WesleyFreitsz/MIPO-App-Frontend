import "react-native-gesture-handler";
import React, { useEffect, useMemo } from "react";
import { View } from "react-native";
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  Theme as NavigationTheme,
} from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider, useMipoFonts, useTheme } from "./theme";
import { LoadingState } from "./components/ui";
import { MipoTabBar } from "./navigation/MipoTabBar";
import { useTabBadges } from "./navigation/useTabBadges";

// Contexto
import { AuthProvider, useAuth } from "./context/AuthContext";

// Telas de Usuário
import LoginScreen from "./screens/LoginScreen";
import HomeScreen from "./screens/HomeScreen";
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

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const queryClient = new QueryClient();
const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Navegação por Abas (Dinâmica para User e Admin)
function TabNavigator() {
  const { user } = useAuth();
  const badges = useTabBadges();

  return (
    <Tab.Navigator tabBar={(props) => <MipoTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Início" component={HomeScreen} />
      {user?.role === "ADMIN" && <Tab.Screen name="Painel" component={AdminDashboard} />}
      <Tab.Screen name="Social" component={SocialScreen} options={{ tabBarBadge: badges.social ? "" : undefined }} />

      {/* A aba Salas segue desligada (RoomsScreen fora do redesign). */}

      <Tab.Screen
        name="Notificações"
        component={NotificationsScreen}
        options={{
          tabBarLabel: "Avisos",
          tabBarBadge: badges.avisos > 0 ? badges.avisos : undefined,
        }}
      />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function Routes() {
  const { signed, loading } = useAuth();
  const { colors } = useTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 14, backgroundColor: colors.bg }}>
        <LoadingState skeletons={0} />
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
    <Stack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
      <Stack.Screen name="CreateChatGroup" component={CreateChatGroupScreen} />
      <Stack.Screen name="PlayerProfile" component={PlayerProfileScreen} />
      <Stack.Screen name="EventsList" component={EventsListScreen} />
      <Stack.Screen name="AdminEventsManagement" component={AdminEventsManagementScreen} />
      <Stack.Screen name="AdminCreateEvent" component={AdminCreateEventScreen} />
      <Stack.Screen name="AdminUsers" component={AdminUsersScreen} />
      <Stack.Screen name="AdminFinance" component={AdminFinanceScreen} />
      <Stack.Screen name="AdminGames" component={AdminGamesScreen} />
      <Stack.Screen name="AdminRewards" component={AdminRewardsScreen} />
      <Stack.Screen name="AdminApprovals" component={AdminApprovalsScreen} />
      <Stack.Screen name="AdminAchievements" component={AdminAchievementsScreen} />
      <Stack.Screen name="AdminNotifications" component={AdminSendNotificationScreen} />
      <Stack.Screen name="AdminReports" component={AdminReportsScreen} />
      <Stack.Screen name="GamesList" component={GamesListScreen} />
      <Stack.Screen name="GameDetail" component={GameDetailScreen} />
    </Stack.Navigator>
  );
}

function ThemedApp() {
  const { scheme, colors } = useTheme();
  const fontsReady = useMipoFonts();

  useEffect(() => {
    if (fontsReady) SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsReady]);

  const navigationTheme = useMemo<NavigationTheme>(() => {
    const base = scheme === "dark" ? DarkTheme : DefaultTheme;
    return {
      ...base,
      dark: scheme === "dark",
      colors: {
        ...base.colors,
        primary: colors.red,
        background: colors.bg,
        card: colors.bg,
        text: colors.text,
        border: colors.line,
        notification: colors.red,
      },
    };
  }, [scheme, colors]);

  if (!fontsReady) return null;

  return (
    <NavigationContainer theme={navigationTheme}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Routes />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ThemedApp />
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
