import { useState } from "react";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import Constants from "expo-constants"; // Instale: npx expo install expo-constants
import { api } from "./api";

Notifications.setNotificationHandler({
  handleNotification: async () =>
    ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }) as Notifications.NotificationBehavior,
});

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);

  async function requestPermission() {
    // 1. Verificação de Segurança para evitar erros no Expo Go (Android)
    if (Platform.OS === "android" && Constants.appOwnership !== "expo") {
      // Se estiver num build de desenvolvimento ou produção, configura o canal
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }

    // Se não for dispositivo físico, para por aqui
    if (!Device.isDevice) {
      console.log("Push Notifications não funcionam em emuladores.");
      return null;
    }

    try {
      // 2. Pede permissão
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        // Usuário negou: Limpa o token no backend
        try {
          await api.patch("/users/notification-token", { token: null });
        } catch (e) {}
        return null;
      }

      // 3. Tenta pegar o token (Com tratamento de erro para Expo Go)
      // Removemos o projectId para evitar o erro 400 se você não tiver conta paga/configurada no EAS
      const tokenData = await Notifications.getExpoPushTokenAsync();
      const token = tokenData.data;

      setExpoPushToken(token);

      // Salva no backend
      if (token) {
        await api.patch("/users/notification-token", { token }); // <-- Verifique se 'token' não é nulo/undefined aqui
      }

      return token;
    } catch (error) {
      // Silencia o erro para não travar o app do usuário
      console.log(
        "Aviso: Falha ao obter token push (Normal se estiver no Expo Go Android).",
      );
      return null;
    }
  }

  return { expoPushToken, requestPermission };
}
