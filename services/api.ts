import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const api = axios.create({
  baseURL: "http://192.168.3.61:3000", // Substitua pelo IP do seu backend
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
