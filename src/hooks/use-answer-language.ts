import { useCallback, useEffect, useState } from "react";

const KEY = "syllabex-answer-language";
const EVENT = "syllabex-language-change";

/** The language the AI answers in — one of the student's 1-2 chosen languages. */
export function useAnswerLanguage(languages: string[]) {
  const fallback = languages[0] ?? "English";
  const [language, setLanguage] = useState(fallback);

  useEffect(() => {
    const read = () => {
      const stored = localStorage.getItem(KEY);
      setLanguage(stored && languages.includes(stored) ? stored : fallback);
    };
    read();
    window.addEventListener(EVENT, read);
    return () => window.removeEventListener(EVENT, read);
  }, [languages, fallback]);

  const update = useCallback((value: string) => {
    localStorage.setItem(KEY, value);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return [language, update] as const;
}
