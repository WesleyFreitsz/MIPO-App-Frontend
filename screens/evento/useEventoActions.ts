import { useCallback, useState } from "react";

import * as ImagePicker from "expo-image-picker";
import { api } from "../../services/api";
import { EventoDetail } from "../../types";
import { showAlert } from "../../components/ui";

interface EventoActionCallbacks {
  onChanged: () => void;
  onCheckedIn: () => void;
}

function serverMessage(error: unknown): string | undefined {
  return (error as { response?: { data?: { message?: string } } }).response?.data?.message;
}

export function useEventoActions(evento: EventoDetail | null, { onChanged, onCheckedIn }: EventoActionCallbacks) {
  const [toggling, setToggling] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);

  const toggleParticipation = useCallback(async () => {
    if (!evento) return;
    setToggling(true);
    try {
      await api.post(`/events/${evento.id}/toggle`);
      onChanged();
    } catch {
      showAlert("Erro", "Não foi possível atualizar sua presença.");
    } finally {
      setToggling(false);
    }
  }, [evento, onChanged]);

  const checkIn = useCallback(async () => {
    if (!evento) return;
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.5 });
    if (result.canceled) return;
    setCheckingIn(true);
    try {
      await api.post(`/events/${evento.id}/checkin`);
      onCheckedIn();
      onChanged();
    } catch (error) {
      showAlert("Erro", serverMessage(error) || "Falha ao realizar check-in.");
    } finally {
      setCheckingIn(false);
    }
  }, [evento, onChanged, onCheckedIn]);

  return { toggleParticipation, checkIn, toggling, checkingIn };
}
