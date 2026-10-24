import React from "react";
import { View } from "react-native";
import { AvatarStack, Card, Character, Chip, DateBlock, MipoText } from "../../components/ui";
import { EventoDetail } from "../../types";
import { eventoLocation, formatEventoChip, formatEventoTime } from "./eventoState";

export interface EventoCardProps {
  evento: EventoDetail;
  variant: "destaque" | "lista";
  onPress: () => void;
  trailing?: React.ReactNode;
}

export function EventoCard({ evento, variant, onPress, trailing }: EventoCardProps) {
  const participants = evento.participants ?? [];
  const label = `Ver evento ${evento.title}`;

  if (variant === "destaque") {
    return (
      <Card tone="pink" onPress={onPress} accessibilityLabel={label} contentStyle={{ paddingRight: 96, minHeight: 130 }}>
        <Chip label={formatEventoChip(evento.dateTime)} tone="lime" />
        <MipoText variant="section" color="onPink" numberOfLines={2} style={{ fontSize: 20, lineHeight: 24, marginTop: 6 }}>
          {evento.title}
        </MipoText>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
          <AvatarStack people={participants.map((p) => ({ id: p.id, name: p.name, uri: p.avatarUrl }))} />
          <MipoText variant="caption" color="onPink" style={{ opacity: 0.9 }}>
            {participants.length > 0 ? `${participants.length} vão` : eventoLocation(evento)}
          </MipoText>
        </View>
        <View style={{ position: "absolute", right: -6, bottom: -6 }}>
          <Character name="dado2" size={96} />
        </View>
      </Card>
    );
  }

  return (
    <Card onPress={onPress} accessibilityLabel={label} contentStyle={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <DateBlock date={new Date(evento.dateTime)} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <MipoText variant="cardTitle" numberOfLines={2}>
          {evento.title}
        </MipoText>
        <MipoText variant="caption" numberOfLines={1}>
          {`${eventoLocation(evento)} · ${formatEventoTime(evento.dateTime)}`}
        </MipoText>
      </View>
      {trailing ?? <Chip label={`${participants.length} vão`} tone="teal" />}
    </Card>
  );
}
