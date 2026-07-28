const SESSION_PROGRESS_STORAGE_PREFIX = "skillbridge:learning-session-progress:";

export function getSessionProgressStorageKey(userId: string, sessionId: string): string {
  return `${SESSION_PROGRESS_STORAGE_PREFIX}${userId}:${sessionId}`;
}

export function canUsePersistedRoadmap(
  ownerUserId: string | null | undefined,
  currentUserId: string | null | undefined,
): boolean {
  return Boolean(ownerUserId && currentUserId && ownerUserId === currentUserId);
}

export function selectOwnedRoadmap<T>(
  roadmap: T | null,
  ownerUserId: string | null | undefined,
  currentUserId: string | null | undefined,
): T | null {
  return canUsePersistedRoadmap(ownerUserId, currentUserId) ? roadmap : null;
}
