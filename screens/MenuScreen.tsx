import React, { useMemo, useState } from "react";
import { FlatList, Image, RefreshControl, View } from "react-native";
import type { NavigationProp, ParamListBase, RouteProp } from "@react-navigation/native";
import { Dice5, Plus, ShoppingBag, Star } from "lucide-react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { api } from "../services/api";
import {
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingState,
  MipoText,
  Screen,
  ScreenHeader,
  SegmentedControl,
  showAlert,
  useBottomReserve,
} from "../components/ui";
import { haptic } from "../motion/haptics";
import { CartSheet } from "./loja/CartSheet";
import { OpenTabSheet } from "./loja/OpenTabSheet";
import {
  CartLine,
  formatBRL,
  MENU_CATEGORY_LABEL,
  MENU_QUERY_KEY,
  MenuCategory,
  MenuItem,
  MY_TAB_QUERY_KEY,
  OrderItemKind,
  TabWithOrders,
} from "./loja/lojaTypes";

type MenuTab = MenuCategory | "GAME";

interface Game {
  id: string;
  name: string;
  imageUrl?: string | null;
  category?: string | null;
}

interface MenuScreenProps {
  navigation: Pick<NavigationProp<ParamListBase>, "navigate" | "goBack">;
  route: RouteProp<ParamListBase, string> & { params?: { tab?: MenuTab } };
}

const TAB_ORDER: MenuTab[] = ["FOOD", "DRINK", "DESSERT", "OTHER", "GAME"];

type ApiError = AxiosError<{ message?: string }>;

