import { useCallback, useEffect, useRef, useState } from "react";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { api } from "./api";
import { navigationRef, openNotificationTarget, parseNotificationData } from "../navigation/navigationRef";

// Define como o app se comporta quando recebe notificação com ele ABERTO (foreground)
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const title = notification.request.content.title || "";

    // Verifica se é uma notificação "silenciosa" (como likes e comentários)
    const isQuietNotification =
      title.includes("Like") || title.includes("Comentário");

    return {
      shouldShowAlert: !isQuietNotification,
      shouldPlaySound: !isQuietNotification,
      shouldSetBadge: false,
      // NOVAS PROPRIEDADES EXIGIDAS PELO EXPO:
      shouldShowBanner: !isQuietNotification,
      shouldShowList: !isQuietNotification,
    } as Notifications.NotificationBehavior; // <--- Cast para garantir a tipagem correta
  },
});

const NAVIGATION_READY_RETRY_MS = 300;

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);

  const requestPermission = useCallback(async () => {
    if (!Device.isDevice) {
      console.log("Push Notifications não funcionam em emuladores.");
      return null;
    }

    // Aborta a requisição silenciosamente para evitar falhas do Expo Go Android (SDK 53+)
    if (Platform.OS === "android" && Constants.appOwnership === "expo") {
      console.log(
        "Push notifications (remote) não suportadas no Expo Go Android SDK 53+.",
      );
      return null;
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
      await Notifications.setNotificationChannelAsync("orders", {
        name: "Pedidos da loja",
        importance: Notifications.AndroidImportance.MAX,
        sound: "default",
        vibrationPattern: [0, 400, 200, 400],
        lightColor: "#F6E22D",
      });
    }

    try {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        try {
          await api.patch("/users/notification-token", { token: null });
        } catch (e) {}
        return null;
      }

      // PARA FUNCIONAR REAL NO ANDROID E IOS EM PRODUÇÃO (APK / TESTFLIGHT)
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId;

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      const token = tokenData.data;

      setExpoPushToken(token);

      if (token) {
        await api.patch("/users/notification-token", { token });
      }

      return token;
    } catch (error) {
      console.log("Aviso: Falha ao obter token push.", error);
      return null;
    }
  }, []);

  return { expoPushToken, requestPermission };
}

/**
 * Registra o token assim que o usuário entra e abre a tela certa quando ele toca num push
 * (inclusive com o app fechado). Montar uma vez, dentro do NavigationContainer, só com usuário logado.
 */
export function usePushNotificationsSetup() {
  const { requestPermission } = usePushNotifications();
  const lastResponse = Notifications.useLastNotificationResponse();
  const handledId = useRef<string | null>(null);

  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  useEffect(() => {
    if (!lastResponse || lastResponse.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const id = lastResponse.notification.request.identifier;
    if (handledId.current === id) return;

    const data = parseNotificationData(lastResponse.notification.request.content.data);
    const open = () => {
      if (!navigationRef.isReady()) return false;
      handledId.current = id;
      openNotificationTarget(data, (name, params) => navigationRef.navigate(name, params));
      return true;
    };
    if (open()) return;
    const timer = setTimeout(open, NAVIGATION_READY_RETRY_MS);
    return () => clearTimeout(timer);
  }, [lastResponse]);
}
