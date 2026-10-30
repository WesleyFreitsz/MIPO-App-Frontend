import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Camera, Check } from "lucide-react-native";
import axios from "axios";
import { Button, Character, EmptyState, LoadingState, MipoText, Screen, ScreenHeader } from "../components/ui";
import { useTheme } from "../theme/ThemeProvider";
import { radius, stroke } from "../theme/tokens";
import { checkinCodeFromScan } from "./loja/storeTypes";
import { useStoreCheckIn } from "./loja/useStorePresence";

type CheckInState = { status: "scanning" } | { status: "sending" } | { status: "done" } | { status: "error"; message: string };

function errorMessage(error: unknown) {
  const message = axios.isAxiosError<{ message?: string }>(error) ? error.response?.data?.message : undefined;
  return message ?? "Não foi possível fazer o check-in. Tente de novo.";
}

export default function StoreCheckInScreen({ embedded = false }: { embedded?: boolean }) {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<{ key: string; name: string; params?: { code?: string } }>();
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const { checkIn } = useStoreCheckIn();
  const [state, setState] = useState<CheckInState>({ status: "scanning" });
  const handledCode = useRef<string | null>(null);

  const submit = (code: string) => {
    if (handledCode.current === code) return;
    handledCode.current = code;
    setState({ status: "sending" });
    checkIn.mutate(code, {
      onSuccess: () => setState({ status: "done" }),
      onError: (error) => setState({ status: "error", message: errorMessage(error) }),
    });
  };

  const linkCode = route.params?.code;
  useEffect(() => {
    if (linkCode) submit(linkCode);
  }, [linkCode]);

  const scanAgain = () => {
    handledCode.current = null;
    setState({ status: "scanning" });
  };

  const goToStore = () => navigation.navigate("Store");

  const renderBody = () => {
    if (state.status === "sending") return <LoadingState skeletons={0} />;
    if (state.status === "done") {
      return (
        <View style={{ alignItems: "center", gap: 12, marginTop: 24 }}>
          <Character name="dado3" size={120} />
          <MipoText variant="screenTitle" style={{ textAlign: "center" }}>
            Check-in feito!
          </MipoText>
          <MipoText variant="body" color="muted" style={{ textAlign: "center" }}>
            Agora você aparece como presente e já pode abrir sua comanda.
          </MipoText>
          <Button label="Ir para a loja" icon={Check} variant="teal" block onPress={goToStore} />
        </View>
      );
    }
    if (state.status === "error") {
      return (
        <EmptyState
          character="peao2"
          title="Check-in não rolou"
          message={state.message}
          action={{ label: "Ler de novo", onPress: scanAgain }}
        />
      );
    }
    if (!permission) return <LoadingState skeletons={0} />;
    if (!permission.granted) {
      return (
        <EmptyState
          character="peao2"
          title="Precisamos da câmera"
          message="A câmera é usada só para ler o QR code do balcão."
          action={{ label: "Permitir câmera", onPress: requestPermission }}
        />
      );
    }
    return (
      <View style={{ gap: 12 }}>
        <View
          style={{
            aspectRatio: 1,
            borderRadius: radius.card,
            borderWidth: stroke.regular,
            borderColor: colors.line,
            overflow: "hidden",
          }}
        >
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={({ data }) => {
              const code = checkinCodeFromScan(data);
              if (code) submit(code);
              else setState({ status: "error", message: "Esse QR não é o de check-in da Mipo." });
            }}
          />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Camera size={18} color={colors.muted} strokeWidth={2.4} />
          <MipoText variant="caption" style={{ flex: 1 }}>
            Aponte para o QR code do balcão. Também funciona com a câmera do próprio celular.
          </MipoText>
        </View>
      </View>
    );
  };

  return (
    <Screen scroll withTabBar={embedded}>
      {embedded ? (
        <ScreenHeader title="Na Mipo" subtitle="Leia o QR code do balcão para entrar" />
      ) : (
        <ScreenHeader title="Check-in na Mipo" onBack={() => navigation.goBack()} />
      )}
      {renderBody()}
    </Screen>
  );
}
