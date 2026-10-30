import React from "react";
import { View } from "react-native";
import { Minus, Plus, Send } from "lucide-react-native";
import { BottomSheet, Button, FieldLabel, IconButton, Input, MipoText } from "../../components/ui";
import { CartLine, formatBRL } from "./lojaTypes";

interface CartSheetProps {
  visible: boolean;
  lines: CartLine[];
  tableLabel: string;
  note: string;
  sending: boolean;
  onClose: () => void;
  onChangeQuantity: (key: string, delta: number) => void;
  onChangeTableLabel: (value: string) => void;
  onChangeNote: (value: string) => void;
  onSubmit: () => void;
}

export function CartSheet({
  visible,
  lines,
  tableLabel,
  note,
  sending,
  onClose,
  onChangeQuantity,
  onChangeTableLabel,
  onChangeNote,
  onSubmit,
}: CartSheetProps) {
  const total = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <MipoText variant="section">Seu pedido</MipoText>
      <View style={{ gap: 10, marginTop: 12 }}>
        {lines.map((line) => (
          <View key={line.key} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <MipoText variant="bodyBold" numberOfLines={1}>
                {line.name}
              </MipoText>
              <MipoText variant="caption">{line.kind === "GAME" ? "Levamos à sua mesa" : formatBRL(line.unitPrice * line.quantity)}</MipoText>
            </View>
            <IconButton icon={Minus} accessibilityLabel={`Tirar um ${line.name}`} onPress={() => onChangeQuantity(line.key, -1)} />
            <MipoText variant="bodyBold" style={{ minWidth: 20, textAlign: "center" }}>
              {String(line.quantity)}
            </MipoText>
            <IconButton icon={Plus} accessibilityLabel={`Mais um ${line.name}`} onPress={() => onChangeQuantity(line.key, 1)} />
          </View>
        ))}
      </View>
      <FieldLabel>Mesa (opcional)</FieldLabel>
      <Input value={tableLabel} onChangeText={onChangeTableLabel} placeholder="Ex.: 4 ou varanda" maxLength={30} />
      <FieldLabel>Observação (opcional)</FieldLabel>
      <Input value={note} onChangeText={onChangeNote} placeholder="Ex.: sem cebola" maxLength={300} />
      <MipoText variant="bodyBold" style={{ marginTop: 14 }}>
        {`Total estimado: ${formatBRL(total)}`}
      </MipoText>
      <Button label="Enviar pedido" icon={Send} block loading={sending} disabled={lines.length === 0} onPress={onSubmit} style={{ marginTop: 12 }} />
    </BottomSheet>
  );
}
