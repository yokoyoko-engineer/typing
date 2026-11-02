// 氏名（個人情報）を DB に保存するときの暗号化。
//
// - 方式: AES-256-GCM（暗号化 + 改ざん検知）。保存形式は "v1:" + base64(IV 12B | タグ 16B | 暗号文)
// - 鍵: 環境変数 NAME_ENCRYPTION_KEY（32 バイトを base64 にしたもの。`openssl rand -base64 32` で作る）。
//   鍵はサーバの .env だけに置き、git・DB・バックアップには入れない
// - 社員番号を追加認証データ（AAD）にするので、他人の行へ暗号文を付け替えると復号に失敗する
// - 鍵が無い・不正なときは保存しない（平文では決して保存しない）
//
// 守れるもの: DB ファイルやボリュームのバックアップ・スナップショットが漏れた場合。
// 守れないもの: 鍵ごと読める立場（サーバに入れる人・.env を読める人）。

import crypto from 'crypto';

const PREFIX = 'v1:';
const IV_LEN = 12;
const TAG_LEN = 16;

let key = null;

/** 起動時に呼ぶ。鍵が使える状態なら true */
export function initNameCrypto(env = process.env) {
  key = null;
  const raw = env.NAME_ENCRYPTION_KEY;
  if (!raw) {
    console.warn('[nameCrypto] NAME_ENCRYPTION_KEY が未設定のため、氏名は DB に保存しません（ランキング表示はできます）');
    return false;
  }
  const buf = Buffer.from(raw.trim(), 'base64');
  if (buf.length !== 32) {
    console.error('[nameCrypto] NAME_ENCRYPTION_KEY は 32 バイトを base64 にした値にしてください（openssl rand -base64 32）。氏名は DB に保存しません');
    return false;
  }
  key = buf;
  return true;
}

export const hasNameKey = () => key !== null;

export const isEncryptedName = (stored) => typeof stored === 'string' && stored.startsWith(PREFIX);

/** 氏名を暗号化する。鍵が無ければ例外 */
export function encryptName(userId, plain) {
  if (!key) throw new Error('name encryption key is not configured');
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(String(userId), 'utf8'));
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return PREFIX + Buffer.concat([iv, cipher.getAuthTag(), ct]).toString('base64');
}

/** 暗号化された氏名を復号する。鍵が無い・鍵違い・改ざん・形式違いなら null */
export function decryptName(userId, stored) {
  if (!key || !isEncryptedName(stored)) return null;
  try {
    const buf = Buffer.from(stored.slice(PREFIX.length), 'base64');
    if (buf.length < IV_LEN + TAG_LEN) return null;
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, buf.subarray(0, IV_LEN));
    decipher.setAAD(Buffer.from(String(userId), 'utf8'));
    decipher.setAuthTag(buf.subarray(IV_LEN, IV_LEN + TAG_LEN));
    return Buffer.concat([decipher.update(buf.subarray(IV_LEN + TAG_LEN)), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}
