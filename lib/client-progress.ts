export type ProgressState = {
  favs: number[];
  mastered: number[];
  wrongIds: number[];
  stats: { total: number; correct: number; quizCount: number };
  streak: number;
  lastDate: string;
};

export const defaultProgress: ProgressState = {
  favs: [],
  mastered: [],
  wrongIds: [],
  stats: { total: 0, correct: 0, quizCount: 0 },
  streak: 0,
  lastDate: "",
};

function key(username: string) {
  return `lnm_ud_${username}`;
}

export function loadProgress(username: string): ProgressState {
  if (typeof window === "undefined") return defaultProgress;
  try {
    const raw = localStorage.getItem(key(username));
    if (!raw) return defaultProgress;
    const parsed = JSON.parse(raw);
    return {
      favs: parsed.favs || [],
      mastered: parsed.mastered || [],
      wrongIds: parsed.wrongIds || [],
      stats: parsed.stats || { total: 0, correct: 0, quizCount: 0 },
      streak: parsed.streak || 0,
      lastDate: parsed.lastDate || "",
    };
  } catch {
    return defaultProgress;
  }
}

export function saveProgress(username: string, state: ProgressState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key(username), JSON.stringify(state));
}

export function updateStreak(state: ProgressState) {
  const today = new Date().toDateString();
  if (state.lastDate === today) return state;
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  return {
    ...state,
    streak: state.lastDate === yesterday ? state.streak + 1 : 1,
    lastDate: today,
  };
}
