import React, { useEffect, useState } from "react";
import { View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { BottomSheet, Button, FieldLabel, Input, MipoText, showAlert } from "./ui";
import { haptic } from "../motion/haptics";
import { StarRating } from "../screens/loja/StarRating";
import { PENDING_REVIEW_KEY, PendingReview } from "../screens/loja/reviewTypes";

const DISMISSED_VISIT_KEY = "mipo.reviews.dismissedVisit";

export function PendingReviewPrompt() {
  const queryClient = useQueryClient();
  const [dismissedVisitId, setDismissedVisitId] = useState<string | null | undefined>(undefined);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [orderRatings, setOrderRatings] = useState<Record<string, number>>({});

  useEffect(() => {
    AsyncStorage.getItem(DISMISSED_VISIT_KEY)
      .then(setDismissedVisitId)
      .catch(() => setDismissedVisitId(null));
  }, []);

  const pendingQuery = useQuery<PendingReview | null>({
    queryKey: PENDING_REVIEW_KEY,
    queryFn: async () => (await api.get<PendingReview | null>("/reviews/pending")).data || null,
    staleTime: 0,
    enabled: dismissedVisitId !== undefined,
  });
  const pending = pendingQuery.data;
  const visible = Boolean(pending && pending.visit.id !== dismissedVisitId);

  const dismiss = () => {
    if (!pending) return;
    setDismissedVisitId(pending.visit.id);
    AsyncStorage.setItem(DISMISSED_VISIT_KEY, pending.visit.id).catch(() => undefined);
  };

  const submitMutation = useMutation({
    mutationFn: async (review: PendingReview) => {
      await api.post(`/reviews/visits/${review.visit.id}`, { rating, comment: comment.trim() || undefined });
      await Promise.all(
        Object.entries(orderRatings).map(([orderId, orderRating]) =>
          api.post(`/reviews/orders/${orderId}`, { rating: orderRating }).catch(() => undefined),
        ),
      );
    },
    onSuccess: () => {
      haptic.success();
      setRating(0);
      setComment("");
      setOrderRatings({});
      queryClient.setQueryData(PENDING_REVIEW_KEY, null);
      showAlert("Valeu pela avaliação!", "Isso ajuda a Mipo a melhorar cada visita.");
    },
    onError: () => showAlert("Não foi possível enviar", "Tente de novo daqui a pouco."),
  });

  if (!pending) return null;

  return (
    <BottomSheet visible={visible} onClose={dismiss}>
      <MipoText variant="section">Como foi sua visita?</MipoText>
      <MipoText variant="caption" style={{ marginTop: 4 }}>
        Sua nota vai só para a equipe da Mipo.
      </MipoText>
      <View style={{ alignItems: "center", marginTop: 14 }}>
        <StarRating value={rating} onChange={setRating} label="Nota da visita" />
      </View>
      <View style={{ marginTop: 14 }}>
        <FieldLabel>Quer contar mais? (opcional)</FieldLabel>
        <Input value={comment} onChangeText={setComment} placeholder="O que foi bom, o que dá para melhorar" maxLength={1000} multiline />
      </View>
      {pending.orders.length > 0 ? (
        <View style={{ marginTop: 14, gap: 10 }}>
          <FieldLabel>Seus pedidos</FieldLabel>
          {pending.orders.map((order) => {
            const summary = order.items.map((item) => `${item.quantity}x ${item.nameSnapshot}`).join(", ");
            return (
              <View key={order.id} style={{ gap: 4 }}>
                <MipoText variant="caption" numberOfLines={2}>
                  {summary}
                </MipoText>
                <StarRating
                  size={22}
                  value={orderRatings[order.id] ?? 0}
                  onChange={(value) => setOrderRatings((prev) => ({ ...prev, [order.id]: value }))}
                  label={`Nota do pedido ${summary}`}
                />
              </View>
            );
          })}
        </View>
      ) : null}
      <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
        <Button label="Agora não" variant="ghost" onPress={dismiss} style={{ flex: 1 }} />
        <Button
          label="Enviar"
          disabled={rating === 0}
          loading={submitMutation.isPending}
          onPress={() => submitMutation.mutate(pending)}
          style={{ flex: 1 }}
        />
      </View>
    </BottomSheet>
  );
}
