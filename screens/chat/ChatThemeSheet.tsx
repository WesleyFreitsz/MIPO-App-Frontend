import React from "react";
import { Pressable, View } from "react-native";
import ColorPicker from "react-native-wheel-color-picker";
import { BottomSheet, Button, MipoText, SegmentedControl } from "../../components/ui";
import { useTheme } from "../../theme/ThemeProvider";
import { chatNameColors, stroke } from "../../theme/tokens";

export type ChatThemeTab = "BUBBLE" | "NAME";

export interface ChatThemeSheetProps {
  visible: boolean;
  isPrivate: boolean;
  tab: ChatThemeTab;
  wheelColor: string;
  previewNameColor: string;
  myName: string;
  defaultNameColor: string;
  savingBackground: boolean;
  savingName: boolean;
  onTabChange: (tab: ChatThemeTab) => void;
  onWheelChange: (color: string) => void;
  onPreviewNameColor: (color: string) => void;
  onSaveBackground: (color: string) => void;
  onSaveNameColor: (color: string) => void;
  onClose: () => void;
}

export function ChatThemeSheet({
  visible,
  isPrivate,
  tab,
  wheelColor,
  previewNameColor,
  myName,
  defaultNameColor,
  savingBackground,
  savingName,
  onTabChange,
  onWheelChange,
  onPreviewNameColor,
  onSaveBackground,
  onSaveNameColor,
  onClose,
}: ChatThemeSheetProps) {
  const { colors } = useTheme();
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <MipoText variant="screenTitle" style={{ fontSize: 22, marginBottom: 10 }}>
        Personalizar chat
      </MipoText>
      {!isPrivate ? (
        <View style={{ marginBottom: 12 }}>
          <SegmentedControl
            options={[
              { value: "BUBBLE", label: "Fundo" },
              { value: "NAME", label: "Cor do nome" },
            ]}
            value={tab}
            onChange={onTabChange}
          />
        </View>
      ) : null}

      {tab === "BUBBLE" || isPrivate ? (
        <View>
          <MipoText variant="caption" style={{ textAlign: "center", marginBottom: 10 }}>
            Mova a roda para ver o resultado em tempo real no fundo.
          </MipoText>
          <View style={{ height: 260, marginBottom: 16 }}>
            <ColorPicker color={wheelColor} onColorChangeComplete={onWheelChange} thumbSize={30} sliderSize={30} noSnap row={false} />
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button label="Remover fundo" variant="ghost" onPress={() => onSaveBackground("")} style={{ flex: 1 }} block />
            <Button label="Salvar cor" variant="red" loading={savingBackground} onPress={() => onSaveBackground(wheelColor)} style={{ flex: 1 }} block />
          </View>
        </View>
      ) : (
        <View>
          <MipoText variant="caption" style={{ textAlign: "center", marginBottom: 10 }}>
            Como os outros verão seu nome:
          </MipoText>
          <View
            style={{
              alignSelf: "center",
              maxWidth: "80%",
              padding: 10,
              borderRadius: 16,
              borderWidth: stroke.regular,
              borderColor: colors.line,
              backgroundColor: colors.surface,
              marginBottom: 16,
            }}
          >
            <MipoText variant="micro" style={{ color: previewNameColor || defaultNameColor }}>
              {myName}
            </MipoText>
            <MipoText variant="bodyBold">Essa é uma mensagem de teste do seu nome.</MipoText>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
            {chatNameColors.map((color) => (
              <Pressable
                key={color}
                accessibilityRole="button"
                accessibilityLabel={`Usar a cor ${color}`}
                accessibilityState={{ selected: previewNameColor === color }}
                onPress={() => onPreviewNameColor(color)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: color,
                  borderWidth: previewNameColor === color ? stroke.thick : stroke.thin,
                  borderColor: colors.line,
                  transform: [{ scale: previewNameColor === color ? 1.12 : 1 }],
                }}
              />
            ))}
          </View>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 20 }}>
            <Button
              label="Cor padrão"
              variant="ghost"
              onPress={() => {
                onPreviewNameColor("");
                onSaveNameColor("");
              }}
              style={{ flex: 1 }}
              block
            />
            <Button label="Salvar cor" variant="red" loading={savingName} onPress={() => onSaveNameColor(previewNameColor)} style={{ flex: 1 }} block />
          </View>
        </View>
      )}
    </BottomSheet>
  );
}
