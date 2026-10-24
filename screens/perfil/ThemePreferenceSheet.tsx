import React from "react";
import { LogOut } from "lucide-react-native";
import { BottomSheet, Button, FieldLabel, MipoText, SegmentedControl } from "../../components/ui";
import { useTheme } from "../../theme/ThemeProvider";
import { ThemePreference } from "../../theme/resolveColorScheme";

export interface ThemePreferenceSheetProps {
  visible: boolean;
  onEditProfile: () => void;
  onSignOut: () => void;
  onClose: () => void;
}

const options: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "Automático" },
  { value: "light", label: "Claro" },
  { value: "dark", label: "Escuro" },
];

export function ThemePreferenceSheet({ visible, onEditProfile, onSignOut, onClose }: ThemePreferenceSheetProps) {
  const { preference, setPreference } = useTheme();
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <MipoText variant="screenTitle" style={{ fontSize: 22 }}>
        Configurações
      </MipoText>
      <FieldLabel>Aparência</FieldLabel>
      <SegmentedControl options={options} value={preference} onChange={setPreference} />
      <Button label="Editar perfil" variant="ghost" block onPress={onEditProfile} style={{ marginTop: 20 }} />
      <Button label="Sair da conta" icon={LogOut} variant="red" block onPress={onSignOut} style={{ marginTop: 10 }} />
    </BottomSheet>
  );
}
