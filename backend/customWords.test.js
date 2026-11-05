// node --test backend/customWords.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateCustomWord } from './customWords.js';
import { setCustomWords, getRandomWord, WORDS_BY_GENRE, CATEGORIES } from './words.js';

const check = (text, ruby) => validateCustomWord({ text, ruby });

test('ひらがな・長音・半角英数字の読みは受け付ける', () => {
  for (const [t, r] of [
    ['お世話になっております', 'おせわになっております'],
    ['サーバー', 'さーばー'],
    ['AWSを使う', 'awsをつかう'],
    ['3回確認する', 'さんかいかくにんする'],
    ['ファイル名.txt', 'ふぁいるめい.txt'],
    ['新人研修', 'しんじんけんしゅう'],
    ['あっ', 'あっ'],
    ['はい いいえ', 'はい いいえ'],
    ['a(b)_c-d', 'a(b)_c-d'],
  ]) {
    const res = check(t, r);
    assert.equal(res.ok, true, `${t}: ${res.error}`);
    assert.ok(res.romaji.length > 0);
  }
});

test('打てない読みは理由つきで拒否する', () => {
  for (const [r, bad] of [['カタカナ', 'カ'], ['ＡＢＣ', 'Ａ'], ['ゐど', 'ゐ'], ['あ、い', '、'], ['漢字', '漢'], ['えーあい！', '！']]) {
    const res = check('問題', r);
    assert.equal(res.ok, false, r);
    assert.ok(res.error.includes(`「${bad}」`), res.error);
  }
});

test('読みの大文字は小文字にそろえて受け付ける', () => {
  const res = check('AWS', 'AWS');
  assert.equal(res.ok, true);
  assert.equal(res.ruby, 'aws');
});

test('空・長すぎる・制御文字や < > は拒否する', () => {
  assert.equal(check('', 'あ').ok, false);
  assert.equal(check('あ', '  ').ok, false);
  assert.equal(check('あ'.repeat(61), 'あ').ok, false);
  assert.equal(check('あ', 'あ'.repeat(81)).ok, false);
  assert.equal(check('<script>', 'すくりぷと').ok, false);
  assert.equal(check('改\n行', 'かいぎょう').ok, false);
  assert.equal(validateCustomWord({ text: 1, ruby: null }).ok, false);
});

test('前後の空白は取り除く', () => {
  const res = check('  確認します  ', '  かくにんします ');
  assert.equal(res.text, '確認します');
  assert.equal(res.ruby, 'かくにんします');
});

test('追加した問題が出題され、削除すると出題されなくなる', () => {
  const genre = CATEGORIES.BUSINESS;
  const base = WORDS_BY_GENRE[genre].length;
  setCustomWords([{ genre, text: '追加問題', ruby: 'ついかもんだい' }, { genre: '存在しない', text: 'x', ruby: 'x' }]);
  assert.equal(WORDS_BY_GENRE[genre].length, base + 1);
  const seen = new Set();
  for (let i = 0; i < 5000; i++) seen.add(getRandomWord(genre).text);
  assert.ok(seen.has('追加問題'));
  setCustomWords([]);
  assert.equal(WORDS_BY_GENRE[genre].length, base);
});
