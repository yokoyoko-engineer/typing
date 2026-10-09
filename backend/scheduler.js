// イベント（大会）の毎週自動開始スケジューラ
//
// - 予約は「曜日 + 時:分（日本時間）」の毎週繰り返し。複数登録できる
// - 15 秒ごとに予約を確認し、予定時刻から GRACE_MS 以内で未実行なら開始する
//   （last_run_key に「その回」を記録するので、同じ回を二重に開始しない）
// - サーバが止まっていた時間帯の予約は、起動後に遅れて実行しない（その回はスキップ）

export const JST_OFFSET_MS = 9 * 60 * 60 * 1000; // 日本は夏時間なし
const DAY_MS = 24 * 60 * 60 * 1000;
export const GRACE_MS = 2 * 60 * 1000;
export const CHECK_INTERVAL_MS = 15 * 1000;

export const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

const pad = (n) => String(n).padStart(2, '0');

/** 予約の値が正しいか（曜日 0-6 / 時 0-23 / 分 0-59 の整数） */
export function validateSchedule({ day_of_week, hour, minute }) {
  const ok = (v, max) => Number.isInteger(v) && v >= 0 && v <= max;
  return ok(day_of_week, 6) && ok(hour, 23) && ok(minute, 59);
}

/** Date を日本時間の 'YYYY-MM-DD HH:MM' にする（その回を識別するキー） */
export function jstKey(date) {
  const j = new Date(date.getTime() + JST_OFFSET_MS);
  return `${j.getUTCFullYear()}-${pad(j.getUTCMonth() + 1)}-${pad(j.getUTCDate())} `
    + `${pad(j.getUTCHours())}:${pad(j.getUTCMinutes())}`;
}

/** now 以前で直近の予定時刻（その回）を返す */
export function prevOccurrence(schedule, now) {
  const j = new Date(now.getTime() + JST_OFFSET_MS);
  const todayAt = Date.UTC(j.getUTCFullYear(), j.getUTCMonth(), j.getUTCDate(),
    schedule.hour, schedule.minute) - JST_OFFSET_MS;
  const daysSince = (j.getUTCDay() - schedule.day_of_week + 7) % 7;
  let t = todayAt - daysSince * DAY_MS;
  if (t > now.getTime()) t -= 7 * DAY_MS;
  return new Date(t);
}

/** now より後で次の予定時刻を返す */
export function nextOccurrence(schedule, now) {
  return new Date(prevOccurrence(schedule, now).getTime() + 7 * DAY_MS);
}

/** 今この予約を実行すべき回があれば、その回の Date を返す（なければ null） */
export function dueOccurrence(schedule, now) {
  if (!schedule.enabled) return null;
  const occ = prevOccurrence(schedule, now);
  if (now.getTime() - occ.getTime() >= GRACE_MS) return null;
  if (schedule.last_run_key === jstKey(occ)) return null;
  return occ;
}

/** 管理画面に返す形へ変換（次回・前回の表示用） */
export function describeSchedule(row, now) {
  return {
    id: row.id,
    day_of_week: row.day_of_week,
    hour: row.hour,
    minute: row.minute,
    enabled: !!row.enabled,
    label: `毎週 ${DAY_LABELS[row.day_of_week]}曜 ${pad(row.hour)}:${pad(row.minute)}`,
    next_run_at: nextOccurrence(row, now).toISOString(),
    last_run_key: row.last_run_key,
    last_result: row.last_result,
    last_run_at: row.last_run_at,
  };
}

/**
 * スケジューラを起動する。
 *   getDb()          : SQLite 接続
 *   tryStart()       : イベント開始を試みる。{ result: 'started' | 'skipped_active' | 'skipped_empty' | 'error' }
 *   onRun(info)      : 実行後の通知（管理画面の再読込など）
 */
export function startScheduler({ getDb, tryStart, onRun, now = () => new Date() }) {
  let running = false;

  async function tick() {
    if (running) return; // 前回の確認がまだ終わっていなければ重ねない
    running = true;
    try {
      const db = await getDb();
      const rows = await db.all('SELECT * FROM tournament_schedules WHERE enabled = 1');
      const current = now();
      for (const row of rows) {
        const occ = dueOccurrence(row, current);
        if (!occ) continue;
        const key = jstKey(occ);
        // 先に「この回は処理済み」と記録してから開始する（再起動や重複実行で二重開始しない）
        await db.run(
          'UPDATE tournament_schedules SET last_run_key = ?, last_run_at = ?, last_result = ? WHERE id = ?',
          [key, current.toISOString(), 'running', row.id]
        );
        let result = 'error';
        try {
          ({ result } = await tryStart());
        } catch (err) {
          console.error('[scheduler] start failed', err);
        }
        await db.run('UPDATE tournament_schedules SET last_result = ? WHERE id = ?', [result, row.id]);
        console.log(`[scheduler] schedule #${row.id} (${key} JST): ${result}`);
        onRun?.({ id: row.id, key, result });
      }
    } catch (err) {
      console.error('[scheduler] tick error', err);
    } finally {
      running = false;
    }
  }

  tick();
  return setInterval(tick, CHECK_INTERVAL_MS);
}
