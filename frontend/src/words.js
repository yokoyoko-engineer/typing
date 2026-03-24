import { LINUX_BASIC, LINUX_STORAGE } from './data/cloudWords1';
import { NETWORK_BASIC, WEB_SERVER } from './data/cloudWords2';
import { APP_SERVER, DB_SERVER, DNS_WORDS } from './data/cloudWords3';
import { MAIL_SERVER, NFS_WORDS, SECURITY_WORDS } from './data/cloudWords4';
import { NON_FUNCTIONAL, SHELL_SCRIPT, ZABBIX_WORDS, ALB_WORDS } from './data/cloudWords5';
import { NETWORK_ADV, L2_SWITCH, L3_SWITCH_ROUTER, BIGIP_WORDS, SRX_WORDS } from './data/cloudWords6';
import { BUSINESS_WORDS } from './data/businessWords';

// Categories
export const CATEGORIES = {
  KOTOWAZA: "ことわざ",
  CLOUD: "クラウド",
  BUSINESS: "ビジネス用語"
};

// Genre keys for クラウド category
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

// ことわざ Words
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
  { text: "五十歩百歩", ruby: "ごじっぽひゃっぽ" },
  { text: "三日坊主", ruby: "みっかぼうず" },
  { text: "七転び八起き", ruby: "ななころびやおき" },
  { text: "十人十色", ruby: "じゅうにんといろ" },
  { text: "百聞は一見に如かず", ruby: "ひゃくぶんはいっけんにしかず" },
  { text: "壁に耳あり障子に目あり", ruby: "かべにみみありしょうじにめあり" },
  { text: "継続は力なり", ruby: "けいぞくはちからなり" },
  { text: "井の中の蛙大海を知らず", ruby: "いのなかのからずたいかいをしらず" },
  { text: "青天の霹靂", ruby: "せいてんのへきれき" },
  { text: "温故知新", ruby: "おんこちしん" },
  { text: "以心伝心", ruby: "いしんでんしん" },
  { text: "一期一会", ruby: "いちごいちえ" },
  { text: "花鳥風月", ruby: "かちょうふうげつ" },
  { text: "日進月歩", ruby: "にっしんげっぽ" },
  { text: "油断大敵", ruby: "ゆだんたいてき" },
  { text: "臨機応変", ruby: "りんきおうへん" },
  { text: "無我夢中", ruby: "むがむちゅう" },
  { text: "起死回生", ruby: "きしかいせい" },
  { text: "自業自得", ruby: "じごうじとく" },
  { text: "弱肉強食", ruby: "じゃくにくきょうしょく" },
  { text: "八方美人", ruby: "はっぽうびじん" },
  { text: "本末転倒", ruby: "ほんまつてんとう" },
  { text: "四面楚歌", ruby: "しめんそか" },
  { text: "一喜一憂", ruby: "いっきいちゆう" },
  { text: "五里霧中", ruby: "ごりむちゅう" },
  { text: "前代未聞", ruby: "ぜんだいみもん" },
  { text: "大器晩成", ruby: "たいきばんせい" },
  { text: "単刀直入", ruby: "たんとうちょくにゅう" },
  { text: "電光石火", ruby: "でんこうせっか" },
  { text: "馬耳東風", ruby: "ばじとうふう" },
  { text: "半信半疑", ruby: "はんしんはんぎ" },
  { text: "百発百中", ruby: "ひゃっぱつひゃくちゅう" },
  { text: "満身創痍", ruby: "まんしんそうい" },
  { text: "傍若無人", ruby: "ぼうじゃくぶじん" },
  { text: "有言実行", ruby: "ゆうげんじっこう" },
  { text: "理路整然", ruby: "りろせいぜん" },
  { text: "老若男女", ruby: "ろうにゃくなんにょ" },
  { text: "一網打尽", ruby: "いちもうだじん" },
  { text: "悪戦苦闘", ruby: "あくせんくとう" },
  { text: "意気投合", ruby: "いきとうごう" },
  { text: "一挙両得", ruby: "いっきょりょうとく" },
  { text: "右往左往", ruby: "うおうさおう" },
  { text: "完全無欠", ruby: "かんぜんむけつ" },
  { text: "奇想天外", ruby: "きそうてんがい" },
  { text: "孤軍奮闘", ruby: "こぐんふんとう" },
  { text: "自画自賛", ruby: "じがじさん" },
  { text: "質実剛健", ruby: "しつじつごうけん" },
  { text: "諸行無常", ruby: "しょぎょうむじょう" },
  { text: "心機一転", ruby: "しんきいってん" },
  { text: "十中八九", ruby: "じっちゅうはっく" },
  { text: "絶体絶命", ruby: "ぜったいぜつめい" },
  { text: "大義名分", ruby: "たいぎめいぶん" },
  { text: "大胆不敵", ruby: "だいたんふてき" },
  { text: "二人三脚", ruby: "ににんさんきゃく" },
  { text: "白紙撤回", ruby: "はくしてっかい" },
  { text: "波瀾万丈", ruby: "はらんばんじょう" }
];

// Map genres to their word arrays
export const WORDS_BY_GENRE = {
  // ことわざ
  [CATEGORIES.KOTOWAZA]: KOTOWAZA_WORDS,

  // ビジネス用語
  [CATEGORIES.BUSINESS]: BUSINESS_WORDS,

  // クラウド genres
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

// Genres grouped by category
export const GENRES_BY_CATEGORY = {
  [CATEGORIES.KOTOWAZA]: [CATEGORIES.KOTOWAZA],
  [CATEGORIES.BUSINESS]: [CATEGORIES.BUSINESS],
  [CATEGORIES.CLOUD]: Object.values(CLOUD_GENRES),
};

export const ALL_WORDS = Object.values(WORDS_BY_GENRE).flat();

export function getRandomWord(genre = null) {
  const pool = genre && WORDS_BY_GENRE[genre] ? WORDS_BY_GENRE[genre] : ALL_WORDS;
  const index = Math.floor(Math.random() * pool.length);
  return pool[index];
}
