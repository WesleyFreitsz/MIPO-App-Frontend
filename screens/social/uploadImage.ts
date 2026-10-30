import { showAlert } from "../../components/ui";
import { isLocalFile, uploadMedia, UploadEndpoint, UploadError } from "../../services/uploads";

export async function uploadImageAsync(
  uri: string,
  endpoint: UploadEndpoint = "/uploads/chat-content",
): Promise<string | null> {
  try {
    return await uploadMedia({ uri }, endpoint);
  } catch (error) {
    showAlert(
      "Não foi possível enviar a imagem",
      error instanceof UploadError ? error.message : "Tente de novo em instantes.",
    );
    return null;
  }
}

export async function resolveImageForUpload(uri: string | null): Promise<string | null> {
  if (isLocalFile(uri)) return uploadImageAsync(uri);
  return uri;
}
