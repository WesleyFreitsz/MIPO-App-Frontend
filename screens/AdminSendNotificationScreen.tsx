import React, { useState } from "react";
import { View, Alert, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import { Send, Bell, ShieldAlert, Gift, Info } from "lucide-react-native";
import { api } from "../services/api";
import { Button, Card, Character, Chip, FieldLabel, Input, MipoText, Screen, ScreenHeader } from "../components/ui";

interface AdminSendNotificationScreenProps {
  navigation: Pick<NavigationProp<ParamListBase>, "goBack">;
}

const icons = [
  { id: "bell", component: Bell, label: "Geral" },
  { id: "shield", component: ShieldAlert, label: "Alerta" },
  { id: "gift", component: Gift, label: "Promo" },
  { id: "info", component: Info, label: "Info" },
];

export default function AdminSendNotificationScreen({ navigation }: AdminSendNotificationScreenProps) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("bell");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!title || !message)
      return Alert.alert("Erro", "Preencha título e mensagem.");

    setLoading(true);
    try {
      await api.post("/notifications/admin-broadcast", {
        title,
        message,
        icon: selectedIcon,
      });
      Alert.alert("Sucesso", "Notificação enviada para todos!");
      navigation.goBack();
    } catch (error) {
      Alert.alert("Erro", "Falha ao enviar notificação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen>
        <ScreenHeader title="Enviar aviso" subtitle="Vai para todos os jogadores" />
        <ScrollView
          style={{ flex: 1, marginHorizontal: -14 }}
          contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 16 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <FieldLabel>Tipo</FieldLabel>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {icons.map((item) => (
              <Chip
                key={item.id}
                label={item.label}
                icon={item.component}
                tone={selectedIcon === item.id ? "active" : "neutral"}
                selected={selectedIcon === item.id}
                onPress={() => setSelectedIcon(item.id)}
              />
            ))}
          </View>

          <FieldLabel>Título</FieldLabel>
          <Input value={title} onChangeText={setTitle} placeholder="Ex: Manutenção no sábado" />

          <FieldLabel>Mensagem</FieldLabel>
          <Input
            value={message}
            onChangeText={setMessage}
            placeholder="Digite a mensagem para todos os usuários..."
            multiline
            containerStyle={{ minHeight: 70 }}
          />

          <FieldLabel>Prévia</FieldLabel>
          <Card contentStyle={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Character name="carta3" size={40} motion="none" />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
                <MipoText variant="cardTitle" numberOfLines={1} style={{ flex: 1 }}>
                  {title || "Título do aviso"}
                </MipoText>
                <MipoText variant="micro">agora</MipoText>
              </View>
              <MipoText variant="caption" numberOfLines={2}>
                {message || "A mensagem aparece aqui."}
              </MipoText>
            </View>
          </Card>
        </ScrollView>

        <Button label="Enviar" icon={Send} variant="red" block loading={loading} onPress={handleSend} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
