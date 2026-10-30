import React, { useState } from "react";
import { View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import { Users } from "lucide-react-native";
import { Button, Card, MipoText, SectionHeader, Skeleton } from "../../components/ui";
import { PlayCallCard } from "./PlayCallCard";
import { CreatePlayCallSheet } from "./CreatePlayCallSheet";
import { usePlayCalls } from "./playCallsApi";
import { useStorePresence } from "./useStorePresence";

const PREVIEW_LIMIT = 3;

export function PlayCallsNowCard() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const presence = useStorePresence();
  const checkedIn = presence.data?.me.checkedIn ?? false;
  const calls = usePlayCalls("NOW", checkedIn);
  const [creating, setCreating] = useState(false);
  const list = calls.data ?? [];

  return (
    <View style={{ gap: 10 }}>
      <SectionHeader title="Procuro jogadores" action={{ label: "Ver todos", accessibilityLabel: "Ver todos os chamados para jogar", onPress: () => navigation.navigate("PlayCalls") }} />
      {!checkedIn ? (
        <Card>
          <MipoText variant="caption">Faça check-in para ver quem está procurando gente para jogar agora.</MipoText>
        </Card>
      ) : calls.isLoading ? (
        <Card>
          <Skeleton height={60} />
        </Card>
      ) : list.length === 0 ? (
        <Card>
          <MipoText variant="caption">Ninguém procurando jogadores agora. Que tal começar uma mesa?</MipoText>
        </Card>
      ) : (
        list.slice(0, PREVIEW_LIMIT).map((call) => <PlayCallCard key={call.id} call={call} />)
      )}
      {checkedIn ? <Button label="Procurar jogadores" icon={Users} variant="teal" size="sm" onPress={() => setCreating(true)} /> : null}
      <CreatePlayCallSheet visible={creating} onClose={() => setCreating(false)} canPlayNow={checkedIn} />
    </View>
  );
}
