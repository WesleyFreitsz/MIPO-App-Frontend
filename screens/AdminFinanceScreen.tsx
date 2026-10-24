import React from "react";
import { RefreshControl, View } from "react-native";
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import {
  Card,
  Character,
  IconBox,
  LoadingState,
  MipoText,
  Screen,
  ScreenHeader,
  SectionHeader,
} from "../components/ui";
import { useTheme } from "../theme/ThemeProvider";

type TransactionType = "in" | "out";

interface FinanceSummary {
  totalIn?: number;
  totalOut?: number;
  balance?: number;
}

interface FinanceTransaction {
  id: string;
  type: TransactionType;
  description: string;
  value: number | string;
  createdAt?: string;
  date?: string;
}

interface StatCardProps {
  title: string;
  value: number;
  type: TransactionType;
}

const StatCard = ({ title, value, type }: StatCardProps) => (
  <Card style={{ flex: 1 }} contentStyle={{ gap: 6 }}>
    <IconBox icon={type === "in" ? TrendingUp : TrendingDown} tone={type === "in" ? "teal" : "red"} />
    <MipoText variant="caption">{title}</MipoText>
    <MipoText variant="cardTitle" color={type === "in" ? "text" : "red"} numberOfLines={1}>
      R$ {Number(value).toFixed(2)}
    </MipoText>
  </Card>
);

export default function AdminFinanceScreen() {
  const { colors } = useTheme();
  const {
    data: summary,
    isLoading: summaryLoading,
    refetch: refetchSummary,
  } = useQuery<FinanceSummary>({
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
  } = useQuery<FinanceTransaction[]>({
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
      <Screen>
        <ScreenHeader title="Financeiro" />
        <LoadingState />
      </Screen>
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
    <Screen
      scroll
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={onRefresh} colors={[colors.pink]} tintColor={colors.pink} />
      }
    >
      <ScreenHeader title="Financeiro" />

      <Card tone="lime" contentStyle={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16 }}>
        <View style={{ flex: 1 }}>
          <MipoText variant="label" color="onColor">
            Saldo em caixa
          </MipoText>
          <MipoText variant="hero" color="onColor" numberOfLines={1} adjustsFontSizeToFit>
            R$ {Number(balance).toFixed(2)}
          </MipoText>
        </View>
        <Character name="moeda3" size={72} motion="wiggle" />
      </Card>

      <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
        <StatCard title="Entradas" value={totalIn} type="in" />
        <StatCard title="Saídas" value={totalOut} type="out" />
      </View>

      <SectionHeader title="Transações recentes" />
      {transactions.length === 0 ? (
        <MipoText variant="caption">Nenhuma transação registrada.</MipoText>
      ) : (
        <View style={{ gap: 10 }}>
          {transactions.map((item) => (
            <Card key={item.id} contentStyle={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <IconBox icon={item.type === "in" ? ArrowUpRight : ArrowDownRight} tone={item.type === "in" ? "teal" : "red"} />
              <View style={{ flex: 1 }}>
                <MipoText variant="bodyBold" numberOfLines={2}>
                  {item.description}
                </MipoText>
                <MipoText variant="micro">{formatDate(item.createdAt || item.date || "")}</MipoText>
              </View>
              <MipoText variant="cardTitle" color={item.type === "in" ? "text" : "red"}>
                {item.type === "in" ? "+" : "-"} R$ {Number(item.value).toFixed(2)}
              </MipoText>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}
