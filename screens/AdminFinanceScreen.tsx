import React, { useState } from "react";
import { RefreshControl, Share, View } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Plus } from "lucide-react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import {
  BottomSheet,
  Button,
  Card,
  Character,
  Fab,
  FieldLabel,
  IconBox,
  Input,
  LoadingState,
  MipoText,
  Screen,
  ScreenHeader,
  SectionHeader,
  SegmentedControl,
  showAlert,
} from "../components/ui";
import { useTheme } from "../theme/ThemeProvider";

type TransactionType = "in" | "out";
type FinancePeriod = "month" | "quarter" | "year" | "all";

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

interface MonthlyTotal {
  month: string;
  totalIn: number;
  totalOut: number;
}

interface TransactionForm {
  id?: string;
  description: string;
  value: string;
  type: TransactionType;
}

interface StatCardProps {
  title: string;
  value: number;
  type: TransactionType;
}

const periodOptions: { value: FinancePeriod; label: string }[] = [
  { value: "month", label: "Mês" },
  { value: "quarter", label: "3 meses" },
  { value: "year", label: "Ano" },
  { value: "all", label: "Tudo" },
];

const monthNames = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function periodRange(period: FinancePeriod, now: Date = new Date()): { from?: string } {
  if (period === "all") return {};
  if (period === "year") return { from: new Date(now.getFullYear(), 0, 1).toISOString() };
  const monthsBack = period === "quarter" ? 2 : 0;
  return { from: new Date(now.getFullYear(), now.getMonth() - monthsBack, 1).toISOString() };
}

const emptyForm: TransactionForm = { description: "", value: "", type: "in" };

const StatCard = ({ title, value, type }: StatCardProps) => (
  <Card style={{ flex: 1 }} contentStyle={{ gap: 6 }}>
    <IconBox icon={type === "in" ? TrendingUp : TrendingDown} tone={type === "in" ? "teal" : "red"} />
    <MipoText variant="caption">{title}</MipoText>
    <MipoText variant="cardTitle" color={type === "in" ? "text" : "red"} numberOfLines={1}>
      R$ {Number(value).toFixed(2)}
    </MipoText>
  </Card>
);

function MonthlyChart({ months }: { months: MonthlyTotal[] }) {
  const { colors } = useTheme();
  const max = Math.max(1, ...months.flatMap((m) => [m.totalIn, m.totalOut]));
  const groupWidth = 30;
  const height = 100;
  const summary = months
    .map((m) => `${m.month}: entradas R$ ${m.totalIn.toFixed(2)}, saídas R$ ${m.totalOut.toFixed(2)}`)
    .join("; ");

  return (
    <Card>
      <View accessible accessibilityLabel={`Gráfico mensal. ${summary}`}>
      <Svg width="100%" height={120} viewBox={`0 0 ${months.length * groupWidth} ${height}`} preserveAspectRatio="none">
        {months.map((m, i) => {
          const inHeight = (m.totalIn / max) * height;
          const outHeight = (m.totalOut / max) * height;
          return (
            <React.Fragment key={m.month}>
              <Rect x={i * groupWidth + 4} y={height - inHeight} width={10} height={inHeight} fill={colors.teal} rx={2} />
              <Rect x={i * groupWidth + 16} y={height - outHeight} width={10} height={outHeight} fill={colors.red} rx={2} />
            </React.Fragment>
          );
        })}
      </Svg>
      <View style={{ flexDirection: "row", marginTop: 6 }}>
        {months.map((m) => (
          <MipoText key={m.month} variant="micro" style={{ flex: 1, textAlign: "center" }}>
            {`${monthNames[Number(m.month.slice(5, 7)) - 1]}/${m.month.slice(2, 4)}`}
          </MipoText>
        ))}
      </View>
      </View>
    </Card>
  );
}

