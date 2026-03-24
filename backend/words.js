import { LINUX_BASIC, LINUX_STORAGE } from './data/cloudWords1.js';
import { NETWORK_BASIC, WEB_SERVER } from './data/cloudWords2.js';
import { APP_SERVER, DB_SERVER, DNS_WORDS } from './data/cloudWords3.js';
import { MAIL_SERVER, NFS_WORDS, SECURITY_WORDS } from './data/cloudWords4.js';
import { NON_FUNCTIONAL, SHELL_SCRIPT, ZABBIX_WORDS, ALB_WORDS } from './data/cloudWords5.js';
import { NETWORK_ADV, L2_SWITCH, L3_SWITCH_ROUTER, BIGIP_WORDS, SRX_WORDS } from './data/cloudWords6.js';
import { BUSINESS_WORDS } from './data/businessWords.js';

export const CATEGORIES = {
  KOTOWAZA: "ことわざ",
  CLOUD: "クラウド",
  BUSINESS: "ビジネス用語"
};

export const CLOUD_GENRES = {
  LINUX_BASIC: "Linux基礎①②",
  LINUX_STORAGE: "Linux基礎③/ストレージ管理基礎",
  NETWORK_BASIC: "ネットワーク基礎Ⅰ",
  WEB_SERVER: "WebServer",
  APP_SERVER: "ApplicationServer",
  DB_SERVER: "DatabaseServer",
  DNS: "DNS",
  MAIL: "Postfix/Dovecot",
  NFS: "NFS",
  SECURITY: "セキュリティ",
  NON_FUNCTIONAL: "非機能要件",
  SHELL_SCRIPT: "シェルスクリプト",
  ZABBIX: "Zabbix",
  ALB: "ALB",
  NETWORK_ADV: "ネットワークⅡ",
  L2_SWITCH: "L2スイッチ",
  L3_ROUTER: "L3スイッチ/Router",
  BIGIP: "BIGIP",
  SRX: "SRX"
};

const KOTOWAZA_WORDS = [
  { text: "猿も木から落ちる", ruby: "さるもきからおちる" },
  { text: "犬も歩けば棒に当たる", ruby: "いぬもあるけばぼうにあたる" },
  { text: "豚に真珠", ruby: "ぶたにしんじゅ" },
  { text: "猫に小判", ruby: "ねこにこばん" },
  { text: "石の上にも三年", ruby: "いしのうえにもさんねん" },
  { text: "急がば回れ", ruby: "いそがばまわれ" },
  { text: "塵も積もれば山となる", ruby: "ちりもつもればやまとなる" },
  { text: "能ある鷹は爪を隠す", ruby: "のうあるたかはつめをかくす" },
  { text: "花より団子", ruby: "はなよりだんご" },
  { text: "笑う門には福来たる", ruby: "わらうかどにはふくきたる" },
  { text: "一石二鳥", ruby: "いっせきにちょう" },
  { text: "継続は力なり", ruby: "けいぞくはちからなり" },
  { text: "温故知新", ruby: "おんこちしん" },
  { text: "以心伝心", ruby: "いしんでんしん" },
  { text: "一期一会", ruby: "いちごいちえ" },
  { text: "油断大敵", ruby: "ゆだんたいてき" },
  { text: "臨機応変", ruby: "りんきおうへん" },
  { text: "起死回生", ruby: "きしかいせい" },
  { text: "自業自得", ruby: "じごうじとく" },
  { text: "弱肉強食", ruby: "じゃくにくきょうしょく" },
  { text: "本末転倒", ruby: "ほんまつてんとう" },
  { text: "電光石火", ruby: "でんこうせっか" },
  { text: "有言実行", ruby: "ゆうげんじっこう" },
  { text: "絶体絶命", ruby: "ぜったいぜつめい" },
  { text: "波瀾万丈", ruby: "はらんばんじょう" }
];

export const WORDS_BY_GENRE = {
  [CATEGORIES.KOTOWAZA]: KOTOWAZA_WORDS,
  [CATEGORIES.BUSINESS]: BUSINESS_WORDS,
  [CLOUD_GENRES.LINUX_BASIC]: LINUX_BASIC,
  [CLOUD_GENRES.LINUX_STORAGE]: LINUX_STORAGE,
  [CLOUD_GENRES.NETWORK_BASIC]: NETWORK_BASIC,
  [CLOUD_GENRES.WEB_SERVER]: WEB_SERVER,
  [CLOUD_GENRES.APP_SERVER]: APP_SERVER,
  [CLOUD_GENRES.DB_SERVER]: DB_SERVER,
  [CLOUD_GENRES.DNS]: DNS_WORDS,
  [CLOUD_GENRES.MAIL]: MAIL_SERVER,
  [CLOUD_GENRES.NFS]: NFS_WORDS,
  [CLOUD_GENRES.SECURITY]: SECURITY_WORDS,
  [CLOUD_GENRES.NON_FUNCTIONAL]: NON_FUNCTIONAL,
  [CLOUD_GENRES.SHELL_SCRIPT]: SHELL_SCRIPT,
  [CLOUD_GENRES.ZABBIX]: ZABBIX_WORDS,
  [CLOUD_GENRES.ALB]: ALB_WORDS,
  [CLOUD_GENRES.NETWORK_ADV]: NETWORK_ADV,
  [CLOUD_GENRES.L2_SWITCH]: L2_SWITCH,
  [CLOUD_GENRES.L3_ROUTER]: L3_SWITCH_ROUTER,
  [CLOUD_GENRES.BIGIP]: BIGIP_WORDS,
  [CLOUD_GENRES.SRX]: SRX_WORDS,
};

export const ALL_WORDS = Object.values(WORDS_BY_GENRE).flat();

export function getRandomWord(genre = null) {
  const pool = genre && WORDS_BY_GENRE[genre] ? WORDS_BY_GENRE[genre] : ALL_WORDS;
  const index = Math.floor(Math.random() * pool.length);
  return pool[index];
}
