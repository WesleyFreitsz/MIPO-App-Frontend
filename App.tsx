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
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider, useMipoFonts, useTheme } from "./theme";
import { AlertHost, LoadingState } from "./components/ui";
import { MipoTabBar } from "./navigation/MipoTabBar";
import { useTabBadges } from "./navigation/useTabBadges";
import { OfflineBanner } from "./components/OfflineBanner";
import { navigationRef } from "./navigation/navigationRef";
import { linking } from "./navigation/linking";
import { SocketProvider } from "./context/SocketContext";
import BlockedUsersScreen from "./screens/BlockedUsersScreen";
import StoreScreen from "./screens/StoreScreen";
import StoreTabScreen from "./screens/StoreTabScreen";
import PlayCallsScreen from "./screens/PlayCallsScreen";
import AdminReviewsScreen from "./screens/AdminReviewsScreen";
import { PendingReviewPrompt } from "./components/PendingReviewPrompt";
import { BirthDateGate, TermsGate } from "./components/LegalGates";
import StoreCheckInScreen from "./screens/StoreCheckInScreen";
import MenuScreen from "./screens/MenuScreen";
import StaffOrdersScreen from "./screens/StaffOrdersScreen";
import StaffCheckInScreen from "./screens/StaffCheckInScreen";
import AdminMenuScreen from "./screens/AdminMenuScreen";
import AdminStoreScreen from "./screens/AdminStoreScreen";
import AdminVisitsStatsScreen from "./screens/AdminVisitsStatsScreen";
import { usePushNotificationsSetup } from "./services/usePushNotifications";
import { persistMaxAge, queryClient, queryPersister } from "./services/queryClient";

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
import MonthlyGamesScreen from "./screens/MonthlyGamesScreen";
import MonthlyGamesHistoryScreen from "./screens/MonthlyGamesHistoryScreen";
import AdminMonthlyGamesScreen from "./screens/AdminMonthlyGamesScreen";
import SettingsScreen from "./screens/SettingsScreen";
import ChangePasswordScreen from "./screens/ChangePasswordScreen";
import RewardsStoreScreen from "./screens/RewardsStoreScreen";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Navegação por Abas (Dinâmica para User e Admin)
function TabNavigator() {
  const { user } = useAuth();
  const badges = useTabBadges();

  return (
    <Tab.Navigator tabBar={(props) => <MipoTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Início" component={HomeScreen} />
      {user && user.role !== "USER" && <Tab.Screen name="Painel" component={AdminDashboard} />}
      <Tab.Screen name="Social" component={SocialScreen} options={{ tabBarBadge: badges.social ? "" : undefined }} />
      <Tab.Screen name="Na loja" component={StoreTabScreen} />

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

function SignedInEffects() {
  usePushNotificationsSetup();
  return (
    <>
      <BirthDateGate />
      <TermsGate />
      <PendingReviewPrompt />
    </>
  );
}

function Routes() {
  const { signed, loading } = useAuth();
  const { colors } = useTheme();

  useEffect(() => {
    if (!loading && !signed) queryClient.clear();
  }, [signed, loading]);

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
    <>
      <SignedInEffects />
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
        <Stack.Screen name="MonthlyGames" component={MonthlyGamesScreen} />
        <Stack.Screen name="MonthlyGamesHistory" component={MonthlyGamesHistoryScreen} />
        <Stack.Screen name="AdminMonthlyGames" component={AdminMonthlyGamesScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
        <Stack.Screen name="RewardsStore" component={RewardsStoreScreen} />
        <Stack.Screen name="BlockedUsers" component={BlockedUsersScreen} />
        <Stack.Screen name="Store" component={StoreScreen} />
        <Stack.Screen name="PlayCalls" component={PlayCallsScreen} />
        <Stack.Screen name="AdminReviews" component={AdminReviewsScreen} />
        <Stack.Screen name="StoreCheckIn" component={StoreCheckInScreen} />
        <Stack.Screen name="Menu" component={MenuScreen} />
        <Stack.Screen name="StaffOrders" component={StaffOrdersScreen} />
        <Stack.Screen name="StaffCheckIn" component={StaffCheckInScreen} />
        <Stack.Screen name="AdminMenu" component={AdminMenuScreen} />
        <Stack.Screen name="AdminStore" component={AdminStoreScreen} />
        <Stack.Screen name="AdminVisitsStats" component={AdminVisitsStatsScreen} />
      </Stack.Navigator>
    </>
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
    <NavigationContainer ref={navigationRef} linking={linking} theme={navigationTheme}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Routes />
      <OfflineBanner />
      <AlertHost />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: queryPersister, maxAge: persistMaxAge, buster: "v2" }}>
          <AuthProvider>
            <SocketProvider>
              <ThemedApp />
            </SocketProvider>
          </AuthProvider>
        </PersistQueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
