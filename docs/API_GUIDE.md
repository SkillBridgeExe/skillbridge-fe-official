# 🔌 API_GUIDE.md — Quy tắc nối API cho FE (BẮT BUỘC)

> Đọc file này TRƯỚC khi viết bất kỳ dòng code nào gọi backend.
> Vi phạm = PR không được merge. Mẫu chuẩn để copy: `src/services/auth.service.ts` + `src/api/auth/*`.

---

## 0. Nguyên tắc vàng: FE KHÔNG BIẾT backend nằm ở đâu

```
Page/Component ──► src/services/*.service.ts ──► src/api/* (httpClient) ──► /api/...
                                                                              │
                              (đường dẫn TƯƠNG ĐỐI, không có domain)          ▼
                                              Vite proxy (dev) / nginx proxy (production)
                                                              │
                                                              ▼
                                          Backend NestJS (Render hôm nay, Cloud Run ngày mai)
```

- Mọi request là **đường dẫn tương đối** `/api/...` — browser chỉ nói chuyện với chính origin của web → **không bao giờ dính CORS**, cookie refresh-token là first-party.
- Backend đang deploy ở **Render**. Sau này đổi sang **Cloud Run** (hay bất kỳ đâu): **FE không đổi một dòng code nào trong `src/`** — chỉ đổi 2 dòng config hạ tầng:

| File | Dòng |
| --- | --- |
| `nginx/default.conf.template` | `set $api_backend "skillbridge-ai-2rrb.onrender.com";` → host mới |
| `vite.config.ts` | default target của dev proxy `/api` |

→ Vì vậy: **tuyệt đối không hardcode domain backend vào `src/`**. Nếu code của bạn chứa chữ `onrender.com`, `localhost:3002`, `run.app`… là sai chuẩn.

---

## 1. Thêm một endpoint mới — 4 bước, theo đúng thứ tự

Ví dụ thực tế: nối `POST /api/cvs` (upload CV).

### Bước 1 — Khai báo route trong `src/constants/api-routes.ts`

```ts
export const API_ROUTES = {
  CV: {
    LIST: `${API}/cvs`,
    CREATE: `${API}/cvs`,
    DETAIL: (id: string) => `${API}/cvs/${id}`,
  },
  // ...
};
```

❌ Không gõ chuỗi `"/api/cvs"` rải rác trong component. Route chỉ tồn tại MỘT chỗ.

### Bước 2 — Viết hàm API trong `src/api/<feature>/`

Dùng `httpClient` (axios đã cấu hình sẵn Bearer token, credentials, 401 redirect, timeout 15s) + `unwrapEnvelope` (bóc `{ success, message, data, errors }` và ném Error có message đọc được):

```ts
// src/api/cv/uploadCv.ts
import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import { unwrapEnvelope, type ApiEnvelope } from "@/api/auth/envelope";

export type UploadCvResponse = ApiEnvelope<{ id: string; fileName: string; status: string }>;

export const uploadCvApi = (file: File): Promise<UploadCvResponse> => {
  const form = new FormData();
  form.append("cv", file);
  return unwrapEnvelope(
    httpClient.post<UploadCvResponse>(API_ROUTES.CV.CREATE, form, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 90_000, // AI xử lý lâu / BE free-tier cold start → override 15s mặc định
    }),
    "Upload CV failed",
  );
};
```

❌ **CẤM raw `fetch()`** — mất Bearer token, mất 401 handling, mất timeout, mất cookie.
❌ **CẤM tự tạo axios instance riêng** — chỉ dùng `httpClient` chung.

### Bước 3 — Bọc nghiệp vụ trong `src/services/<feature>.service.ts`

Service là nơi chứa logic (chuẩn hoá dữ liệu, fallback, ghép nhiều api call). Page **chỉ gọi service**, không import từ `src/api/` trực tiếp:

