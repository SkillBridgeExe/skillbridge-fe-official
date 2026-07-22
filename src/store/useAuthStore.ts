import { create } from "zustand";
import { createJSONStorage, devtools, persist, type StateStorage } from "zustand/middleware";
import { clearAccessToken } from "@/services/auth-token.service";

export type UserRole = "user" | "admin" | "business" | "mentor";
export type AuthStatus = "checking" | "authenticated" | "anonymous";
export type AuthSource = "api" | "mock" | null;

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  company?: string;
}

export interface MockLoginAccount {
  role: UserRole;
  label: string;
  email: string;
  password: string;
}

const MOCK_USERS: Record<UserRole, AuthUser> = {
  user: {
    id: "u1",
    name: "Tai Thi Nguyen",
    email: "taithi@skillbridge.vn",
    role: "user",
    avatar: "/taithi.png",
  },
  admin: {
    id: "a1",
    name: "Admin SkillBridge",
    email: "admin@skillbridge.vn",
    role: "admin",
  },
  business: {
    id: "b1",
    name: "TechCorp Vietnam",
    email: "hr@techcorp.vn",
    role: "business",
    company: "TechCorp Vietnam",
  },
  mentor: {
    id: "m1",
    name: "Tran Minh Tuan",
    email: "mentor@skillbridge.vn",
    role: "mentor",
  },
};

const fallbackStorage = new Map<string, string>();
const safeLocalStorage: StateStorage = {
  getItem: (name) =>
    typeof localStorage === "undefined"
      ? fallbackStorage.get(name) ?? null
      : localStorage.getItem(name),
  setItem: (name, value) => {
    if (typeof localStorage === "undefined") {
      fallbackStorage.set(name, value);
      return;
    }
    localStorage.setItem(name, value);
  },
  removeItem: (name) => {
    if (typeof localStorage === "undefined") {
      fallbackStorage.delete(name);
      return;
    }
    localStorage.removeItem(name);
  },
};

export const MOCK_LOGIN_ACCOUNTS: MockLoginAccount[] = [
  {
    role: "user",
    label: "Student",
    email: "taithi@skillbridge.vn",
    password: "user123",
  },
  {
    role: "admin",
    label: "Admin",
    email: "admin@skillbridge.vn",
    password: "123",
  },
  {
    role: "business",
    label: "Business",
    email: "hr@techcorp.vn",
    password: "123",
  },
  {
    role: "mentor",
    label: "Mentor",
    email: "mentor@skillbridge.vn",
    password: "123",
  },
];

type LoginResult =
  | { success: true; role: UserRole }
  | { success: false; message: string };

interface AuthState {
  authStatus: AuthStatus;
  authSource: AuthSource;
  isAuthenticated: boolean;
  currentUser: AuthUser | null;
  /** Id of the last user who authenticated on this tab; survives logout/expiry
   *  (in-memory only) so a NEW user's login can wipe the previous user's cached
   *  data, without wiping on a transient 401 for the SAME user (bug hunt R4). */
  lastAuthedUserId: string | null;
  login: (role: UserRole) => void;
  loginWithMockAccount: (email: string, password: string) => LoginResult;
  setChecking: () => void;
  setAuthenticated: (user: AuthUser, source?: Exclude<AuthSource, null>) => void;
  setAnonymous: () => void;
  setAuthUser: (user: AuthUser) => void;
  updateAuthUser: (patch: Partial<AuthUser>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        authStatus: "checking",
        authSource: null,
        isAuthenticated: false,
        currentUser: null,
        lastAuthedUserId: null,
        login: (role) =>
          set({
            authStatus: "authenticated",
            authSource: "mock",
            isAuthenticated: true,
            currentUser: MOCK_USERS[role],
          }),
        loginWithMockAccount: (email, password) => {
          const normalizedEmail = email.trim().toLowerCase();
          const account = MOCK_LOGIN_ACCOUNTS.find(
            (item) =>
              item.email.toLowerCase() === normalizedEmail && item.password === password,
          );

          if (!account) {
            return { success: false, message: "Invalid email or password" };
          }

          set({
            authStatus: "authenticated",
            authSource: "mock",
            isAuthenticated: true,
            currentUser: MOCK_USERS[account.role],
          });

          return { success: true, role: account.role };
        },
        setChecking: () =>
          set({
            authStatus: "checking",
          }),
        setAuthenticated: (user, source = "api") =>
          set({
            authStatus: "authenticated",
            authSource: source,
            isAuthenticated: true,
            currentUser: user,
          }),
        setAnonymous: () => {
          clearAccessToken();
          localStorage.removeItem("accessToken");
          localStorage.removeItem("user");
          set({
            authStatus: "anonymous",
            authSource: null,
            isAuthenticated: false,
            currentUser: null,
          });
        },
        setAuthUser: (user) => 
          set({
            authStatus: "authenticated",
            authSource: "api",
            isAuthenticated: true,
            currentUser: user,
          }),
        updateAuthUser: (patch) =>
          set((state) => ({
            currentUser: state.currentUser ? { ...state.currentUser, ...patch } : state.currentUser,
          })),
        logout: () => {
          clearAccessToken();
          localStorage.removeItem("accessToken");
          localStorage.removeItem("user");
          // The studio persist key holds CV content (custom sections) — it
          // must not survive into another account's session on this machine.
          // Key literal matches useCvBuilderStore's persist `name`.
          try {
            localStorage.removeItem("skillbridge-cv-studio");
          } catch {
            // storage unavailable — nothing persisted to clear
          }
          set({
            authStatus: "anonymous",
            authSource: null,
            isAuthenticated: false,
            currentUser: null,
          });
        },
      }),
      {
        name: "skillbridge-auth",
        storage: createJSONStorage(() => safeLocalStorage),
        partialize: (state) => ({
          authSource: state.authSource,
          isAuthenticated: state.isAuthenticated,
          // MUST persist: the cross-account wipe compares the incoming login to
          // this id. It has to outlive reloads/restarts — the same lifetime as
          // the persisted per-user data (cv-studio localStorage / diagnosis
          // sessionStorage) — or a different user's login after a reload would
          // skip the wipe and read the previous user's data (bug hunt R5 07-22).
          lastAuthedUserId: state.lastAuthedUserId,
          // Strip blob: URLs before persisting — they die on page reload
          currentUser: state.currentUser
            ? {
                ...state.currentUser,
                avatar: state.currentUser.avatar?.startsWith("blob:")
                  ? undefined
                  : state.currentUser.avatar,
              }
            : null,
        }),
        merge: (persisted, current) => ({
          ...current,
          ...(persisted as Partial<AuthState>),
          authStatus: "checking",
        }),
      }
    )
  )
);
