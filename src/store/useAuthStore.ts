import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

export type UserRole = "user" | "admin" | "business" | "mentor";

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
  isAuthenticated: boolean;
  currentUser: AuthUser | null;
  login: (role: UserRole) => void;
  loginWithMockAccount: (email: string, password: string) => LoginResult;
  setAuthUser: (user: AuthUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        isAuthenticated: false,
        currentUser: null,
        login: (role) =>
          set({
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
            isAuthenticated: true,
            currentUser: MOCK_USERS[account.role],
          });

          return { success: true, role: account.role };
        },
        setAuthUser: (user) => 
          set({
            isAuthenticated: true,
            currentUser: user,
          }),
        logout: () => {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("user");
          set({
            isAuthenticated: false,
            currentUser: null,
          });
        },
      }),
      { name: "skillbridge-auth" }
    )
  )
);