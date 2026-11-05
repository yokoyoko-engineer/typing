// 管理画面から追加する出題文の検査。
//
// 読み仮名に打てない文字（カタカナ・全角・「ゐ」など）が混ざると、その問題で誰も先へ進めなくなる。
// 実際の入力判定（TypingSession）で最後まで打ち切れることを確かめてから受け付ける。

import { TypingSession } from './utils/typingEngine.js';

export const WORD_TEXT_MAX = 60;
export const WORD_RUBY_MAX = 80;

// 打鍵の入力は小文字にそろえて判定するので、半角の小文字・数字・記号・空白だけが打てる
const isTypableChar = (ch) => /^[\x20-\x7e]$/.test(ch) && ch === ch.toLowerCase();

// 打てない読み仮名の文字を、原因が分かるように探す
function findUntypableChar(ruby, text) {
  for (const ch of ruby) {
    const opts = new TypingSession(ch, text).nodes[0]?.opts || [];
    if (!opts.some(o => [...o].every(isTypableChar))) return ch;
  }
  return null;
}

/**
 * 問題文と読み仮名を検査する。
 * 成功: { ok: true, text, ruby, romaji } / 失敗: { ok: false, error }
 */
export function validateCustomWord({ text, ruby }) {
  if (typeof text !== 'string' || typeof ruby !== 'string') {
    return { ok: false, error: '問題文と読み仮名を入力してください。' };
  }
  const cleanText = text.normalize('NFC').trim();
  // 半角英字は小文字で判定するので、大文字で入力されても打てるように小文字へそろえる
  const cleanRuby = ruby.normalize('NFC').trim().replace(/[A-Z]/g, c => c.toLowerCase());

  if (!cleanText || !cleanRuby) return { ok: false, error: '問題文と読み仮名を入力してください。' };
  if ([...cleanText].length > WORD_TEXT_MAX) return { ok: false, error: `問題文は ${WORD_TEXT_MAX} 文字以内にしてください。` };
  if ([...cleanRuby].length > WORD_RUBY_MAX) return { ok: false, error: `読み仮名は ${WORD_RUBY_MAX} 文字以内にしてください。` };
  if (/[\u0000-\u001f\u007f<>]/.test(cleanText) || /[\u0000-\u001f\u007f]/.test(cleanRuby)) {
    return { ok: false, error: '改行などの制御文字と < > は使えません。' };
  }

  const bad = findUntypableChar(cleanRuby, cleanText);
  if (bad) {
    return { ok: false, error: `読み仮名の「${bad}」はキーボードで入力できません。ひらがな・長音（ー）・半角英数字・半角記号で入力してください。` };
  }

  // 画面に出るローマ字のとおりに最後まで打ち切れることを確かめる
  const session = new TypingSession(cleanRuby, cleanText);
  const romaji = session.state.targetRomaji;
  for (let guard = 0; !session.isFinished(); guard++) {
    const next = session.state.targetRomaji[0];
    const result = next !== undefined && guard < 1000 ? session.input(next) : null;
    if (!result?.success) return { ok: false, error: 'この読み仮名は最後まで入力できません。内容を見直してください。' };
  }
  return { ok: true, text: cleanText, ruby: cleanRuby, romaji };
}
