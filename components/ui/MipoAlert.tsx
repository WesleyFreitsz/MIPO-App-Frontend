import React, { useEffect, useState } from "react";
import { Modal, Pressable, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { haptic } from "../../motion/haptics";
import { useReducedMotion } from "../../motion/reducedMotion";
import { useTheme } from "../../theme/ThemeProvider";
import { AccentName, offset, radius, stroke } from "../../theme/tokens";
import { Button, ButtonVariant } from "./Button";
import { Character } from "./Character";
import { CharacterName } from "./characters";
import { MipoText } from "./Text";

export type AlertTone = "success" | "error" | "info";

export interface AlertButton {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
}

interface AlertRequest {
  id: number;
  title: string;
  message?: string;
  tone: AlertTone;
  buttons: AlertButton[];
  autoClose: boolean;
}

type Listener = (queue: AlertRequest[]) => void;

const AUTO_CLOSE_MS = 1800;
const SUCCESS_WORDS = /sucesso|pronto|feito|enviad|criad|salv|aprovad|atualizad|adicionad|registrad|removid|exclu[ií]d|aceit|promovid|banid|realizad|bora/i;
const ERROR_WORDS = /erro|falh|ops|n[ãa]o foi poss[ií]vel|inv[áa]lid/i;

const toneCharacter: Record<AlertTone, CharacterName> = { success: "trofeu1", error: "monstro2", info: "dado1" };
const toneAccent: Record<AlertTone, AccentName> = { success: "lime", error: "red", info: "yellow" };

let queue: AlertRequest[] = [];
let nextId = 1;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((listener) => listener(queue));
}

function inferTone(title: string, buttons: AlertButton[]): AlertTone {
  if (buttons.some((b) => b.style === "destructive" || b.style === "cancel")) return "info";
  if (ERROR_WORDS.test(title)) return "error";
  if (SUCCESS_WORDS.test(title)) return "success";
  return "info";
}

export function showAlert(title: string, message?: string, buttons?: AlertButton[], tone?: AlertTone) {
  const safeButtons = buttons && buttons.length > 0 ? buttons : [];
  const resolvedTone = tone ?? inferTone(title, safeButtons);
  queue = [
    ...queue,
    {
      id: nextId++,
      title,
      message,
      tone: resolvedTone,
      buttons: safeButtons,
      autoClose: resolvedTone === "success" && safeButtons.length === 0,
    },
  ];
  emit();
}

function dismiss(id: number) {
  queue = queue.filter((request) => request.id !== id);
  emit();
}

function buttonVariant(button: AlertButton, tone: AlertTone, isPrimary: boolean): ButtonVariant {
  if (button.style === "cancel") return "ghost";
  if (button.style === "destructive") return "red";
  if (!isPrimary) return "ghost";
  return tone === "error" ? "red" : tone === "success" ? "lime" : "yellow";
}

function AlertCard({ request }: { request: AlertRequest }) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (request.tone === "success") haptic.success();
    else if (request.tone === "error") haptic.error();
    else haptic.warning();
  }, [request.id, request.tone]);

  useEffect(() => {
    if (!request.autoClose) return;
    const timer = setTimeout(() => dismiss(request.id), AUTO_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [request.autoClose, request.id]);

  const buttons: AlertButton[] = request.buttons.length > 0 ? request.buttons : request.autoClose ? [] : [{ text: "Entendi" }];
  const cancelButton = buttons.find((b) => b.style === "cancel");
  const handlePress = (button: AlertButton) => {
    dismiss(request.id);
    button.onPress?.();
  };
  const closeFromOutside = () => {
    if (cancelButton) handlePress(cancelButton);
    else if (buttons.length <= 1) handlePress(buttons[0] ?? { text: "" });
  };

  const stacked = buttons.length > 2;
  const primaryIndex = buttons.reduce((last, button, index) => (button.style === "cancel" ? last : index), -1);

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={closeFromOutside}>
      <Animated.View entering={FadeIn.duration(160)} style={{ flex: 1, justifyContent: "center", paddingHorizontal: 28 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fechar aviso"
          onPress={closeFromOutside}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.overlay }}
        />
        <Animated.View entering={reducedMotion ? FadeIn.duration(160) : FadeInDown.duration(220)}>
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: offset.card,
              left: offset.card,
              right: -offset.card,
              bottom: -offset.card,
              borderRadius: radius.card,
              backgroundColor: colors.shadow,
            }}
          />
          <View
            accessibilityRole="alert"
            style={{
              backgroundColor: colors.surface,
              borderWidth: stroke.thick,
              borderColor: colors.line,
              borderRadius: radius.card,
              paddingHorizontal: 18,
              paddingTop: 54,
              paddingBottom: 18,
              alignItems: "center",
            }}
          >
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 30,
                borderTopLeftRadius: radius.card - stroke.thick,
                borderTopRightRadius: radius.card - stroke.thick,
                backgroundColor: colors[toneAccent[request.tone]],
                borderBottomWidth: stroke.regular,
                borderBottomColor: colors.line,
              }}
            />
            <View style={{ position: "absolute", top: -34 }}>
              <Character name={toneCharacter[request.tone]} size={84} motion={request.tone === "error" ? "wiggle" : request.tone === "success" ? "jump" : "idle"} />
            </View>
            <MipoText variant="section" style={{ textAlign: "center" }}>
              {request.title}
            </MipoText>
            {request.message ? (
              <MipoText variant="body" color="muted" style={{ textAlign: "center", marginTop: 6 }}>
                {request.message}
              </MipoText>
            ) : null}
            {buttons.length > 0 ? (
              <View style={{ flexDirection: stacked ? "column" : "row", gap: 10, marginTop: 18, alignSelf: "stretch" }}>
                {buttons.map((button, index) => (
                  <Button
                    key={`${button.text}-${index}`}
                    label={button.text}
                    variant={buttonVariant(button, request.tone, index === primaryIndex)}
                    block
                    onPress={() => handlePress(button)}
                    style={stacked ? undefined : { flex: 1 }}
                  />
                ))}
              </View>
            ) : null}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

export function AlertHost() {
  const [current, setCurrent] = useState<AlertRequest[]>(queue);

  useEffect(() => {
    listeners.add(setCurrent);
    return () => {
      listeners.delete(setCurrent);
    };
  }, []);

  const request = current[0];
  return request ? <AlertCard key={request.id} request={request} /> : null;
}
