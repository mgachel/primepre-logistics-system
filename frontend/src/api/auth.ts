import axios from "axios";
import { config } from "@/lib/config";

const BASE_URL = `${config.apiBaseUrl}/api`;

// Login function
export async function login(phone: string, password: string) {
  try {
    const res = await axios.post(`${BASE_URL}/auth/login/`, { phone, password });

    // Save tokens
    localStorage.setItem("access_token", res.data.access);
    localStorage.setItem("refresh_token", res.data.refresh);

    console.log(" Login successful:", res.data);
    return res.data;
  } catch (error: any) {
    console.error(" Login failed:", error.response?.data || error.message);
    throw error;
  }
}
