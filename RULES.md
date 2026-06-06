# 📜 RULES.md — Luật BẮT BUỘC khi code SkillBridge FE

> Vibe code thoải mái, dùng AI tool gì cũng được — nhưng **code cuối cùng phải tuân thủ file này**.
> PR vi phạm sẽ không được merge. Có thắc mắc → hỏi trong nhóm TRƯỚC khi code.

---

## 1. Git workflow

### Nhánh
- **KHÔNG BAO GIỜ** commit/push thẳng lên `main`. Mọi thay đổi đi qua PR.
- Tách nhánh từ `origin/main` **mới nhất**:
  ```bash
  git fetch origin
  git switch -c feat/ten-viec origin/main
  ```
- Đặt tên nhánh: `feat/<viec>`, `fix/<viec>`, `chore/<viec>` — kebab-case.
  ⚠️ KHÔNG dùng ngoặc kiểu `feat(ui)/x` — gây lỗi shell/tooling.

### Sync main vào nhánh đang làm
Khi `main` có thay đổi mới (người khác merge PR):
```bash
git fetch origin
git merge origin/main        # merge main VÀO nhánh của mình
# resolve conflict TRÊN NHÁNH MÌNH, chạy đủ 4 lệnh verify, rồi push
```
- ❌ KHÔNG rebase nhánh đã push lên remote.
- ❌ KHÔNG resolve conflict trên `main`.
- Nhánh càng để lâu càng lệch — sync main **ít nhất mỗi ngày** khi đang làm dở.

### Commit
- Theo **Conventional Commits**: `type(scope): mô tả` — `feat` / `fix` / `refactor` / `chore` / `docs` / `test`.
  ```
  feat(cv-builder): add skills section with AI suggestions
  fix(auth): handle expired token on refresh
  ```
- **Mỗi commit 1 việc** (1 concern). Không gộp "sửa bug + thêm feature + format" vào 1 commit.

### Pull Request
- Mô tả PR: làm gì, vì sao, test thế nào.
- Điều kiện merge: **CI xanh** + CodeRabbit đã review + **1 approval** từ teammate.
- Sửa hết comment review nghiêm túc trước khi nhờ merge.
- ⚠️ **Merge vào main = tự động deploy production sau ~4 phút.** Nghĩ kỹ trước khi bấm.

---

## 2. Stack — dự án xài gì thì xài đó

| Việc | Dùng | KHÔNG dùng |
|---|---|---|
| UI components | **Tailwind + shadcn/ui** (`src/components/ui/` có sẵn 49 cái) | MUI, AntD, Bootstrap, Chakra... |
| Icons | **lucide-react** | FontAwesome, react-icons... |
| Animation | **framer-motion + GSAP** (đã có) | Lib animation khác |
| Server state (data từ API) | **TanStack Query** | useState + useEffect tự fetch |
| Client/UI state | **Zustand** (`src/store/`) | Redux, Context tự chế |
| Routing | **React Router 6** (lazy qua `src/routes/lazy-pages.ts`) | — |
| Gọi HTTP | **axios qua `src/api/core/http-client.ts`** | ❌ raw `fetch()` |
| Charts | **Recharts** | — |
| Test | **Vitest** | — |

- Muốn thêm dependency mới → nêu lý do trong PR, được duyệt mới thêm.
- Cần component UI mới → lấy từ shadcn (`npx shadcn@latest add <name>`), không tự viết lại từ đầu cái shadcn đã có.

---

## 3. Kiến trúc gọi API — 3 tầng, không đi tắt

```
Page/Component → src/services/*.service.ts → src/api/* (httpClient) → /api/* → NestJS
```

- Endpoint **luôn** lấy từ `src/constants/api-routes.ts` — không gõ chuỗi URL trong component.
- URL **tương đối** `/api/*` — same-origin qua proxy (Vite lo ở dev, nginx lo ở production). **KHÔNG hardcode domain backend** (`onrender.com`, `localhost:3002`...) vào code.
- Response envelope `{ success, message, data, errors }` — unwrap bằng helper có sẵn (xem `src/api/auth/envelope.ts` làm mẫu).
- Data từ server hiển thị lên UI → đi qua **TanStack Query** để có caching + loading + error state chuẩn.
- Mẫu chuẩn để copy: `src/services/auth.service.ts` + `src/api/auth/*`.

---

## 4. Cấu trúc folder — file nào chỗ đó

```
src/
├── pages/          # route-level (auth/ user/ admin/ business/ mentor/ public/ dev/)
├── components/     # <feature>/ cho từng tính năng · ui/ là shadcn (KHÔNG sửa tay file trong ui/)
├── services/       # tầng nghiệp vụ — page gọi service, không gọi thẳng api
├── api/            # tầng HTTP — httpClient + các module gọi endpoint
├── store/          # Zustand stores (useXxxStore.ts)
├── hooks/          # custom hooks (useXxx.ts)
├── lib/            # utils thuần
├── constants/      # api-routes.ts + hằng số dùng chung
└── routes/         # lazy-pages.ts — đăng ký page mới ở đây
```

- Route mới: thêm `src/routes/lazy-pages.ts` + `App.tsx`. **Không đổi route path hiện có** khi chưa được duyệt.
- ⚠️ **KHÔNG đụng thư mục `shared/`** — xoá là build fail.

---

## 5. Cấm tuyệt đối ❌

1. **Hardcode** URL backend / API key / client ID / config theo môi trường
   → dùng `import.meta.env.VITE_*` (khai báo vào `.env.example`) hoặc `src/constants/`.
2. **Dead code**: khối code comment-out, `console.log` debug, import/biến không dùng
   → xoá sạch trước khi mở PR.
3. **Thay thế mock auth** — mock chạy **SONG SONG** với API thật. 4 demo account
   (`taithi@skillbridge.vn`...) phải **luôn login được** kể cả khi BE chết.
4. **Tự ý đổi** UI / route path / API contract / cấu trúc thư mục khi chưa được duyệt.
5. **`any` tuỳ tiện** — định nghĩa type/interface đàng hoàng.
6. **Đổi port dev 8080** trong `vite.config.ts` — muốn chạy port khác trên máy mình:
   `npm run dev -- --port 3000`.
7. **Vi phạm rules-of-hooks**: không gọi hook trong loop/callback/điều kiện.

---

## 6. Verify trước khi mở PR — bắt buộc chạy đủ 4 lệnh

```bash
npm run lint        # 0 errors — warnings KHÔNG được tăng so với main
npm run typecheck   # tsc --noEmit sạch
npm run test        # Vitest pass hết
npm run build       # build production OK
```

Đỏ 1 trong 4 = chưa được mở PR. CI sẽ chạy lại đúng 4 bước này — đỏ là không merge được.

---

## 7. Checklist tự soát trước khi xin review

- [ ] Nhánh tách từ main mới nhất, đã sync main gần nhất
- [ ] Commit tách theo concern, message đúng convention
- [ ] Không hardcode, không dead code, không `any` bừa
- [ ] Gọi API đúng 3 tầng (service → httpClient → api-routes)
- [ ] UI dùng shadcn/Tailwind, state đúng chỗ (Query vs Zustand)
- [ ] 4 lệnh verify xanh hết
- [ ] Đã tự đọc lại diff của chính mình 1 lần
