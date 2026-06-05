import { useEffect, useState } from "react";

/**
 * Gõ chữ từng ký tự khi `start` = true (vd: khi element vào viewport).
 * Trả về chuỗi đã gõ + cờ `done` để ẩn con trỏ nhấp nháy khi xong.
 */
export function useTypewriter(text: string, speed = 20, start = true) {
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (!start) {
      setTyped("");
      return;
    }
    let index = 0;
    const interval = setInterval(() => {
      index++;
      setTyped(text.slice(0, index));
      if (index >= text.length) clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed, start]);

  return { typed, done: typed.length >= text.length };
}
