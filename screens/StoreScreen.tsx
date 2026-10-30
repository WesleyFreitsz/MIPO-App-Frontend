import React, { useCallback, useState } from "react";
import { RefreshControl, View } from "react-native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import { useFocusEffect } from "@react-navigation/native";
import { Dice5, HelpCircle, UtensilsCrossed, X } from "lucide-react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { api } from "../services/api";
import { Button, Card, Chip, IconButton, MipoText, Screen, ScreenHeader, SectionHeader, showAlert } from "../components/ui";
import { PresentNowCard } from "./loja/PresentNowCard";
import { PlayCallsNowCard } from "./loja/PlayCallsNowCard";
import { HelpCallSheet } from "./loja/HelpCallSheet";
import { OpenTabSheet } from "./loja/OpenTabSheet";
import { haptic } from "../motion/haptics";
import { STORE_PRESENCE_KEY, useStorePresence } from "./loja/useStorePresence";
import { formatBRL, minutesAgo, MY_TAB_QUERY_KEY, Order, ORDER_STATUS_LABEL, ORDER_STATUS_TONE, TabWithOrders } from "./loja/lojaTypes";

interface StoreScreenProps {
  navigation: Pick<NavigationProp<ParamListBase>, "navigate">;
  inTab?: boolean;
}

const LIVE_REFRESH_MS = 15_000;

const isActive = (order: Order) => order.status === "PENDING" || order.status === "PREPARING";

type ApiError = AxiosError<{ message?: string }>;
const errorMessage = (error: ApiError) => error.response?.data?.message ?? "Tente novamente.";

export default function StoreScreen({ navigation, inTab = false }: StoreScreenProps) {
  const queryClient = useQueryClient();
  const presence = useStorePresence();
  const checkedIn = presence.data?.me.checkedIn ?? false;
  const [helpVisible, setHelpVisible] = useState(false);
  const [openTabVisible, setOpenTabVisible] = useState(false);

  const tabQuery = useQuery<TabWithOrders | null>({
    queryKey: MY_TAB_QUERY_KEY,
    queryFn: async () => (await api.get("/orders/tabs/mine")).data || null,
    refetchInterval: (query) => (query.state.data?.orders.some(isActive) ? LIVE_REFRESH_MS : false),
  });

  const { refetch } = tabQuery;
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const cancelMutation = useMutation({
    mutationFn: (orderId: string) => api.delete(`/orders/${orderId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MY_TAB_QUERY_KEY }),
    onError: (error: ApiError) => showAlert("Não foi possível cancelar", errorMessage(error)),
  });

  const helpMutation = useMutation({
    mutationFn: (data: { gameId?: string; note?: string }) =>
      api.post("/orders", { items: [{ kind: "HELP", gameId: data.gameId, quantity: 1, note: data.note }] }),
    onSuccess: () => {
      haptic.success();
      setHelpVisible(false);
      queryClient.invalidateQueries({ queryKey: MY_TAB_QUERY_KEY });
      showAlert("Monitor chamado!", "A equipe já recebeu o seu chamado.");
    },
    onError: (error: ApiError) => showAlert("Não foi possível chamar", errorMessage(error)),
  });

  const openTabMutation = useMutation({
    mutationFn: (data: { customerName: string; cardNumber: string }) => api.post("/orders/tabs", data),
    onSuccess: () => {
      setOpenTabVisible(false);
      queryClient.invalidateQueries({ queryKey: MY_TAB_QUERY_KEY });
      setHelpVisible(true);
    },
    onError: (error: ApiError) => showAlert("Não foi possível abrir a comanda", errorMessage(error)),
  });

  const callMonitor = () => {
    if (!checkedIn) return showAlert("Faça check-in primeiro", "Leia o QR code da loja para chamar um monitor.");
    if (tabQuery.data) setHelpVisible(true);
    else setOpenTabVisible(true);
  };

  const confirmCancel = (order: Order) =>
    showAlert("Cancelar pedido?", order.items.map((line) => `${line.quantity}x ${line.nameSnapshot}`).join(", "), [
      { text: "Manter", style: "cancel" },
      { text: "Cancelar pedido", style: "destructive", onPress: () => cancelMutation.mutate(order.id) },
    ]);

  const tab = tabQuery.data;

  return (
    <Screen
      scroll
      withTabBar={inTab}
      refreshControl={
        <RefreshControl
          refreshing={tabQuery.isRefetching}
          onRefresh={() => {
            tabQuery.refetch();
            queryClient.invalidateQueries({ queryKey: STORE_PRESENCE_KEY });
          }}
        />
      }
    >
      <ScreenHeader title="Na Mipo" subtitle={checkedIn ? "Você está na loja" : "Faça check-in para pedir"} />

      <PresentNowCard />

      <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
        <Button label="Ver cardápio" icon={UtensilsCrossed} onPress={() => navigation.navigate("Menu")} style={{ flex: 1 }} />
        <Button label="Pedir um jogo" icon={Dice5} variant="ghost" onPress={() => navigation.navigate("Menu", { tab: "GAME" })} style={{ flex: 1 }} />
      </View>
      <Button label="Chamar monitor" icon={HelpCircle} variant="ghost" block onPress={callMonitor} style={{ marginTop: 10 }} />

      <PlayCallsNowCard />

      <SectionHeader title="Minha comanda" />
      {tab ? (
        <Card contentStyle={{ gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <MipoText variant="cardTitle">{tab.customerName}</MipoText>
              <MipoText variant="caption">{`Cartão ${tab.cardNumber}`}</MipoText>
            </View>
            <Chip tone="dark" label={formatBRL(tab.total)} />
          </View>
          {tab.orders.length === 0 ? <MipoText variant="caption">Nenhum pedido ainda.</MipoText> : null}
          {tab.orders.map((order) => (
            <View key={order.id} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <MipoText variant="bodyBold" numberOfLines={2}>
                  {order.items.map((line) => `${line.quantity}x ${line.nameSnapshot}`).join(", ")}
                </MipoText>
                <MipoText variant="caption">
                  {order.canceledReason && order.status === "CANCELED" ? order.canceledReason : minutesAgo(order.createdAt)}
                </MipoText>
              </View>
              <Chip tone={ORDER_STATUS_TONE[order.status]} label={ORDER_STATUS_LABEL[order.status]} />
              {order.status === "PENDING" ? (
                <IconButton icon={X} accessibilityLabel="Cancelar pedido" onPress={() => confirmCancel(order)} />
              ) : null}
            </View>
          ))}
          <MipoText variant="caption">O valor é estimado. A cobrança é feita no caixa ao fechar a comanda.</MipoText>
        </Card>
      ) : (
        <Card>
          <MipoText variant="caption">
            {checkedIn
              ? "Você ainda não abriu uma comanda. Escolha algo no cardápio e informe o número do seu cartão."
              : "Leia o QR code da loja para fazer check-in e poder pedir."}
          </MipoText>
        </Card>
      )}

      <HelpCallSheet
        visible={helpVisible}
        loading={helpMutation.isPending}
        tab={tabQuery.data}
        onClose={() => setHelpVisible(false)}
        onSubmit={(data) => helpMutation.mutate(data)}
      />
      <OpenTabSheet
        visible={openTabVisible}
        loading={openTabMutation.isPending}
        submitLabel="Abrir comanda e chamar monitor"
        onClose={() => setOpenTabVisible(false)}
        onSubmit={(data) => openTabMutation.mutate(data)}
      />
    </Screen>
  );
}
