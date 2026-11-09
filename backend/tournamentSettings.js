// イベント BATTLE の設定（管理画面から変える。DB の app_settings に key = 'tournament' で保存）
// - durationMinutes: 1 回のイベントの時間（分）。変更は次に開始するイベントから効く

export const DURATION_MIN = 1;
export const DURATION_MAX = 60;

export const DEFAULT_TOURNAMENT_SETTINGS = Object.freeze({ durationMinutes: 5 });

function isDuration(v) {
  return Number.isInteger(v) && v >= DURATION_MIN && v <= DURATION_MAX;
}

/**
 * 管理画面から送られた設定を確かめる。
 * 戻り値: { ok: true, settings } | { ok: false, error }（error は画面に出す日本語）
 */
export function validateTournamentSettings(input) {
  if (!input || typeof input !== 'object') return { ok: false, error: '設定の形式が正しくありません。' };
  if (!isDuration(input.durationMinutes)) {
    return { ok: false, error: `イベントの時間は ${DURATION_MIN}〜${DURATION_MAX} 分の整数で指定してください。` };
  }
  return { ok: true, settings: { durationMinutes: input.durationMinutes } };
}

// DB に保存してある設定を読み込む。足りない項目や壊れた値は初期値で補う
export function loadTournamentSettings(saved) {
  const merged = { ...DEFAULT_TOURNAMENT_SETTINGS };
  if (saved && typeof saved === 'object' && isDuration(saved.durationMinutes)) {
    merged.durationMinutes = saved.durationMinutes;
  }
  return merged;
}
