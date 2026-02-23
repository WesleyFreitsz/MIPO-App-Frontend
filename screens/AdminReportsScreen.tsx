import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import {
  ChevronLeft,
  AlertTriangle,
  ShieldAlert,
  Trash2,
  Ban,
} from "lucide-react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";

export default function AdminReportsScreen({ navigation }: any) {
  const queryClient = useQueryClient();

  const { data: reports, isLoading } = useQuery({
    queryKey: ["admin_reports"],
    queryFn: async () => (await api.get("/reports")).data,
  });

  const dismissReportMutation = useMutation({
    mutationFn: (reportId: string) => api.patch(`/reports/${reportId}/dismiss`),
    onSuccess: () => {
      Alert.alert("Sucesso", "A denúncia foi ignorada.");
      queryClient.invalidateQueries({ queryKey: ["admin_reports"] });
    },
  });

  const banUserMutation = useMutation({
    mutationFn: (userId: string) => api.patch(`/users/${userId}/ban`),
    onSuccess: () => {
      Alert.alert("Sucesso", "Usuário banido com sucesso.");
      queryClient.invalidateQueries({ queryKey: ["admin_reports"] });
    },
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#c73636" />
      </SafeAreaView>
    );
  }

  const renderReport = ({ item }: any) => (
    <View style={styles.card}>
      <View style={styles.header}>
        <AlertTriangle color="#ef4444" size={20} />
        <Text style={styles.headerTitle}>Denúncia de Post</Text>
      </View>

      <View style={styles.usersInfo}>
        <Text style={styles.label}>Denunciante:</Text>
        <Text style={styles.value}>
          @{item.reporterUser?.nickname || item.reporterUser?.name}
        </Text>
      </View>

      <View style={styles.usersInfo}>
        <Text style={styles.label}>Acusado (Postou):</Text>
        <Text style={[styles.value, { color: "#ef4444", fontWeight: "bold" }]}>
          @{item.reportedUser?.nickname || item.reportedUser?.name}
        </Text>
      </View>

      <View style={styles.reasonBox}>
        <Text style={styles.label}>Motivo / Descrição:</Text>
        <Text style={styles.reasonText}>{item.reason}</Text>
      </View>

      {item.imageUrl && (
        <View style={{ marginTop: 10 }}>
          <Text style={styles.label}>Print Anexado:</Text>
          <Image source={{ uri: item.imageUrl }} style={styles.printImage} />
        </View>
      )}

      {item.post && (
        <View style={styles.postBox}>
          <Text style={styles.label}>Post Original:</Text>
          <Text style={styles.postText}>{item.post.content}</Text>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.btnDismiss]}
          onPress={() => dismissReportMutation.mutate(item.id)}
        >
          <Trash2 color="#475569" size={16} />
          <Text style={styles.btnTextDismiss}>Ignorar Denúncia</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.btnBan]}
          onPress={() => {
            Alert.alert(
              "Atenção",
              "Tem certeza que deseja BANIR este usuário?",
              [
                { text: "Cancelar", style: "cancel" },
                {
                  text: "Banir",
                  style: "destructive",
                  onPress: () => banUserMutation.mutate(item.reportedUser.id),
                },
              ],
            );
          }}
        >
          <Ban color="#fff" size={16} />
          <Text style={styles.btnTextBan}>Banir Acusado</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.appBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft color="#1e293b" size={28} />
        </TouchableOpacity>
        <ShieldAlert
          color="#ef4444"
          size={24}
          style={{ marginLeft: 15, marginRight: 8 }}
        />
        <Text style={styles.appBarTitle}>Painel de Denúncias</Text>
      </View>

      <FlatList
        data={reports}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={renderReport}
        ListEmptyComponent={
          <Text
            style={{ textAlign: "center", marginTop: 40, color: "#64748b" }}
          >
            Nenhuma denúncia pendente.
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  appBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  appBarTitle: { fontSize: 18, fontWeight: "bold", color: "#1e293b" },

  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  headerTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ef4444",
    marginLeft: 8,
  },

  usersInfo: { flexDirection: "row", marginBottom: 6 },
  label: { fontSize: 14, fontWeight: "bold", color: "#64748b", marginRight: 6 },
  value: { fontSize: 14, color: "#1e293b" },

  reasonBox: {
    backgroundColor: "#fef2f2",
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  reasonText: { fontSize: 14, color: "#991b1b", marginTop: 4 },

  printImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginTop: 6,
    resizeMode: "cover",
  },

  postBox: {
    backgroundColor: "#f1f5f9",
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#cbd5e1",
  },
  postText: {
    fontSize: 14,
    color: "#334155",
    fontStyle: "italic",
    marginTop: 4,
  },

  actions: { flexDirection: "row", marginTop: 16, gap: 10 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },

  btnDismiss: { backgroundColor: "#f1f5f9" },
  btnTextDismiss: { color: "#475569", fontWeight: "bold", fontSize: 13 },

  btnBan: { backgroundColor: "#ef4444" },
  btnTextBan: { color: "#fff", fontWeight: "bold", fontSize: 13 },
});
