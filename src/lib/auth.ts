export function setToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("wt_auth_token", token);
}

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("wt_auth_token");
}

export function clearToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("wt_auth_token");
}

export function setAdminToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("wt_admin_token", token);
}

export function getAdminToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("wt_admin_token");
}

export function clearAdminToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("wt_admin_token");
}
