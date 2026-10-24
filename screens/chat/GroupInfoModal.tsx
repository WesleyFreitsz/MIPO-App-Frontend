import React from "react";
import { Image, Modal, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Camera, Check, LogOut, Pencil, Shield, Trash2, UserPlus, X } from "lucide-react-native";
import { Avatar, Button, Card, Chip, FieldLabel, IconBox, IconButton, Input, MipoText } from "../../components/ui";
import { useTheme } from "../../theme/ThemeProvider";
import { stroke } from "../../theme/tokens";
import { ChatDetails, displayLabel } from "./chatTypes";

export interface GroupInfoModalProps {
  visible: boolean;
  details: ChatDetails | undefined;
  fallbackName: string;
  currentUserId: string | undefined;
  isAdmin: boolean;
  isEditing: boolean;
  editName: string;
  editDesc: string;
  editImage: string | null;
  saving: boolean;
  onStartEdit: () => void;
  onSave: () => void;
  onChangeName: (name: string) => void;
  onChangeDesc: (desc: string) => void;
  onPickImage: () => void;
  onAddMembers: () => void;
  onPromote: (userId: string, name: string) => void;
  onRemove: (userId: string, name: string) => void;
  onLeave: () => void;
  onClose: () => void;
}

export function GroupInfoModal({
  visible,
  details,
  fallbackName,
  currentUserId,
  isAdmin,
  isEditing,
  editName,
  editDesc,
  editImage,
  saving,
  onStartEdit,
  onSave,
  onChangeName,
  onChangeDesc,
  onPickImage,
  onAddMembers,
  onPromote,
  onRemove,
  onLeave,
  onClose,
}: GroupInfoModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  if (!visible) return null;
  const imageUri = editImage || details?.imageUrl;
  const groupName = details?.name || fallbackName;

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 10 }}>
          <IconButton icon={X} accessibilityLabel="Fechar" onPress={onClose} />
          <MipoText variant="screenTitle" style={{ flex: 1, fontSize: 22 }}>
            Dados do grupo
          </MipoText>
          {isEditing ? (
            <IconButton icon={Check} tone="lime" accessibilityLabel="Salvar grupo" onPress={onSave} disabled={saving} />
          ) : isAdmin ? (
            <IconButton icon={Pencil} accessibilityLabel="Editar grupo" onPress={onStartEdit} />
          ) : null}
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: insets.bottom + 24 }}>
          <View style={{ alignItems: "center", paddingVertical: 16, gap: 6 }}>
            <Pressable
              disabled={!isEditing}
              onPress={onPickImage}
              accessibilityRole={isEditing ? "button" : undefined}
              accessibilityLabel={isEditing ? "Trocar foto do grupo" : undefined}
            >
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={{ width: 110, height: 110, borderRadius: 55, borderWidth: stroke.thick, borderColor: colors.line }} />
              ) : (
                <Avatar id={details?.id ?? groupName} name={groupName} size="lg" />
              )}
              {isEditing ? (
                <View style={{ position: "absolute", right: 0, bottom: 0 }}>
                  <IconBox icon={Camera} tone="pink" size={34} round />
                </View>
              ) : null}
            </Pressable>

            {isEditing ? (
              <View style={{ alignSelf: "stretch" }}>
                <FieldLabel>Nome do grupo</FieldLabel>
                <Input value={editName} onChangeText={onChangeName} />
                <FieldLabel>Descrição</FieldLabel>
                <Input value={editDesc} onChangeText={onChangeDesc} multiline containerStyle={{ minHeight: 80 }} />
              </View>
            ) : (
              <>
                <MipoText variant="screenTitle" style={{ textAlign: "center" }}>
                  {groupName}
                </MipoText>
                {details?.description ? (
                  <MipoText variant="body" color="muted" style={{ textAlign: "center" }}>
                    {details.description}
                  </MipoText>
                ) : null}
                {details?.createdAt ? (
                  <MipoText variant="micro">{`Criado em ${new Date(details.createdAt).toLocaleDateString("pt-BR")}`}</MipoText>
                ) : null}
              </>
            )}
          </View>

          <MipoText variant="section" style={{ marginBottom: 10 }}>
            {`Integrantes (${details?.members?.length ?? 0})`}
          </MipoText>

          {isAdmin ? (
            <Card onPress={onAddMembers} accessibilityLabel="Adicionar membros" style={{ marginBottom: 12 }} contentStyle={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <IconBox icon={UserPlus} tone="teal" />
              <MipoText variant="cardTitle">Adicionar membros</MipoText>
            </Card>
          ) : null}

          <View style={{ gap: 8 }}>
            {details?.members?.map((member) => {
              const name = displayLabel(member.user);
              const isMe = member.userId === currentUserId;
              return (
                <View key={member.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 }}>
                  <Avatar id={member.userId} name={member.user?.name ?? name} uri={member.user?.avatarUrl} />
                  <View style={{ flex: 1 }}>
                    <MipoText variant="cardTitle">{isMe ? "Você" : name}</MipoText>
                    {member.role === "ADMIN" ? <Chip label="Administrador" tone="lime" /> : null}
                  </View>
                  {isAdmin && !isMe ? (
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {member.role !== "ADMIN" ? (
                        <IconButton icon={Shield} tone="blue" size={34} accessibilityLabel={`Tornar ${name} administrador`} onPress={() => onPromote(member.userId, name)} />
                      ) : null}
                      <IconButton icon={Trash2} tone="red" size={34} accessibilityLabel={`Remover ${name} do grupo`} onPress={() => onRemove(member.userId, name)} />
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>

          <Button label="Sair do grupo" icon={LogOut} variant="ghost" block onPress={onLeave} style={{ marginTop: 24 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}