export default function MenuScreen({ navigation, route }: MenuScreenProps) {
  const queryClient = useQueryClient();
  const bottomReserve = useBottomReserve(false);
  const [activeTab, setActiveTab] = useState<MenuTab>(route.params?.tab ?? "FOOD");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartVisible, setCartVisible] = useState(false);
  const [openTabVisible, setOpenTabVisible] = useState(false);
  const [tableLabel, setTableLabel] = useState("");
  const [note, setNote] = useState("");

  const menuQuery = useQuery<MenuItem[]>({
    queryKey: MENU_QUERY_KEY,
    queryFn: async () => (await api.get("/menu")).data,
  });

  const gamesQuery = useQuery<Game[]>({
    queryKey: ["games", "", "all", ""],
    queryFn: async () => (await api.get("/games")).data,
    enabled: activeTab === "GAME",
  });

  const tabQuery = useQuery<TabWithOrders | null>({
    queryKey: MY_TAB_QUERY_KEY,
    queryFn: async () => (await api.get("/orders/tabs/mine")).data || null,
  });

  const presentCategories = useMemo(() => {
    const categories = new Set((menuQuery.data ?? []).map((item) => item.category));
    return TAB_ORDER.filter((tab) => tab === "GAME" || categories.has(tab));
  }, [menuQuery.data]);

  const showError = (title: string, error: ApiError) => {
    const message = error.response?.data?.message ?? "Tente novamente.";
    if (message.includes("check-in")) {
      showAlert("Faça check-in primeiro", "Os pedidos são para quem está na Mipo. Leia o QR code da loja para entrar.", [
        { text: "Agora não", style: "cancel" },
        { text: "Ir para Na Mipo", onPress: () => navigation.navigate("Store") },
      ]);
      return;
    }
    showAlert(title, message);
  };

  const orderMutation = useMutation({
    mutationFn: () =>
      api.post("/orders", {
        items: cart.map((line) => ({
          kind: line.kind,
          menuItemId: line.kind === "MENU" ? line.refId : undefined,
          gameId: line.kind === "GAME" ? line.refId : undefined,
          quantity: line.quantity,
        })),
        tableLabel: tableLabel.trim() || undefined,
        note: note.trim() || undefined,
      }),
    onSuccess: () => {
      haptic.success();
      setCart([]);
      setNote("");
      setCartVisible(false);
      queryClient.invalidateQueries({ queryKey: MY_TAB_QUERY_KEY });
      showAlert("Pedido enviado!", "A equipe já recebeu. Acompanhe o status em Na Mipo.", [
        { text: "Continuar no cardápio", style: "cancel" },
        { text: "Ver meus pedidos", onPress: () => navigation.navigate("Store") },
      ]);
    },
    onError: (error: ApiError) => showError("Não foi possível enviar", error),
  });

  const openTabMutation = useMutation({
    mutationFn: (data: { customerName: string; cardNumber: string }) => api.post("/orders/tabs", data),
    onSuccess: () => {
      setOpenTabVisible(false);
      queryClient.invalidateQueries({ queryKey: MY_TAB_QUERY_KEY });
      orderMutation.mutate();
    },
    onError: (error: ApiError) => showError("Não foi possível abrir a comanda", error),
  });

  const addToCart = (kind: OrderItemKind, refId: string, name: string, unitPrice: number) => {
    haptic.tap();
    setCart((prev) => {
      const key = `${kind}:${refId}`;
      const existing = prev.find((line) => line.key === key);
      if (existing) return prev.map((line) => (line.key === key ? { ...line, quantity: line.quantity + 1 } : line));
      return [...prev, { key, kind, refId, name, unitPrice, quantity: 1 }];
    });
  };

  const changeQuantity = (key: string, delta: number) =>
    setCart((prev) =>
      prev.map((line) => (line.key === key ? { ...line, quantity: line.quantity + delta } : line)).filter((line) => line.quantity > 0),
    );

  const submit = () => {
    if (tabQuery.data) orderMutation.mutate();
    else {
      setCartVisible(false);
      setOpenTabVisible(true);
    }
  };

  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const cartTotal = cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const menuItems = (menuQuery.data ?? []).filter((item) => item.category === activeTab);

  const renderMenuItem = ({ item }: { item: MenuItem }) => (
    <Card contentStyle={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={{ width: 64, height: 64, borderRadius: 12 }} accessibilityIgnoresInvertColors /> : null}
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <MipoText variant="cardTitle" numberOfLines={1} style={{ flexShrink: 1 }}>
            {item.name}
          </MipoText>
          {item.dailySpecial ? <Chip tone="yellow" icon={Star} label="Do dia" /> : null}
        </View>
        {item.description ? (
          <MipoText variant="caption" numberOfLines={2}>
            {item.description}
          </MipoText>
        ) : null}
        <MipoText variant="bodyBold">{formatBRL(item.price)}</MipoText>
      </View>
      <IconButton icon={Plus} tone="lime" accessibilityLabel={`Adicionar ${item.name}`} onPress={() => addToCart("MENU", item.id, item.name, item.price)} />
    </Card>
  );

  const renderGame = ({ item }: { item: Game }) => (
    <Card contentStyle={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={{ width: 56, height: 56, borderRadius: 12 }} accessibilityIgnoresInvertColors /> : null}
      <View style={{ flex: 1 }}>
        <MipoText variant="cardTitle" numberOfLines={1}>
          {item.name}
        </MipoText>
        <MipoText variant="caption">Levamos à sua mesa</MipoText>
      </View>
      <IconButton icon={Plus} tone="lime" accessibilityLabel={`Pedir ${item.name}`} onPress={() => addToCart("GAME", item.id, item.name, 0)} />
    </Card>
  );

  const listProps = {
    showsVerticalScrollIndicator: false,
    style: { marginHorizontal: -14 },
    contentContainerStyle: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: bottomReserve + (cartCount ? 72 : 0), gap: 12 },
  };

  const activeQuery = activeTab === "GAME" ? gamesQuery : menuQuery;

  return (
    <Screen>
      <ScreenHeader
        title="Cardápio"
        subtitle={tabQuery.data ? `Comanda · cartão ${tabQuery.data.cardNumber}` : "Preço informativo; pague no caixa"}
      />
      <SegmentedControl<MenuTab>
        options={presentCategories.map((tab) => ({ value: tab, label: tab === "GAME" ? "Jogos" : MENU_CATEGORY_LABEL[tab] }))}
        value={activeTab}
        onChange={setActiveTab}
      />

      {activeQuery.isLoading ? (
        <LoadingState />
      ) : activeQuery.isError ? (
        <ErrorState onRetry={() => activeQuery.refetch()} />
      ) : activeTab === "GAME" ? (
        <FlatList
          {...listProps}
          data={gamesQuery.data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderGame}
          refreshControl={<RefreshControl refreshing={gamesQuery.isRefetching} onRefresh={() => void gamesQuery.refetch()} />}
          ListEmptyComponent={<EmptyState character="peao2" title="Nenhum jogo no acervo" />}
        />
      ) : (
        <FlatList
          {...listProps}
          data={menuItems}
          keyExtractor={(item) => item.id}
          renderItem={renderMenuItem}
          refreshControl={<RefreshControl refreshing={menuQuery.isRefetching} onRefresh={() => void menuQuery.refetch()} />}
          ListEmptyComponent={<EmptyState character="peao2" title="Nada nessa categoria por enquanto" />}
        />
      )}

      {cartCount > 0 ? (
        <View style={{ position: "absolute", left: 14, right: 14, bottom: bottomReserve + 8 }}>
          <Button
            label={`Ver pedido (${cartCount}) · ${formatBRL(cartTotal)}`}
            icon={activeTab === "GAME" ? Dice5 : ShoppingBag}
            block
            onPress={() => setCartVisible(true)}
          />
        </View>
      ) : null}

      <CartSheet
        visible={cartVisible}
        lines={cart}
        tableLabel={tableLabel}
        note={note}
        sending={orderMutation.isPending}
        onClose={() => setCartVisible(false)}
        onChangeQuantity={changeQuantity}
        onChangeTableLabel={setTableLabel}
        onChangeNote={setNote}
        onSubmit={submit}
      />
      <OpenTabSheet
        visible={openTabVisible}
        loading={openTabMutation.isPending || orderMutation.isPending}
        onClose={() => setOpenTabVisible(false)}
        onSubmit={(data) => openTabMutation.mutate(data)}
      />
    </Screen>
  );
}
