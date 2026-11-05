// イベントの結果表（過去の大会・TOP5）。氏名は DB では暗号化されているので、返す直前に復号する。
// 氏名を含むので /api には置かず、呼び出し元は socket か /admin-api に限る。

import { decryptName } from './nameCrypto.js';

const TOP_LIMIT = 5;

const withName = ({ enc_name, ...row }) => ({ ...row, name: decryptName(row.user_id, enc_name) });

// tournaments.date と同じ UTC の日付で「n か月前」を返す（5/31 の 3 か月前は 2/28 にそろえる）
export function monthsAgoDate(months, now = new Date()) {
  const d = new Date(now);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d.toISOString().slice(0, 10);
}

export async function getTournamentScores(db, tournamentId) {
  const rows = await db.all(`
    SELECT ts.user_id, pn.name AS enc_name,
           COALESCE(NULLIF(ts.job_type, ''), u.job_type, '') AS job_type,
           ts.score
    FROM tournament_scores ts
    LEFT JOIN player_names pn ON pn.user_id = ts.user_id
    LEFT JOIN users u ON u.user_id = ts.user_id
    WHERE ts.tournament_id = ?
    ORDER BY ts.score DESC
  `, [tournamentId]);
  return rows.map(withName);
}

// 社員番号ごとの最高スコアの上位。sinceDate を渡すと、その日以降の大会だけで集計する
export async function getTopScores(db, sinceDate = '') {
  const rows = await db.all(`
    SELECT ts.user_id, pn.name AS enc_name, MAX(ts.score) AS score
    FROM tournament_scores ts
    LEFT JOIN tournaments t ON t.id = ts.tournament_id
    LEFT JOIN player_names pn ON pn.user_id = ts.user_id
    WHERE COALESCE(t.date, '') >= ?
    GROUP BY ts.user_id
    ORDER BY score DESC
    LIMIT ?
  `, [sinceDate, TOP_LIMIT]);
  return rows.map(withName);
}
