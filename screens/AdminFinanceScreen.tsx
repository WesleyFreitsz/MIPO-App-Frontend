import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import { SafeAreaView } from "react-native-safe-area-context";

const StatCard = ({ title, value, type }: any) => (
  <View style={styles.statCard}>
    <View
      style={[
        styles.iconCircle,
        { backgroundColor: type === "in" ? "#dcfce7" : "#fee2e2" },
      ]}
    >
      {type === "in" ? (
        <TrendingUp size={20} color="#166534" />
      ) : (
        <TrendingDown size={20} color="#991b1b" />
      )}
    </View>
    <Text style={styles.statLabel}>{title}</Text>
    <Text
      style={[
        styles.statValue,
        { color: type === "in" ? "#166534" : "#991b1b" },
      ]}
    >
      R$ {Number(value).toFixed(2)}
    </Text>
  </View>
);

export default function AdminFinanceScreen() {
  const {
    data: summary,
    isLoading: summaryLoading,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ["finance", "summary"],
    queryFn: async () => {
      const res = await api.get("/finance/summary");
      return res.data;
    },
  });

  const {
    data: transactions = [],
    isLoading: transactionsLoading,
    refetch: refetchTransactions,
  } = useQuery({
    queryKey: ["finance", "transactions"],
    queryFn: async () => {
      const res = await api.get("/finance/transactions", {
        params: { skip: 0, take: 50 },
      });
      return Array.isArray(res.data) ? res.data : res.data?.data || [];
    },
  });

  const onRefresh = () => {
    refetchSummary();
    refetchTransactions();
  };

  const isLoading = summaryLoading || transactionsLoading;

  if (isLoading && !summary && !transactions?.length) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#E11D48" />
      </SafeAreaView>
    );
  }

  const totalIn = summary?.totalIn ?? 0;
  const totalOut = summary?.totalOut ?? 0;
  const balance = summary?.balance ?? totalIn - totalOut;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            colors={["#E11D48"]}
          />
        }
      >
        <Text style={styles.title}>Resumo Financeiro 📊</Text>

        <View style={styles.mainBalance}>
          <Text style={styles.balanceLabel}>Saldo em Caixa</Text>
          <Text style={styles.balanceValue}>R$ {Number(balance).toFixed(2)}</Text>
        </View>

        <View style={styles.statsRow}>
          <StatCard title="Entradas" value={totalIn} type="in" />
          <StatCard title="Saídas" value={totalOut} type="out" />
        </View>

        <Text style={styles.sectionTitle}>Transações Recentes</Text>
        {transactions.length === 0 ? (
          <Text style={styles.emptyText}>Nenhuma transação registrada.</Text>
        ) : (
          transactions.map((item: any) => (
            <View key={item.id} style={styles.transactionCard}>
              <View style={styles.transIcon}>
                {item.type === "in" ? (
                  <ArrowUpRight color="#166534" size={20} />
                ) : (
                  <ArrowDownRight color="#991b1b" size={20} />
                )}
              </View>
              <View style={styles.transDetails}>
                <Text style={styles.transDesc}>{item.description}</Text>
                <Text style={styles.transDate}>
                  {formatDate(item.createdAt || item.date)}
                </Text>
              </View>
              <Text
                style={[
                  styles.transValue,
                  { color: item.type === "in" ? "#166534" : "#991b1b" },
                ]}
              >
                {item.type === "in" ? "+" : "-"} R${" "}
                {Number(item.value).toFixed(2)}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  centered: { justifyContent: "center", alignItems: "center" },
  scroll: { padding: 20 },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 20,
  },
  mainBalance: {
    backgroundColor: "#E11D48",
    padding: 25,
    borderRadius: 24,
    alignItems: "center",
    marginBottom: 20,
    elevation: 4,
  },
  balanceLabel: { color: "rgba(255,255,255,0.8)", fontSize: 16 },
  balanceValue: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "bold",
    marginTop: 5,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
  },
  statCard: {
    backgroundColor: "#fff",
    width: "48%",
    padding: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  statLabel: { fontSize: 14, color: "#64748b" },
  statValue: { fontSize: 18, fontWeight: "bold", marginTop: 5 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 15,
  },
  emptyText: { color: "#64748b", marginBottom: 20 },
  transactionCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  transIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  transDetails: { flex: 1 },
  transDesc: { fontSize: 15, fontWeight: "600", color: "#1e293b" },
  transDate: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  transValue: { fontSize: 15, fontWeight: "bold" },
});
