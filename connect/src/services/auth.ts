import http from "../utils/http";

export const checkAuth = async (token: string) =>
  await http.get("/auth-check", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
