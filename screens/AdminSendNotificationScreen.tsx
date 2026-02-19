import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Send, Bell, ShieldAlert, Gift, Info } from "lucide-react-native";
import { api } from "../services/api";

export default function AdminSendNotificationScreen({ navigation }: any) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("bell");
  const [loading, setLoading] = useState(false);

  const icons = [
    { id: "bell", component: Bell, label: "Geral" },
    { id: "shield", component: ShieldAlert, label: "Alerta" },
    { id: "gift", component: Gift, label: "Promo" },
    { id: "info", component: Info, label: "Info" },
  ];

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
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 20 }}
    >
      <Text style={styles.label}>Título da Notificação</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Ex: Manutenção no Sábado"
      />

      <Text style={styles.label}>Mensagem</Text>
      <TextInput
        style={[styles.input, { height: 100, textAlignVertical: "top" }]}
        value={message}
        onChangeText={setMessage}
        placeholder="Digite a mensagem para todos os usuários..."
        multiline
      />

      <Text style={styles.label}>Ícone</Text>
      <View style={styles.iconRow}>
        {icons.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.iconBtn,
              selectedIcon === item.id && styles.iconBtnActive,
            ]}
            onPress={() => setSelectedIcon(item.id)}
          >
            <item.component
              color={selectedIcon === item.id ? "#fff" : "#64748b"}
              size={24}
            />
            <Text
              style={[
                styles.iconLabel,
                selectedIcon === item.id && { color: "#fff" },
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={styles.sendBtn}
        onPress={handleSend}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Send color="#fff" size={20} />
            <Text style={styles.sendBtnText}>Enviar para Todos</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  label: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#475569",
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },
  iconRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  iconBtn: {
    flex: 1,
    alignItems: "center",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
    marginHorizontal: 4,
  },
  iconBtnActive: { backgroundColor: "#E11D48", borderColor: "#E11D48" },
  iconLabel: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 5,
    fontWeight: "600",
  },
  sendBtn: {
    backgroundColor: "#06b6d4",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    borderRadius: 15,
    marginTop: 40,
    gap: 10,
  },
  sendBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
