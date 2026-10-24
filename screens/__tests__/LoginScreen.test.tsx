import React from "react";
import { Alert } from "react-native";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import LoginScreen from "../LoginScreen";
import { renderWithTheme } from "../../test-utils/renderWithTheme";
import { api } from "../../services/api";

const mockSignIn = jest.fn();
const mockSignUp = jest.fn();

jest.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ signIn: mockSignIn, signUp: mockSignUp }),
}));
jest.mock("../../services/api", () => ({ api: { post: jest.fn() } }));

const mockedPost = api.post as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
});

async function type(placeholder: string, value: string) {
  await fireEvent.changeText(screen.getByPlaceholderText(placeholder), value);
}

test("login mostra a marca e entra com e-mail e senha", async () => {
  await renderWithTheme(<LoginScreen />);
  expect(screen.getByText("mipo")).toBeTruthy();
  expect(screen.getByText("a sua mesa tá te esperando")).toBeTruthy();
  await type("seu@email.com", "ana@exemplo.com");
  await type("Senha", "segredo");
  await fireEvent.press(screen.getByRole("button", { name: "Entrar" }));
  expect(mockSignIn).toHaveBeenCalledWith({ login: "ana@exemplo.com", password: "segredo" });
});

test("cadastro pede nome, idade e confirmação de e-mail", async () => {
  await renderWithTheme(<LoginScreen />);
  await fireEvent.press(screen.getByRole("button", { name: "Criar conta" }));
  await type("Seu nome", "Ana Souza");
  await type("Sua idade", "28");
  await type("seu@email.com", "ana@exemplo.com");
  await type("Repita seu e-mail", "ana@exemplo.com");
  await type("Senha", "segredo");
  await fireEvent.press(screen.getByRole("button", { name: "Criar conta" }));
  expect(mockSignUp).toHaveBeenCalledWith({ name: "Ana Souza", login: "ana@exemplo.com", password: "segredo", age: "28" });
});

test("cadastro com e-mails diferentes avisa e não cria conta", async () => {
  await renderWithTheme(<LoginScreen />);
  await fireEvent.press(screen.getByRole("button", { name: "Criar conta" }));
  await type("seu@email.com", "ana@exemplo.com");
  await type("Repita seu e-mail", "outra@exemplo.com");
  await fireEvent.press(screen.getByRole("button", { name: "Criar conta" }));
  expect(Alert.alert).toHaveBeenCalledWith("Erro", "Os e-mails digitados não são iguais.");
  expect(mockSignUp).not.toHaveBeenCalled();
});

test("esqueci a senha envia o código e abre a tela de código", async () => {
  mockedPost.mockResolvedValueOnce({ data: {} });
  await renderWithTheme(<LoginScreen />);
  await fireEvent.press(screen.getByRole("button", { name: "Esqueci a senha" }));
  expect(screen.queryByPlaceholderText("Senha")).toBeNull();
  await type("seu@email.com", "ana@exemplo.com");
  await fireEvent.press(screen.getByRole("button", { name: "Enviar código" }));
  expect(mockedPost).toHaveBeenCalledWith("/auth/forgot-password", { email: "ana@exemplo.com" });
  await waitFor(() => expect(screen.getByText("Confere seu e-mail!")).toBeTruthy());
  expect(screen.getByText("Mandamos um código de 6 dígitos pra ana@exemplo.com")).toBeTruthy();
});

test("redefinição usa as caixas de código e a nova senha", async () => {
  mockedPost.mockResolvedValue({ data: {} });
  await renderWithTheme(<LoginScreen />);
  await fireEvent.press(screen.getByRole("button", { name: "Esqueci a senha" }));
  await type("seu@email.com", "ana@exemplo.com");
  await fireEvent.press(screen.getByRole("button", { name: "Enviar código" }));
  await waitFor(() => screen.getByLabelText("Código de 6 dígitos"));
  await fireEvent.changeText(screen.getByLabelText("Código de 6 dígitos"), "123456");
  await type("Nova senha", "novaSenha");
  await fireEvent.press(screen.getByRole("button", { name: "Alterar senha" }));
  expect(mockedPost).toHaveBeenLastCalledWith("/auth/reset-password", {
    email: "ana@exemplo.com",
    code: "123456",
    newPassword: "novaSenha",
  });
  await waitFor(() => expect(screen.getByRole("button", { name: "Entrar" })).toBeTruthy());
});

test("erro da API aparece para a pessoa", async () => {
  mockSignIn.mockRejectedValueOnce({ response: { data: { message: "Senha incorreta" } } });
  await renderWithTheme(<LoginScreen />);
  await fireEvent.press(screen.getByRole("button", { name: "Entrar" }));
  await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith("Erro", "Senha incorreta"));
});

test("dá para mostrar e esconder a senha", async () => {
  await renderWithTheme(<LoginScreen />);
  expect(screen.getByPlaceholderText("Senha").props.secureTextEntry).toBe(true);
  await fireEvent.press(screen.getByRole("button", { name: "Mostrar senha" }));
  expect(screen.getByPlaceholderText("Senha").props.secureTextEntry).toBe(false);
});

test("voltar da recuperação leva ao login", async () => {
  await renderWithTheme(<LoginScreen />);
  await fireEvent.press(screen.getByRole("button", { name: "Esqueci a senha" }));
  await fireEvent.press(screen.getByRole("button", { name: "Voltar" }));
  expect(screen.getByRole("button", { name: "Entrar" })).toBeTruthy();
});
