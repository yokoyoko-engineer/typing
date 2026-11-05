// node --test backend/tournamentBoard.test.js
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

process.env.NAME_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
const { initNameCrypto, encryptName } = await import('./nameCrypto.js');
const { monthsAgoDate, getTopScores, getTournamentScores } = await import('./tournamentBoard.js');

let db;

before(async () => {
  initNameCrypto();
  db = await open({ filename: ':memory:', driver: sqlite3.Database });
  await db.exec(`
    CREATE TABLE tournaments (id INTEGER PRIMARY KEY, name TEXT, date TEXT);
    CREATE TABLE tournament_scores (tournament_id INTEGER, user_id TEXT, score REAL, job_type TEXT);
    CREATE TABLE player_names (user_id TEXT PRIMARY KEY, name TEXT);
    CREATE TABLE users (user_id TEXT PRIMARY KEY, job_type TEXT);
    INSERT INTO tournaments VALUES (1, '古い大会', '2026-01-10'), (2, '最近の大会', '2026-10-01');
    INSERT INTO tournament_scores VALUES
      (1, '100', 900, 'CL'),
      (2, '100', 300, 'CL'),
      (1, '200', 800, ''),
      (2, '300', 500, 'JAVA'),
      (2, '400', 400, 'CL'),
      (2, '500', 350, 'CL'),
      (2, '600', 340, 'CL'),
      (2, '700', 330, 'CL'),
      (2, '800', 320, 'CL');
    INSERT INTO users VALUES ('200', 'WEB');
  `);
  await db.run('INSERT INTO player_names VALUES (?, ?)', ['100', encryptName('100', 'たろう')]);
  await db.run('INSERT INTO player_names VALUES (?, ?)', ['300', encryptName('999', '別人の鍵素材')]);
  await db.run('INSERT INTO player_names VALUES (?, ?)', ['400', 'plain-text']);
});

after(() => db.close());

test('n か月前の日付: 月末は短い月にそろえ、年をまたげる', () => {
  assert.equal(monthsAgoDate(3, new Date('2026-11-05T12:00:00Z')), '2026-08-05');
  assert.equal(monthsAgoDate(3, new Date('2026-05-31T00:00:00Z')), '2026-02-28');
  assert.equal(monthsAgoDate(3, new Date('2026-01-15T00:00:00Z')), '2025-10-15');
});

test('歴代: 社員番号ごとの最高スコアで上位 5 件、登録された氏名を付ける', async () => {
  const rows = await getTopScores(db);
  assert.deepEqual(rows.map(r => r.user_id), ['100', '200', '300', '400', '500']);
  assert.deepEqual(rows[0], { user_id: '100', score: 900, name: 'たろう' });
  assert.equal(rows[1].name, null);
});

test('期間指定: 指定日より前の大会のスコアは数えない', async () => {
  const rows = await getTopScores(db, '2026-08-05');
  assert.equal(rows.length, 5);
  assert.deepEqual(rows.map(r => r.user_id), ['300', '400', '500', '600', '700']);
  assert.ok(!rows.some(r => r.user_id === '200'));
  const none = await getTopScores(db, '2027-01-01');
  assert.deepEqual(none, []);
});

test('期間内の本人の最高スコアを使う（古い大会の高得点は混ざらない）', async () => {
  await db.run(`INSERT INTO tournament_scores VALUES (2, '100', 600, 'CL')`);
  const rows = await getTopScores(db, '2026-08-05');
  assert.deepEqual(rows[0], { user_id: '100', score: 600, name: 'たろう' });
  await db.run(`DELETE FROM tournament_scores WHERE user_id = '100' AND score = 600`);
});

test('過去の大会: 全員を返す。復号できない氏名や暗号化前の値は出さない', async () => {
  const rows = await getTournamentScores(db, 2);
  assert.equal(rows.length, 7);
  assert.equal(rows[0].user_id, '300');
  assert.equal(rows[0].name, null);
  assert.equal(rows.find(r => r.user_id === '400').name, null);
  assert.equal(rows.find(r => r.user_id === '100').name, 'たろう');
  assert.ok(rows.every(r => !('enc_name' in r)));
});

test('過去の大会: 職種が空なら users の職種を使う', async () => {
  const rows = await getTournamentScores(db, 1);
  assert.equal(rows.find(r => r.user_id === '200').job_type, 'WEB');
});
