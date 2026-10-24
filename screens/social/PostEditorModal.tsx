import React from "react";
import { Image, KeyboardAvoidingView, Modal, Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Camera, X } from "lucide-react-native";
import { Button, IconButton, Input, MipoText } from "../../components/ui";
import { useTheme } from "../../theme/ThemeProvider";
import { stroke } from "../../theme/tokens";

export interface PostEditorModalProps {
  visible: boolean;
  editing: boolean;
  content: string;
  image: string | null;
  saving: boolean;
  onChangeContent: (content: string) => void;
  onPickImage: () => void;
  onSubmit: () => void;
  onClose: () => void;
}

export function PostEditorModal({ visible, editing, content, image, saving, onChangeContent, onPickImage, onSubmit, onClose }: PostEditorModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  if (!visible) return null;

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top, paddingBottom: insets.bottom }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 10 }}>
          <IconButton icon={X} accessibilityLabel="Fechar" onPress={onClose} />
          <MipoText variant="screenTitle" style={{ flex: 1, fontSize: 22 }}>
            {editing ? "Editar post" : "Novo post"}
          </MipoText>
          <Button label={editing ? "Salvar" : "Postar"} variant="red" size="sm" loading={saving} onPress={onSubmit} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 14, gap: 12 }} keyboardShouldPersistTaps="handled">
          <Input
            placeholder="Conta como foi a jogatina..."
            value={content}
            onChangeText={onChangeContent}
            multiline
            autoFocus
            containerStyle={{ minHeight: 140 }}
          />
          {image ? (
            <Image
              testID="post-editor-image"
              source={{ uri: image }}
              resizeMode="cover"
              style={{ width: "100%", height: 220, borderRadius: 16, borderWidth: stroke.regular, borderColor: colors.line }}
            />
          ) : null}
          <Button label={image ? "Trocar foto" : "Adicionar foto"} icon={Camera} variant="ghost" onPress={onPickImage} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
