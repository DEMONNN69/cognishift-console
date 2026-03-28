const TOKEN_KEY = "cognishift_token";
const USER_KEY  = "cognishift_user";

export interface AuthUser {
  user_id: string;
  name: string;
  role: string;
}

export const auth = {
  setSession(token: string, user: AuthUser) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },
  getUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  },
  isLoggedIn(): boolean {
    return !!localStorage.getItem(TOKEN_KEY);
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};
