import { atomWithStorage } from "jotai/utils";

export type Language = "en" | "ja";

export const languageAtom = atomWithStorage<Language>("memoria-lang", "en");
