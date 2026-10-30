import React from "react";
import { View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import QRCode from "react-native-qrcode-svg";
import { RefreshCw } from "lucide-react-native";
import { api } from "../services/api";
import { Button, Card, ErrorState, LoadingState, MipoText, Screen, ScreenHeader, showAlert } from "../components/ui";
import { CheckinCode } from "./loja/storeTypes";

const CODE_KEY = ["store", "code"];
const QR_SIZE = 240;

export default function AdminStoreScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const codeQuery = useQuery<CheckinCode>({
    queryKey: CODE_KEY,
    queryFn: async () => (await api.get<CheckinCode>("/store/code")).data,
  });

  const rotateMutation = useMutation({
    mutationFn: async () => (await api.post<CheckinCode>("/store/code/rotate")).data,
    onSuccess: (code) => queryClient.setQueryData(CODE_KEY, code),
    onError: () => showAlert("Erro", "Não foi possível gerar um novo código."),
  });

  const confirmRotate = () =>
    showAlert("Gerar novo QR code?", "O QR atual para de funcionar na hora. Troque o impresso no balcão.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Gerar novo", style: "destructive", onPress: () => rotateMutation.mutate() },
    ]);

  return (
    <Screen scroll>
      <ScreenHeader title="QR de check-in" subtitle="Deixe no balcão ou imprima" onBack={() => navigation.goBack()} />
      {codeQuery.isLoading ? (
        <LoadingState skeletons={1} />
      ) : codeQuery.isError || !codeQuery.data ? (
        <ErrorState onRetry={() => codeQuery.refetch()} />
      ) : (
        <View style={{ gap: 16 }}>
          <Card contentStyle={{ alignItems: "center", gap: 12 }}>
            <View
              accessible
              accessibilityLabel="QR code de check-in da Mipo"
              style={{ padding: 12, backgroundColor: "#FFFFFF", borderRadius: 12 }}
            >
              <QRCode value={codeQuery.data.qrContent} size={QR_SIZE} />
            </View>
            <MipoText variant="cardTitle">Faça check-in na Mipo</MipoText>
            <MipoText variant="caption" style={{ textAlign: "center" }}>
              Abra a câmera do celular ou o app Mipo e aponte para o código.
            </MipoText>
          </Card>
          <MipoText variant="caption" style={{ textAlign: "center" }}>
            {`Código atual: ${codeQuery.data.code}`}
          </MipoText>
          <Button
            label="Gerar novo código"
            icon={RefreshCw}
            variant="ghost"
            block
            loading={rotateMutation.isPending}
            onPress={confirmRotate}
          />
        </View>
      )}
    </Screen>
  );
}