```ts
// src/services/cv.service.ts
import { uploadCvApi } from "@/api/cv/uploadCv";

export async function uploadCv(file: File) {
  const result = await uploadCvApi(file);
  return result.data; // service trả dữ liệu đã bóc sẵn cho UI
}
```

### Bước 4 — Page gọi service qua TanStack Query

Server state = TanStack Query (tự lo loading/error/cache/retry). ❌ Không tự chế `useState + useEffect + fetch`:

```tsx
// trong component
import { useMutation } from "@tanstack/react-query";
import { uploadCv } from "@/services/cv.service";
import { getApiErrorMessage } from "@/lib/api-error";

const uploadMutation = useMutation({
  mutationFn: uploadCv,
  onSuccess: (data) => { /* chuyển step, set store... */ },
  onError: (err) => toast({ title: "Upload failed", description: getApiErrorMessage(err), variant: "destructive" }),
});

// JSX: <Button disabled={uploadMutation.isPending} onClick={() => uploadMutation.mutate(file)}>
```

Đọc dữ liệu (GET) thì dùng `useQuery` với `queryKey` rõ ràng:

```tsx
const { data, isLoading, error } = useQuery({
  queryKey: ["cvs"],
  queryFn: getMyCvs, // từ service
});
```

---

## 2. `httpClient` đã lo sẵn những gì (đừng làm lại)

| Việc | Ai lo |
| --- | --- |
| Gắn `Authorization: Bearer <token>` từ localStorage | request interceptor |
| Gửi cookie refresh-token (`withCredentials`) | config sẵn |
| 401 → xoá token + đá về `/login` | response interceptor |
| Timeout mặc định 15s | config sẵn (override per-call khi gọi AI/BE chậm) |
| Base URL | `VITE_API_URL` (mặc định RỖNG = same-origin qua proxy — cứ để rỗng) |

## 3. Biến môi trường (xem `.env.example`)

| Biến | Khi nào đụng tới |
| --- | --- |
| `VITE_API_URL` | Để TRỐNG (mặc định). Chỉ set khi cần gọi thẳng 1 BE không qua proxy (sẽ dính CORS — tự chịu) |
| `VITE_DEV_API_PROXY` | Dev muốn trỏ proxy vào NestJS chạy local: `VITE_DEV_API_PROXY=http://localhost:3002` |
| `VITE_GOOGLE_CLIENT_ID` | Đổi Google OAuth client theo môi trường |

## 4. Checklist trước khi mở PR có gọi API

- [ ] Route khai trong `constants/api-routes.ts`, không có chuỗi URL trong component
- [ ] Không có domain backend nào trong `src/` (`onrender.com`, `localhost:3002`, …)
- [ ] Gọi qua `httpClient` + `unwrapEnvelope` — không raw fetch, không axios riêng
- [ ] Page → service → api (page không import `@/api/*` trực tiếp)
- [ ] Server state qua TanStack Query (`useQuery`/`useMutation`)
- [ ] Lỗi hiển thị bằng `getApiErrorMessage(err)` — không show lỗi thô/console.log bỏ quên
- [ ] Type response đầy đủ — không `any`
- [ ] `npm run lint` (0 errors, 0 warnings) · `typecheck` · `test` · `build` xanh

## 5. Hỏi nhanh

**Q: BE đổi từ Render sang Cloud Run thì FE sửa gì?**
A: Không sửa code. Đổi 2 dòng ở `nginx/default.conf.template` + `vite.config.ts` (xem mục 0), merge → tự deploy.

**Q: Endpoint mới BE chưa làm xong, FE làm trước được không?**
A: Được — khai route + viết api/service/Query như thật, mock ở TẦNG SERVICE (trả Promise dữ liệu giả). Khi BE xong chỉ xoá mock trong service, các tầng khác giữ nguyên.

**Q: Gọi AI endpoint chạy lâu hơn 15s?**
A: Override timeout per-call như ví dụ Bước 2 (xem `AUTH_REQUEST_TIMEOUT_MS` trong `src/api/auth/envelope.ts` làm mẫu).
