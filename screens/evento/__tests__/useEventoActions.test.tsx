import * as MipoAlert from "../../../components/ui/MipoAlert";
import { act, renderHook } from "@testing-library/react-native";
import * as ImagePicker from "expo-image-picker";
import { api } from "../../../services/api";
import { EventoDetail } from "../../../types";
import { useEventoActions } from "../useEventoActions";

jest.mock("../../../services/api", () => ({ api: { post: jest.fn() } }));
jest.mock("expo-image-picker", () => ({ launchCameraAsync: jest.fn() }));

const mockedPost = api.post as jest.Mock;
const mockedCamera = ImagePicker.launchCameraAsync as jest.Mock;
const evento = { id: "e1", title: "Noite de Eurogames", dateTime: new Date().toISOString(), space: "SALÃO" } as EventoDetail;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(MipoAlert, "showAlert").mockImplementation(() => undefined);
});

async function setup() {
  const onChanged = jest.fn();
  const onCheckedIn = jest.fn();
  const hook = await renderHook(() => useEventoActions(evento, { onChanged, onCheckedIn }));
  return { ...hook, onChanged, onCheckedIn };
}

test("confirmar presença chama o toggle e recarrega", async () => {
  mockedPost.mockResolvedValueOnce({});
  const { result, onChanged } = await setup();
  await act(() => result.current.toggleParticipation());
  expect(mockedPost).toHaveBeenCalledWith("/events/e1/toggle");
  expect(onChanged).toHaveBeenCalled();
});

test("falha ao confirmar avisa a pessoa", async () => {
  mockedPost.mockRejectedValueOnce(new Error("offline"));
  const { result, onChanged } = await setup();
  await act(() => result.current.toggleParticipation());
  expect(MipoAlert.showAlert).toHaveBeenCalledWith("Erro", "Não foi possível atualizar sua presença.");
  expect(onChanged).not.toHaveBeenCalled();
});

test("check-in tira a foto, registra e comemora", async () => {
  mockedCamera.mockResolvedValueOnce({ canceled: false, assets: [{ uri: "foto.jpg" }] });
  mockedPost.mockResolvedValueOnce({});
  const { result, onChanged, onCheckedIn } = await setup();
  await act(() => result.current.checkIn());
  expect(mockedPost).toHaveBeenCalledWith("/events/e1/checkin");
  expect(onCheckedIn).toHaveBeenCalled();
  expect(onChanged).toHaveBeenCalled();
});

test("cancelar a câmera não faz check-in", async () => {
  mockedCamera.mockResolvedValueOnce({ canceled: true });
  const { result, onCheckedIn } = await setup();
  await act(() => result.current.checkIn());
  expect(mockedPost).not.toHaveBeenCalled();
  expect(onCheckedIn).not.toHaveBeenCalled();
});

test("erro no check-in mostra a mensagem do servidor", async () => {
  mockedCamera.mockResolvedValueOnce({ canceled: false });
  mockedPost.mockRejectedValueOnce({ response: { data: { message: "Check-in já realizado" } } });
  const { result, onCheckedIn } = await setup();
  await act(() => result.current.checkIn());
  expect(MipoAlert.showAlert).toHaveBeenCalledWith("Erro", "Check-in já realizado");
  expect(onCheckedIn).not.toHaveBeenCalled();
});

test("sem evento selecionado não chama a API", async () => {
  const hook = await renderHook(() => useEventoActions(null, { onChanged: jest.fn(), onCheckedIn: jest.fn() }));
  await act(() => hook.result.current.toggleParticipation());
  await act(() => hook.result.current.checkIn());
  expect(mockedPost).not.toHaveBeenCalled();
  expect(mockedCamera).not.toHaveBeenCalled();
});
