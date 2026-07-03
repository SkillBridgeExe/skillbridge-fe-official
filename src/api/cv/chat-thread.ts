import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import { unwrapEnvelope, type ApiEnvelope } from "@/api/auth/envelope";
import type { ChatThreadResponseDto } from "@shared/api";

/**
 * GET /api/cv-matches/:matchId/chat/thread — persisted mascot memory for a match.
 * Deterministic read, no LLM/quota. Empty thread returns { turns: [] }.
 */
export async function getChatThreadApi(matchId: string): Promise<ChatThreadResponseDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<ChatThreadResponseDto>>(
    httpClient.get(API_ROUTES.CV_MATCHES.CHAT_THREAD(matchId), { timeout: 15_000 }),
    "Failed to fetch the assistant conversation.",
  );
  return envelope.data;
}

/**
 * DELETE /api/cv-matches/:matchId/chat/thread — user-initiated erasure of mascot memory.
 */
export async function deleteChatThreadApi(matchId: string): Promise<void> {
  await unwrapEnvelope<ApiEnvelope<unknown>>(
    httpClient.delete(API_ROUTES.CV_MATCHES.CHAT_THREAD(matchId), { timeout: 15_000 }),
    "Failed to erase the assistant conversation.",
  );
}
