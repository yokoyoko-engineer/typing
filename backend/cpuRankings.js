// CPU BATTLE のジャンル・レベル別ランキング（data/rankings.json）。
// 同じ社員番号は一番良い記録だけを載せる（スコアが高い方。同点なら時間が短い方。それも同じなら先の記録）。

export const RANKING_LIMIT = 30; // 保存・表示する件数（画面は TOP10 と、勝ったあとの TOP30）

// 良い記録ほど前に来る並び順
export function compareRecords(a, b) {
  return (b.score || 0) - (a.score || 0) || (a.time ?? Infinity) - (b.time ?? Infinity);
}

// 社員番号ごとに一番良い記録だけを残し、良い順に並べる
export function bestPerPlayer(list) {
  const best = new Map();
  for (const entry of list || []) {
    const current = best.get(entry.username);
    if (!current || compareRecords(entry, current) < 0) best.set(entry.username, entry);
  }
  return [...best.values()].sort(compareRecords);
}

// 新しい記録を加えたランキングを返す（同じ社員番号は良い方だけ、上位 RANKING_LIMIT 件）
export function addRecord(list, entry, limit = RANKING_LIMIT) {
  return bestPerPlayer([...(list || []), entry]).slice(0, limit);
}
