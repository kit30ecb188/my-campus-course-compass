import { useCallback, useEffect, useState } from "react";

const KEY = "syllabex-answer-language";
const EVENT = "syllabex-language-change";

/** The language the AI answers in — one of the student's 1-2 chosen languages, remembered per account. */
export function useAnswerLanguage(languages: string[], userId: string | null | undefined) {
  const storageKey = `${KEY}:${userId ?? "guest"}`;
  const fallback = languages[0] ?? "English";
  const [language, setLanguage] = useState(fallback);

  useEffect(() => {
    const read = () => {
      const stored = localStorage.getItem(storageKey);
      setLanguage(stored && languages.includes(stored) ? stored : fallback);
    };
    read();
    window.addEventListener(EVENT, read);
    return () => window.removeEventListener(EVENT, read);
  }, [languages, fallback, storageKey]);

  const update = useCallback((value: string) => {
    localStorage.setItem(storageKey, value);
    window.dispatchEvent(new Event(EVENT));
  }, [storageKey]);

  return [language, update] as const;
}
