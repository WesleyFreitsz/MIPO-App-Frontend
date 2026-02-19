import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  SafeAreaView,
} from "react-native";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react-native";

const mockTransactions = [
  {
    id: "1",
    description: "Inscrição Torneio Catan",
    value: 150.0,
    type: "in",
    date: "16 Fev",
  },
  {
    id: "2",
    description: "Compra Lote Magic",
    value: 450.0,
    type: "out",
    date: "15 Fev",
  },
  {
    id: "3",
    description: "Aluguel Sala Pequena - João",
    value: 45.0,
    type: "in",
    date: "15 Fev",
  },
  {
    id: "4",
    description: "Venda Jogo de Tabuleiro (Catan)",
    value: 299.9,
    type: "in",
    date: "14 Fev",
  },
];

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
      R$ {value.toFixed(2)}
    </Text>
  </View>
);

export default function AdminFinanceScreen() {
  const totalIn = mockTransactions
    .filter((t) => t.type === "in")
    .reduce((acc, curr) => acc + curr.value, 0);
  const totalOut = mockTransactions
    .filter((t) => t.type === "out")
    .reduce((acc, curr) => acc + curr.value, 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Resumo Financeiro 📊</Text>

        <View style={styles.mainBalance}>
          <Text style={styles.balanceLabel}>Saldo em Caixa</Text>
          <Text style={styles.balanceValue}>
            R$ {(totalIn - totalOut).toFixed(2)}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <StatCard title="Entradas" value={totalIn} type="in" />
          <StatCard title="Saídas" value={totalOut} type="out" />
        </View>

        <Text style={styles.sectionTitle}>Transações Recentes</Text>
        {mockTransactions.map((item) => (
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
              <Text style={styles.transDate}>{item.date}</Text>
            </View>
            <Text
              style={[
                styles.transValue,
                { color: item.type === "in" ? "#166534" : "#991b1b" },
              ]}
            >
              {item.type === "in" ? "+" : "-"} R$ {item.value.toFixed(2)}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
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
