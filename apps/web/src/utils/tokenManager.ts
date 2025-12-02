const ACCESS_TOKEN_KEY = "smartmed_access_token"
const REMEMBER_ME_KEY = "smartmed_remember_me"

export const tokenManager = {
  getAccessToken(): string | null {
    if (typeof window === "undefined") return null
    return window.localStorage.getItem(ACCESS_TOKEN_KEY)
  },
  setAccessToken(token: string, remember: boolean) {
    if (typeof window === "undefined") return
    window.localStorage.setItem(ACCESS_TOKEN_KEY, token)
    window.localStorage.setItem(REMEMBER_ME_KEY, remember ? "1" : "0")
  },
  clear() {
    if (typeof window === "undefined") return
    window.localStorage.removeItem(ACCESS_TOKEN_KEY)
    window.localStorage.removeItem(REMEMBER_ME_KEY)
  },
}
