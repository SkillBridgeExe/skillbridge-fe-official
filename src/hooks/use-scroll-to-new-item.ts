import { useEffect, useRef } from "react";

export function useScrollToNewItem<T extends { id: string }>(items: T[], prefix: string) {
  const prevIds = useRef(new Set(items.map((i) => i.id)));

  useEffect(() => {
    const currentIds = new Set(items.map((i) => i.id));
    let newlyAddedId: string | null = null;
    for (const id of currentIds) {
      if (!prevIds.current.has(id)) {
        newlyAddedId = id;
        break;
      }
    }
    prevIds.current = currentIds;

    if (newlyAddedId) {
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        const el = document.getElementById(`${prefix}-${newlyAddedId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 50);
    }
  }, [items, prefix]);
}
