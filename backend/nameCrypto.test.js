// node --test backend/nameCrypto.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { initNameCrypto, hasNameKey, encryptName, decryptName, isEncryptedName } from './nameCrypto.js';

const KEY_A = crypto.randomBytes(32).toString('base64');
const KEY_B = crypto.randomBytes(32).toString('base64');

test('鍵があれば暗号化して保存形式になり、復号すると元に戻る', () => {
  assert.equal(initNameCrypto({ NAME_ENCRYPTION_KEY: KEY_A }), true);
  const enc = encryptName('5905', '山田 太郎');
  assert.ok(isEncryptedName(enc));
  assert.ok(!enc.includes('山田'), '暗号文に氏名がそのまま含まれない');
  assert.equal(decryptName('5905', enc), '山田 太郎');
});

test('同じ氏名でも毎回ちがう暗号文になる（推測されにくい）', () => {
  initNameCrypto({ NAME_ENCRYPTION_KEY: KEY_A });
  assert.notEqual(encryptName('5905', '山田 太郎'), encryptName('5905', '山田 太郎'));
});

test('別の社員番号の行に付け替えると復号できない', () => {
  initNameCrypto({ NAME_ENCRYPTION_KEY: KEY_A });
  const enc = encryptName('5905', '山田 太郎');
  assert.equal(decryptName('5906', enc), null);
});

test('暗号文を書き換えると復号できない（改ざん検知）', () => {
  initNameCrypto({ NAME_ENCRYPTION_KEY: KEY_A });
  const enc = encryptName('5905', '山田 太郎');
  const raw = Buffer.from(enc.slice(3), 'base64');
  raw[raw.length - 1] ^= 1;
  assert.equal(decryptName('5905', 'v1:' + raw.toString('base64')), null);
});

test('鍵が違うと復号できない', () => {
  initNameCrypto({ NAME_ENCRYPTION_KEY: KEY_A });
  const enc = encryptName('5905', '山田 太郎');
  initNameCrypto({ NAME_ENCRYPTION_KEY: KEY_B });
  assert.equal(decryptName('5905', enc), null);
});

test('鍵が未設定・不正なら使えない（平文では保存させない）', () => {
  assert.equal(initNameCrypto({}), false);
  assert.equal(hasNameKey(), false);
  assert.throws(() => encryptName('5905', '山田 太郎'));
  assert.equal(initNameCrypto({ NAME_ENCRYPTION_KEY: Buffer.alloc(16).toString('base64') }), false);
  assert.equal(hasNameKey(), false);
});

test('暗号化されていない値・空は null', () => {
  initNameCrypto({ NAME_ENCRYPTION_KEY: KEY_A });
  assert.equal(decryptName('5905', '山田 太郎'), null);
  assert.equal(decryptName('5905', null), null);
  assert.equal(decryptName('5905', 'v1:'), null);
});
