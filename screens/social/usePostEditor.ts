import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/api";
import { showAlert } from "../../components/ui";
import type { PostEditorModalProps } from "./PostEditorModal";
import type { SocialPost } from "./PostCard";
import { resolveImageForUpload } from "./uploadImage";

export async function pickImage(): Promise<string | null> {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.5 });
  return res.canceled ? null : res.assets[0].uri;
}

type EditablePost = Pick<SocialPost, "id" | "content" | "imageUrl">;

export function usePostEditor({ onDeleted }: { onDeleted?: () => void } = {}) {
  const queryClient = useQueryClient();
  const [visible, setVisible] = useState(false);
  const [editingPost, setEditingPost] = useState<EditablePost | null>(null);
  const [content, setContent] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: (postId: string) => api.delete(`/posts/${postId}`),
    onSuccess: () => {
      showAlert("Sucesso", "Post removido.");
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      onDeleted?.();
    },
    onError: () => showAlert("Erro", "Não foi possível excluir o post."),
  });

  const close = () => {
    setVisible(false);
    setEditingPost(null);
  };

  const startNew = () => {
    setEditingPost(null);
    setContent("");
    setImage(null);
    setVisible(true);
  };

  const startEdit = (post: EditablePost) => {
    setEditingPost(post);
    setContent(post.content);
    setImage(post.imageUrl ?? null);
    setVisible(true);
  };

  const save = async () => {
    if (!content.trim() && !image) return showAlert("Atenção", "Digite algo ou adicione foto.");
    setSaving(true);
    const finalImage = await resolveImageForUpload(image);
    try {
      if (editingPost) {
        await api.patch(`/posts/${editingPost.id}`, { content, imageUrl: finalImage });
        showAlert("Sucesso", "Post atualizado!");
      } else {
        await api.post("/posts", { content, imageUrl: finalImage });
        showAlert("Sucesso", "Post criado!");
      }
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      setContent("");
      setImage(null);
      close();
    } catch {
      showAlert("Erro", "Falha ao salvar post");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (postId: string) =>
    showAlert("Excluir", "Deseja remover este post permanentemente?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: () => deleteMutation.mutate(postId) },
    ]);

  const editorProps: PostEditorModalProps = {
    visible,
    editing: editingPost !== null,
    content,
    image,
    saving,
    onChangeContent: setContent,
    onPickImage: async () => {
      const uri = await pickImage();
      if (uri) setImage(uri);
    },
    onSubmit: save,
    onClose: close,
  };

  return { editorProps, startNew, startEdit, confirmDelete };
}
