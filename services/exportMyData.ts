import { Share } from "react-native";
import { api } from "./api";

// shortcut: compartilha o JSON como texto; trocar por arquivo (expo-file-system + expo-sharing) se o export ficar grande demais para o Share.
export async function exportMyData() {
  const { data } = await api.get<Record<string, unknown>>("/users/me/export");
  await Share.share({
    title: "Meus dados no Mipo",
    message: JSON.stringify(data, null, 2),
  });
}
