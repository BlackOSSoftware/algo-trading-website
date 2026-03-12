const LOGIN_WELCOME_STORAGE_KEY = "wt:login-welcome";

export function markLoginWelcomePending() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(LOGIN_WELCOME_STORAGE_KEY, "1");
  } catch {}
}

export function consumeLoginWelcomePending() {
  if (typeof window === "undefined") return false;
  try {
    const pending = window.sessionStorage.getItem(LOGIN_WELCOME_STORAGE_KEY) === "1";
    if (pending) {
      window.sessionStorage.removeItem(LOGIN_WELCOME_STORAGE_KEY);
    }
    return pending;
  } catch {
    return false;
  }
}
