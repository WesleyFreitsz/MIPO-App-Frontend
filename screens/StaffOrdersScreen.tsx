import React, { useEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl, useWindowDimensions, View } from "react-native";
import { Check, ChefHat, HelpCircle, Trash2, Wifi, WifiOff } from "lucide-react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import { useKeepAwake } from "expo-keep-awake";
import { api } from "../services/api";
import {
  BottomSheet,
  Button,
  Card,
  Chip,
  EmptyState,
  Input,
  LoadingState,
  MipoText,
  Screen,
  ScreenHeader,
  SegmentedControl,
  showAlert,
  useBottomReserve,
} from "../components/ui";
import { haptic } from "../motion/haptics";
import { useStaffSocket } from "./loja/useStaffSocket";
import {
  formatBRL,
  minutesAgo,
  Order,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_TONE,
  OrderStatus,
  TabWithOrders,
} from "./loja/lojaTypes";

type StaffTab = "new" | "preparing" | "done" | "people";

const FEED_KEY = ["orders", "staff", "feed"] as const;
const TODAY_KEY = ["orders", "staff", "today"] as const;
const CLOCK_TICK_MS = 30_000;
const orderBell = require("../assets/sounds/order-bell.wav");
const helpBell = require("../assets/sounds/help-bell.wav");

const isHelpCall = (order: Order) => order.items.every((line) => line.kind === "HELP");

const TAB_STATUSES: Record<Exclude<StaffTab, "people">, OrderStatus[]> = {
  new: ["PENDING"],
  preparing: ["PREPARING"],
  done: ["DONE", "CANCELED"],
};

function upsertOrder(list: Order[] | undefined, order: Order) {
  if (!list) return [order];
  const exists = list.some((o) => o.id === order.id);
  return exists ? list.map((o) => (o.id === order.id ? order : o)) : [order, ...list];
}