export default function AdminFinanceScreen() {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<FinancePeriod>("month");
  const [form, setForm] = useState<TransactionForm | null>(null);
  const params = periodRange(period);

  const {
    data: summary,
    isLoading: summaryLoading,
    refetch: refetchSummary,
  } = useQuery<FinanceSummary>({
    queryKey: ["finance", "summary", period],
    queryFn: async () => (await api.get("/finance/summary", { params })).data,
  });

  const { data: monthly = [], refetch: refetchMonthly } = useQuery<MonthlyTotal[]>({
    queryKey: ["finance", "monthly", period],
    queryFn: async () => (await api.get("/finance/monthly", { params })).data,
  });

  const {
    data: transactions = [],
    isLoading: transactionsLoading,
    refetch: refetchTransactions,
  } = useQuery<FinanceTransaction[]>({
    queryKey: ["finance", "transactions", period],
    queryFn: async () => {
      const res = await api.get("/finance/transactions", {
        params: { skip: 0, take: 100, ...params },
      });
      return Array.isArray(res.data) ? res.data : res.data?.data || [];
    },
  });

  const invalidateFinance = () => queryClient.invalidateQueries({ queryKey: ["finance"] });

  const saveMutation = useMutation({
    mutationFn: ({ id, description, value, type }: TransactionForm) => {
      const payload = { description: description.trim(), value: Number(value.replace(",", ".")), type };
      return id ? api.patch(`/finance/transactions/${id}`, payload) : api.post("/finance/transactions", payload);
    },
    onSuccess: () => {
      setForm(null);
      invalidateFinance();
    },
    onError: () => showAlert("Erro", "Não foi possível salvar a transação."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/finance/transactions/${id}`),
    onSuccess: () => {
      setForm(null);
      invalidateFinance();
    },
    onError: () => showAlert("Erro", "Não foi possível apagar a transação."),
  });

  const exportMutation = useMutation({
    mutationFn: async () => (await api.get<{ csv: string }>("/finance/export", { params })).data.csv,
    onSuccess: (csv) => Share.share({ title: "Financeiro Mipo", message: csv }),
    onError: () => showAlert("Erro", "Não foi possível exportar."),
  });

  const onRefresh = () => {
    refetchSummary();
    refetchMonthly();
    refetchTransactions();
  };

  const handleSave = () => {
    if (!form) return;
    const value = Number(form.value.replace(",", "."));
    if (!form.description.trim() || !Number.isFinite(value) || value <= 0) {
      return showAlert("Atenção", "Informe descrição e um valor maior que zero.");
    }
    saveMutation.mutate(form);
  };

  const confirmDelete = (id: string) =>
    showAlert("Apagar transação", "Essa ação não pode ser desfeita.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Apagar", style: "destructive", onPress: () => deleteMutation.mutate(id) },
    ]);

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
    <View style={{ flex: 1 }}>
      <Screen
        scroll
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} colors={[colors.pink]} tintColor={colors.pink} />
        }
      >
        <ScreenHeader title="Financeiro" />

        <SegmentedControl<FinancePeriod> options={periodOptions} value={period} onChange={setPeriod} />

        <Card tone="lime" style={{ marginTop: 14 }} contentStyle={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16 }}>
          <View style={{ flex: 1 }}>
            <MipoText variant="label" color="onColor">
              Saldo do período
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

        {monthly.length > 0 ? (
          <>
            <SectionHeader title="Entradas x saídas por mês" />
            <MonthlyChart months={monthly} />
          </>
        ) : null}

        <SectionHeader
          title="Transações"
          action={{ label: "Exportar CSV", accessibilityLabel: "Exportar transações em CSV", onPress: () => exportMutation.mutate() }}
        />
        {transactions.length === 0 ? (
          <MipoText variant="caption">Nenhuma transação no período.</MipoText>
        ) : (
          <View style={{ gap: 10, paddingBottom: 90 }}>
            {transactions.map((item) => (
              <Card
                key={item.id}
                onPress={() => setForm({ id: item.id, description: item.description, value: String(item.value), type: item.type })}
                accessibilityLabel={`Editar ${item.description}`}
                contentStyle={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
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

      <Fab icon={Plus} accessibilityLabel="Nova transação" onPress={() => setForm(emptyForm)} />

      <BottomSheet visible={form !== null} onClose={() => setForm(null)}>
        <MipoText variant="section">{form?.id ? "Editar transação" : "Nova transação"}</MipoText>
        <FieldLabel>Tipo</FieldLabel>
        <SegmentedControl<TransactionType>
          options={[
            { value: "in", label: "Entrada" },
            { value: "out", label: "Saída" },
          ]}
          value={form?.type ?? "in"}
          onChange={(type) => setForm((current) => (current ? { ...current, type } : current))}
        />
        <FieldLabel>Descrição</FieldLabel>
        <Input
          value={form?.description ?? ""}
          onChangeText={(description) => setForm((current) => (current ? { ...current, description } : current))}
          placeholder="Ex: Venda de bebidas"
        />
        <FieldLabel>Valor (R$)</FieldLabel>
        <Input
          value={form?.value ?? ""}
          onChangeText={(value) => setForm((current) => (current ? { ...current, value } : current))}
          placeholder="0,00"
          keyboardType="decimal-pad"
        />
        <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
          {form?.id ? (
            <Button
              label="Apagar"
              variant="ghost"
              loading={deleteMutation.isPending}
              onPress={() => form.id && confirmDelete(form.id)}
              style={{ flex: 1 }}
            />
          ) : null}
          <Button label="Salvar" variant="red" loading={saveMutation.isPending} onPress={handleSave} style={{ flex: 1 }} />
        </View>
      </BottomSheet>
    </View>
  );
}
