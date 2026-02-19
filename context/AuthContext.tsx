import React, { createContext, useState, useEffect, useContext } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../services/api";

type User = {
  id: string;
  name: string;
  nickname: string | null;
  city: string | null;
  avatarUrl: string | null;
  role: "ADMIN" | "USER";
  isProfileComplete: boolean;
};

type AuthContextData = {
  user: User | null;
  token: string | null;
  signed: boolean;
  loading: boolean;
  signIn: (loginData: any) => Promise<void>;
  signUp: (registerData: any) => Promise<void>;
  signOut: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Função que busca dados atualizados do banco
  async function refreshUser() {
    try {
      const response = await api.get("/users/profile");
      setUser(response.data);
    } catch (error) {
      console.error("Erro ao atualizar dados do usuário", error);
    }
  }

  useEffect(() => {
    async function loadStorageData() {
      const storedToken = await AsyncStorage.getItem("@mipo_token");
      if (storedToken) {
        setToken(storedToken);
        await refreshUser();
      }
      setLoading(false);
    }
    loadStorageData();
  }, []);

  async function signIn({ login, password }: any) {
    const response = await api.post("/auth/login", { login, password });
    setToken(response.data.access_token);
    await AsyncStorage.setItem("@mipo_token", response.data.access_token);
    await refreshUser();
  }

  async function signUp({ name, login, password, age }: any) {
    const response = await api.post("/auth/register", {
      name,
      login,
      password,
      age: parseInt(age),
    });
    setToken(response.data.access_token);
    await AsyncStorage.setItem("@mipo_token", response.data.access_token);
    await refreshUser();
  }

  function signOut() {
    AsyncStorage.removeItem("@mipo_token").then(() => {
      setUser(null);
      setToken(null);
    });
  }

  return (
    <AuthContext.Provider
      value={{
        signed: !!user,
        user,
        token,
        loading,
        signIn,
        signUp,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  return useContext(AuthContext);
}