export default function StaffOrdersScreen() {
  useKeepAwake();
  const queryClient = useQueryClient();
  const bottomReserve = useBottomReserve(false);
  const { width } = useWindowDimensions();
  const player = useAudioPlayer(orderBell);
  const helpPlayer = useAudioPlayer(helpBell);
  const [activeTab, setActiveTab] = useState<StaffTab>("new");
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
    const timer = setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const feedQuery = useQuery<Order[]>({
    queryKey: FEED_KEY,
    queryFn: async () => (await api.get("/orders/staff/feed")).data,
    staleTime: 0,
  });

  const todayQuery = useQuery<TabWithOrders[]>({
    queryKey: TODAY_KEY,
    queryFn: async () => (await api.get("/orders/staff/today")).data,
    enabled: activeTab === "people",
    staleTime: 0,
  });

  const connected = useStaffSocket({
    onNewOrder: (order) => {
      queryClient.setQueryData<Order[]>(FEED_KEY, (old) => upsertOrder(old, order));
      queryClient.invalidateQueries({ queryKey: TODAY_KEY });
      const bell = isHelpCall(order) ? helpPlayer : player;
      bell.seekTo(0).then(() => bell.play()).catch(() => undefined);
      haptic.warning();
    },
    onOrderUpdated: (order) => {
      queryClient.setQueryData<Order[]>(FEED_KEY, (old) => upsertOrder(old, order));
      queryClient.invalidateQueries({ queryKey: TODAY_KEY });
    },
    onTabClosed: () => queryClient.invalidateQueries({ queryKey: TODAY_KEY }),
  });

  useEffect(() => {
    if (connected) queryClient.invalidateQueries({ queryKey: FEED_KEY });
  }, [connected, queryClient]);

  const statusMutation = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: OrderStatus; reason?: string }) =>
      api.patch<Order>(`/orders/${id}/status`, { status, reason }).then((res) => res.data),
    onSuccess: (order) => {
      queryClient.setQueryData<Order[]>(FEED_KEY, (old) => upsertOrder(old, order));
      queryClient.invalidateQueries({ queryKey: TODAY_KEY });
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      queryClient.invalidateQueries({ queryKey: FEED_KEY });
      showAlert("Não foi possível atualizar", error.response?.data?.message ?? "Tente novamente.");
    },
  });

  const closeTabMutation = useMutation({
    mutationFn: (tabId: string) => api.patch(`/orders/tabs/${tabId}/close`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TODAY_KEY }),
    onError: () => showAlert("Erro", "Não foi possível fechar a comanda."),
  });

  const orders = feedQuery.data ?? [];
  const counts = useMemo(
    () => ({
      new: orders.filter((o) => o.status === "PENDING").length,
      preparing: orders.filter((o) => o.status === "PREPARING").length,
    }),
    [orders],
  );
  const visibleOrders = activeTab === "people" ? [] : orders.filter((o) => TAB_STATUSES[activeTab].includes(o.status));
  const columns = width >= 900 ? 3 : width >= 600 ? 2 : 1;

  const confirmCancel = () => {
    if (!cancelTarget || cancelReason.trim().length < 2) return showAlert("Atenção", "Informe o motivo.");
    statusMutation.mutate({ id: cancelTarget.id, status: "CANCELED", reason: cancelReason.trim() });
    setCancelTarget(null);
  };

  const confirmCloseTab = (tab: TabWithOrders) =>
    showAlert("Fechar comanda", `Fechar a comanda de ${tab.customerName} (cartão ${tab.cardNumber}) e fazer o check-out?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Fechar", onPress: () => closeTabMutation.mutate(tab.id) },
    ]);

  const renderOrder = ({ item }: { item: Order }) => {
    const pendingAction = statusMutation.isPending && statusMutation.variables?.id === item.id;
    const active = item.status === "PENDING" || item.status === "PREPARING";
    const help = isHelpCall(item);
    return (
      <Card tone={help && active ? "lilac" : "neutral"} style={{ flex: 1 / columns }} contentStyle={{ gap: 8 }}>
        {help ? <Chip tone="lilac" icon={HelpCircle} label="Ajuda com jogo" /> : null}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <MipoText variant="cardTitle" numberOfLines={1}>
              {item.tab?.customerName ?? "Cliente"}
            </MipoText>
            <MipoText variant="caption">
              {[`Cartão ${item.tab?.cardNumber ?? "?"}`, item.tableLabel ? `Mesa ${item.tableLabel}` : null, minutesAgo(item.createdAt, now)]
                .filter(Boolean)
                .join(" · ")}
            </MipoText>
          </View>
          <Chip tone={ORDER_STATUS_TONE[item.status]} label={ORDER_STATUS_LABEL[item.status]} />
        </View>
        {item.items.map((line) => (
          <MipoText key={line.id} variant="bodyBold">
            {`${line.quantity}x ${line.nameSnapshot}${line.kind === "GAME" ? " (jogo)" : ""}`}
            {line.note ? <MipoText variant="caption">{`  — ${line.note}`}</MipoText> : null}
          </MipoText>
        ))}
        {item.note ? <MipoText variant="caption">{`Obs.: ${item.note}`}</MipoText> : null}
        {item.canceledReason ? <MipoText variant="caption">{`Motivo: ${item.canceledReason}`}</MipoText> : null}
        {active ? (
          <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
            {item.status === "PENDING" ? (
              <Button
                label={help ? "Atender" : "Preparar"}
                icon={ChefHat}
                size="sm"
                variant="ghost"
                disabled={pendingAction}
                onPress={() => statusMutation.mutate({ id: item.id, status: "PREPARING" })}
                style={{ flex: 1 }}
              />
            ) : null}
            <Button
              label="Finalizar"
              icon={Check}
              size="sm"
              variant="lime"
              loading={pendingAction}
              onPress={() => statusMutation.mutate({ id: item.id, status: "DONE" })}
              style={{ flex: 1 }}
            />
            <Button
              label="Excluir"
              icon={Trash2}
              size="sm"
              variant="red"
              accessibilityLabel={`Excluir pedido de ${item.tab?.customerName ?? "cliente"}`}
              disabled={pendingAction}
              onPress={() => {
                setCancelReason("");
                setCancelTarget(item);
              }}
              style={{ flex: 1 }}
            />
          </View>
        ) : null}
      </Card>
    );
  };

  const renderTab = ({ item }: { item: TabWithOrders }) => (
    <Card contentStyle={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <MipoText variant="cardTitle" numberOfLines={1}>
            {item.customerName}
          </MipoText>
          <MipoText variant="caption">{`Cartão ${item.cardNumber} · ${item.orders.length} pedido(s)`}</MipoText>
        </View>
        <Chip tone={item.status === "OPEN" ? "teal" : "neutral"} label={item.status === "OPEN" ? "Aberta" : "Fechada"} />
      </View>
      {item.orders.map((order) => (
        <View key={order.id} style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
          <MipoText variant="caption" style={{ flex: 1 }}>
            {order.items.map((line) => `${line.quantity}x ${line.nameSnapshot}`).join(", ")}
          </MipoText>
          <MipoText variant="caption">{ORDER_STATUS_LABEL[order.status]}</MipoText>
        </View>
      ))}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
        <MipoText variant="bodyBold" style={{ flex: 1 }}>
          {`Total estimado: ${formatBRL(item.total)}`}
        </MipoText>
        {item.status === "OPEN" ? (
          <Button
            label="Fechar comanda"
            size="sm"
            variant="red"
            loading={closeTabMutation.isPending && closeTabMutation.variables === item.id}
            onPress={() => confirmCloseTab(item)}
          />
        ) : null}
      </View>
    </Card>
  );

  const listStyle = {
    style: { marginHorizontal: -14 },
    contentContainerStyle: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: bottomReserve, gap: 12 },
    showsVerticalScrollIndicator: false,
  };

  return (
    <Screen>
      <ScreenHeader
        title="Pedidos"
        right={<Chip tone={connected ? "lime" : "red"} icon={connected ? Wifi : WifiOff} label={connected ? "Ao vivo" : "Reconectando"} />}
      />
      <SegmentedControl<StaffTab>
        options={[
          { value: "new", label: `Novos (${counts.new})` },
          { value: "preparing", label: `Preparo (${counts.preparing})` },
          { value: "done", label: "Finalizados" },
          { value: "people", label: "Hoje" },
        ]}
        value={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === "people" ? (
        todayQuery.isLoading ? (
          <LoadingState />
        ) : (
          <FlatList
            {...listStyle}
            data={todayQuery.data ?? []}
            keyExtractor={(item) => item.id}
            renderItem={renderTab}
            refreshControl={<RefreshControl refreshing={todayQuery.isRefetching} onRefresh={() => void todayQuery.refetch()} />}
            ListEmptyComponent={<EmptyState character="peao2" title="Nenhuma comanda hoje" />}
          />
        )
      ) : feedQuery.isLoading ? (
        <LoadingState />
      ) : (
        <FlatList
          {...listStyle}
          key={`cols-${columns}`}
          numColumns={columns}
          columnWrapperStyle={columns > 1 ? { gap: 12 } : undefined}
          data={visibleOrders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrder}
          refreshControl={<RefreshControl refreshing={feedQuery.isRefetching} onRefresh={() => void feedQuery.refetch()} />}
          ListEmptyComponent={<EmptyState character="peao2" title={activeTab === "new" ? "Nenhum pedido novo" : "Nada por aqui"} />}
        />
      )}

      <BottomSheet visible={cancelTarget !== null} onClose={() => setCancelTarget(null)}>
        <MipoText variant="section">Excluir pedido</MipoText>
        <Input
          placeholder="Motivo (ex.: acabou o item)"
          value={cancelReason}
          onChangeText={setCancelReason}
          containerStyle={{ marginTop: 12 }}
        />
        <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
          <Button label="Voltar" variant="ghost" onPress={() => setCancelTarget(null)} style={{ flex: 1 }} />
          <Button label="Excluir pedido" variant="red" onPress={confirmCancel} style={{ flex: 1 }} />
        </View>
      </BottomSheet>
    </Screen>
  );
}
