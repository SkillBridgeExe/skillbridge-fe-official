import { QueryClient } from '@tanstack/react-query';

// ─── TanStack Query Client ─────────────────────────────────────────
// Quản lý Server State (data fetching, caching, refetching).
// Zustand chỉ quản lý Client State (auth, UI toggles, theme).

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Không tự refetch khi user quay lại tab (tiết kiệm API calls / token)
      refetchOnWindowFocus: false,
      // Retry 1 lần nếu request fail
      retry: 1,
      // Data được coi là "fresh" trong 5 phút (không gọi lại API nếu chưa hết 5p)
      staleTime: 5 * 60 * 1000,
    },
    mutations: {
      retry: 0,
    },
  },
});
