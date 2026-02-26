import { useState } from "react";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { api } from "./api";

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

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);

  async function requestPermission() {
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
  }

  return { expoPushToken, requestPermission };
}
