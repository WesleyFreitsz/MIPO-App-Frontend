import { isAxiosError } from "axios";
import { api } from "./api";

export type UploadEndpoint = "/uploads/avatar" | "/uploads/chat-content" | "/uploads/video";

export interface PickedMedia {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
}

const EXTENSION_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  mp4: "video/mp4",
  mov: "video/quicktime",
  m4v: "video/x-m4v",
  webm: "video/webm",
  "3gp": "video/3gpp",
};

export class UploadError extends Error {}

function describeMedia(media: PickedMedia, fallbackType: string) {
  const fileName = media.fileName || media.uri.split("/").pop() || `arquivo-${Date.now()}`;
  const extension = /\.(\w+)$/.exec(fileName)?.[1]?.toLowerCase();
  const type = media.mimeType || (extension ? EXTENSION_TYPES[extension] : undefined) || fallbackType;
  return { fileName, type };
}

function uploadErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    const serverMessage = (error.response?.data as { message?: string | string[] } | undefined)?.message;
    if (status === 413) return "O arquivo é grande demais. Escolha um menor.";
    if (status === 400 && serverMessage) return Array.isArray(serverMessage) ? serverMessage.join("\n") : serverMessage;
    if (!error.response) return "Sem conexão com o servidor. Confira sua internet e tente de novo.";
    return "Não foi possível enviar o arquivo agora. Tente de novo em instantes.";
  }
  return "Não foi possível enviar o arquivo.";
}

export async function uploadMedia(media: PickedMedia, endpoint: UploadEndpoint): Promise<string> {
  const { fileName, type } = describeMedia(media, endpoint === "/uploads/video" ? "video/mp4" : "image/jpeg");
  const formData = new FormData();
  formData.append("file", { uri: media.uri, name: fileName, type } as unknown as Blob);

  try {
    const response = await api.post<{ url: string }>(endpoint, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data.url;
  } catch (error) {
    if (isAxiosError(error)) {
      console.warn("[upload] falhou", endpoint, error.response?.status, JSON.stringify(error.response?.data));
    }
    throw new UploadError(uploadErrorMessage(error));
  }
}

export function isLocalFile(uri: string | null | undefined): uri is string {
  return !!uri && !/^(https?:|data:)/.test(uri);
}
