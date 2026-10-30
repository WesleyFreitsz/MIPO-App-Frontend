import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { CreditCard, User as UserIcon } from "lucide-react-native";
import { BottomSheet, Button, FieldLabel, Input, MipoText } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";

interface OpenTabSheetProps {
  visible: boolean;
  loading: boolean;
  onClose: () => void;
  onSubmit: (data: { customerName: string; cardNumber: string }) => void;
  submitLabel?: string;
}

export function OpenTabSheet({ visible, loading, onClose, onSubmit, submitLabel = "Abrir comanda e enviar" }: OpenTabSheetProps) {
  const { user } = useAuth();
  const [customerName, setCustomerName] = useState("");
  const [cardNumber, setCardNumber] = useState("");

  useEffect(() => {
    if (visible) setCustomerName(user?.nickname || user?.name || "");
  }, [visible, user?.nickname, user?.name]);

  const valid = customerName.trim().length >= 2 && /^[A-Za-z0-9-]{1,20}$/.test(cardNumber.trim());

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <MipoText variant="section">Abrir comanda</MipoText>
      <MipoText variant="caption" style={{ marginTop: 4 }}>
        Use o número do cartãozinho que você recebeu na entrada. A cobrança é feita no caixa.
      </MipoText>
      <View style={{ gap: 12, marginTop: 14 }}>
        <View>
          <FieldLabel>Seu nome</FieldLabel>
          <Input icon={UserIcon} value={customerName} onChangeText={setCustomerName} placeholder="Como te chamamos" maxLength={80} />
        </View>
        <View>
          <FieldLabel>Número do cartão</FieldLabel>
          <Input
            icon={CreditCard}
            value={cardNumber}
            onChangeText={setCardNumber}
            placeholder="Ex.: 27"
            autoCapitalize="characters"
            keyboardType="default"
            maxLength={20}
          />
        </View>
      </View>
      <Button
        label={submitLabel}
        block
        loading={loading}
        disabled={!valid}
        onPress={() => onSubmit({ customerName: customerName.trim(), cardNumber: cardNumber.trim() })}
        style={{ marginTop: 16 }}
      />
    </BottomSheet>
  );
}
