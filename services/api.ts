import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const api = axios.create({
  baseURL: "https://mipo-app-backend-production.up.railway.app", // URL atualizada
});
// Interceptor: Adiciona o Token automaticamente em toda requisição
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("@mipo_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export { api };
