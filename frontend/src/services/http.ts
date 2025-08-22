// src/services/http.ts
import axios from "axios";

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL,   // 👈 your backend Heroku URL from env
  withCredentials: true,                   // required if using cookies/session auth
});