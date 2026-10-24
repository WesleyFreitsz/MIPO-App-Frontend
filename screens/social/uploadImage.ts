import { api } from "../../services/api";

export async function uploadImageAsync(uri: string): Promise<string | null> {
  try {
    const formData = new FormData();
    const filename = uri.split("/").pop() || `photo-${Date.now()}.jpg`;
    const match = /\.(\w+)$/.exec(filename);
    formData.append("file", {
      uri,
      name: filename,
      type: match ? `image/${match[1]}` : "image/jpeg",
    } as unknown as Blob);
    const res = await api.post("/uploads/chat-content", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.url;
  } catch {
    return null;
  }
}

export async function resolveImageForUpload(uri: string | null): Promise<string | null> {
  if (uri && uri.startsWith("file://")) return uploadImageAsync(uri);
  return uri;
}
