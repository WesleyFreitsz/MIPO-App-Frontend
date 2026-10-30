import React from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import { LogIn, LogOut } from "lucide-react-native";
import { Avatar, Button, Card, MipoText, Skeleton, showAlert } from "../../components/ui";
import { displayName } from "./storeTypes";
import { useStoreCheckIn, useStorePresence } from "./useStorePresence";

function checkedInSince(iso?: string) {
  if (!iso) return "";
  const date = new Date(iso);
  return ` desde ${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function PresentNowCard() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { data, isLoading } = useStorePresence();
  const { checkOut } = useStoreCheckIn();

  const confirmCheckOut = () =>
    showAlert("Sair da loja?", "Você deixa de aparecer como presente na Mipo.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: () => checkOut.mutate(undefined, { onError: () => showAlert("Erro", "Não foi possível fazer o check-out.") }),
      },
    ]);

  if (isLoading || !data) {
    return (
      <Card>
        <Skeleton height={60} />
      </Card>
    );
  }

  const others = data.users;

  return (
    <Card tone={data.me.checkedIn ? "lime" : "neutral"}>
      <MipoText variant="cardTitle">{data.me.checkedIn ? "Você está na Mipo" : "Está na Mipo?"}</MipoText>
      <MipoText variant="caption" style={{ marginTop: 2 }}>
        {data.me.checkedIn
          ? `Check-in feito${checkedInSince(data.me.checkedInAt)}`
          : "Leia o QR code do balcão para aparecer aqui e fazer pedidos."}
      </MipoText>

      <MipoText variant="bodyBold" style={{ marginTop: 14 }}>
        {data.count === 0 ? "Ninguém na loja agora" : data.count === 1 ? "1 pessoa na loja" : `${data.count} pessoas na loja`}
      </MipoText>
      {others.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingVertical: 8 }}>
          {others.map((person) => (
            <Pressable
              key={person.id}
              accessibilityRole="button"
              accessibilityLabel={`Ver perfil de ${displayName(person)}`}
              onPress={() => navigation.navigate("PlayerProfile", { userId: person.id })}
              style={{ alignItems: "center", width: 56 }}
            >
              <Avatar name={person.name} id={person.id} uri={person.avatarUrl} online />
              <MipoText variant="micro" numberOfLines={1} style={{ marginTop: 4 }}>
                {displayName(person)}
              </MipoText>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <View style={{ marginTop: 12 }}>
        {data.me.checkedIn ? (
          <Button label="Sair da loja" icon={LogOut} variant="ghost" size="sm" loading={checkOut.isPending} onPress={confirmCheckOut} />
        ) : (
          <Button label="Fazer check-in" icon={LogIn} variant="teal" size="sm" onPress={() => navigation.navigate("StoreCheckIn")} />
        )}
      </View>
    </Card>
  );
}
