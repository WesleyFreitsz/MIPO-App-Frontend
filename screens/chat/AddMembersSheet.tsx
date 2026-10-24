import React from "react";
import { FlatList, Pressable } from "react-native";
import { Avatar, BottomSheet, Button, Checkbox, MipoText } from "../../components/ui";
import { ChatUser, displayLabel } from "./chatTypes";

export interface AddMembersSheetProps {
  visible: boolean;
  friends: ChatUser[];
  selected: string[];
  saving: boolean;
  onToggle: (friendId: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export function AddMembersSheet({ visible, friends, selected, saving, onToggle, onSubmit, onClose }: AddMembersSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <MipoText variant="screenTitle" style={{ fontSize: 22, marginBottom: 10 }}>
        Adicionar amigos
      </MipoText>
      <FlatList
        data={friends}
        keyExtractor={(friend) => friend.id}
        style={{ maxHeight: 380 }}
        ListEmptyComponent={<MipoText variant="caption">Todos os seus amigos já estão no grupo!</MipoText>}
        renderItem={({ item }) => {
          const checked = selected.includes(item.id);
          const label = displayLabel(item);
          return (
            <Pressable onPress={() => onToggle(item.id)} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 }}>
              <Avatar id={item.id} name={item.name} uri={item.avatarUrl} />
              <MipoText variant="cardTitle" style={{ flex: 1 }}>
                {label}
              </MipoText>
              <Checkbox checked={checked} onChange={() => onToggle(item.id)} accessibilityLabel={label} />
            </Pressable>
          );
        }}
      />
      <Button
        label={selected.length > 0 ? `Adicionar (${selected.length})` : "Adicionar"}
        variant="red"
        block
        disabled={selected.length === 0}
        loading={saving}
        onPress={onSubmit}
        style={{ marginTop: 14 }}
      />
    </BottomSheet>
  );
}
