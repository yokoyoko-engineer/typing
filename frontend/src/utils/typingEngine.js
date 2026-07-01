export const ROMAJI_MAP = {
    'あ': ['a'], 'い': ['i'], 'う': ['u', 'wu', 'whu'], 'え': ['e'], 'お': ['o'],
    'か': ['ka', 'ca'], 'き': ['ki'], 'く': ['ku', 'cu', 'qu'], 'け': ['ke'], 'こ': ['ko', 'co'],
    'さ': ['sa'], 'し': ['shi', 'si', 'ci'], 'す': ['su'], 'せ': ['se', 'ce'], 'そ': ['so'],
    'た': ['ta'], 'ち': ['chi', 'ti'], 'つ': ['tsu', 'tu'], 'て': ['te'], 'と': ['to'],
    'な': ['na'], 'に': ['ni'], 'ぬ': ['nu'], 'ね': ['ne'], 'の': ['no'],
    'は': ['ha'], 'ひ': ['hi'], 'ふ': ['fu', 'hu'], 'へ': ['he'], 'ほ': ['ho'],
    'ま': ['ma'], 'み': ['mi'], 'む': ['mu'], 'め': ['me'], 'も': ['mo'],
    'や': ['ya'], 'ゆ': ['yu'], 'よ': ['yo'],
    'ら': ['ra'], 'り': ['ri'], 'る': ['ru'], 'れ': ['re'], 'ろ': ['ro'],
    'わ': ['wa'], 'を': ['wo'], 'ん': ['nn', 'n', "n'"],
    'が': ['ga'], 'ぎ': ['gi'], 'ぐ': ['gu'], 'げ': ['ge'], 'ご': ['go'],
    'ざ': ['za'], 'じ': ['ji', 'zi'], 'ず': ['zu'], 'ぜ': ['ze'], 'ぞ': ['zo'],
    'だ': ['da'], 'ぢ': ['di', 'zi'], 'づ': ['du', 'zu'], 'で': ['de'], 'ど': ['do'],
    'ば': ['ba'], 'び': ['bi'], 'ぶ': ['bu'], 'べ': ['be'], 'ぼ': ['bo'],
    'ぱ': ['pa'], 'ぴ': ['pi'], 'ぷ': ['pu'], 'ぺ': ['pe'], 'ぽ': ['po'],

    // small vowels
    'ぁ': ['la', 'xa'], 'ぃ': ['li', 'xi'], 'ぅ': ['lu', 'xu'], 'ぇ': ['le', 'xe'], 'ぉ': ['lo', 'xo'],
    'ゃ': ['lya', 'xya'], 'ゅ': ['lyu', 'xyu'], 'ょ': ['lyo', 'xyo'],
    'っ': ['ltsu', 'xtsu', 'ltu', 'xtu'],
    'ー': ['-'],
    'ゎ': ['lwa', 'xwa'],

    // contractions
    'きゃ': ['kya'], 'きぃ': ['kyi'], 'きゅ': ['kyu'], 'きぇ': ['kye'], 'きょ': ['kyo'],
    'しゃ': ['sha', 'sya'], 'しぃ': ['syi'], 'しゅ': ['shu', 'syu'], 'しぇ': ['she', 'sye'], 'しょ': ['sho', 'syo'],
    'ちゃ': ['cha', 'tya', 'cya'], 'ちぃ': ['tyi', 'cyi'], 'ちゅ': ['chu', 'tyu', 'cyu'], 'ちぇ': ['che', 'tye', 'cye'], 'ちょ': ['cho', 'tyo', 'cyo'],
    'にゃ': ['nya'], 'にぃ': ['nyi'], 'にゅ': ['nyu'], 'にぇ': ['nye'], 'にょ': ['nyo'],
    'ひゃ': ['hya'], 'ひぃ': ['hyi'], 'ひゅ': ['hyu'], 'ひぇ': ['hye'], 'ひょ': ['hyo'],
    'みゃ': ['mya'], 'みぃ': ['myi'], 'みゅ': ['myu'], 'みぇ': ['mye'], 'みょ': ['myo'],
    'りゃ': ['rya'], 'りぃ': ['ryi'], 'りゅ': ['ryu'], 'りぇ': ['rye'], 'りょ': ['ryo'],

    'ぎゃ': ['gya'], 'ぎぃ': ['gyi'], 'ぎゅ': ['gyu'], 'ぎぇ': ['gye'], 'ぎょ': ['gyo'],
    'じゃ': ['ja', 'jya', 'zya'], 'じぃ': ['jyi', 'zyi'], 'じゅ': ['ju', 'jyu', 'zyu'], 'じぇ': ['je', 'jye', 'zye'], 'じょ': ['jo', 'jyo', 'zyo'],
    'ぢゃ': ['dya', 'ja', 'jya', 'zya'], 'ぢぃ': ['dyi'], 'ぢゅ': ['dyu', 'ju', 'jyu', 'zyu'], 'ぢぇ': ['dye'], 'ぢょ': ['dyo', 'jo', 'jyo', 'zyo'],
    'びゃ': ['bya'], 'びぃ': ['byi'], 'びゅ': ['byu'], 'びぇ': ['bye'], 'びょ': ['byo'],
    'ぴゃ': ['pya'], 'ぴぃ': ['pyi'], 'ぴゅ': ['pyu'], 'ぴぇ': ['pye'], 'ぴょ': ['pyo'],

    'ふぁ': ['fa', 'fwa'], 'ふぃ': ['fi', 'fwi', 'fyi'], 'ふぇ': ['fe', 'fwe', 'fye'], 'ふぉ': ['fo', 'fwo'],
    'くぁ': ['qa', 'qwa', 'kwa'], 'くぃ': ['qi', 'qwi', 'qyi'], 'くぅ': ['qu'], 'くぇ': ['qe', 'qwe', 'qye'], 'くぉ': ['qo', 'qwo'],
    'ぐぁ': ['gwa'], 'ぐぃ': ['gwi'], 'ぐぅ': ['gwu'], 'ぐぇ': ['gwe'], 'ぐぉ': ['gwo'],
    'すぁ': ['swa'], 'すぃ': ['swi'], 'すぅ': ['swu'], 'すぇ': ['swe'], 'すぉ': ['swo'],
    'つぁ': ['tsa'], 'つぃ': ['tsi'], 'つぇ': ['tse'], 'つぉ': ['tso'],
    'てゃ': ['tha'], 'てぃ': ['thi'], 'てゅ': ['thu'], 'てぇ': ['the'], 'てょ': ['tho'],
    'でゃ': ['dha'], 'でぃ': ['dhi'], 'でゅ': ['dhu'], 'でぇ': ['dhe'], 'でょ': ['dho'],
    'とぁ': ['twa'], 'とぃ': ['twi'], 'とぅ': ['twu'], 'とぇ': ['twe'], 'とぉ': ['two'],
    'どぁ': ['dwa'], 'どぃ': ['dwi'], 'どぅ': ['dwu'], 'どぇ': ['dwe'], 'どぉ': ['dwo'],
    'うぁ': ['wha'], 'うぃ': ['wi', 'whi'], 'うぇ': ['we', 'whe'], 'うぉ': ['who'],
    'ゔぁ': ['va'], 'ゔぃ': ['vi'], 'ゔ': ['vu'], 'ゔぇ': ['ve'], 'ゔぉ': ['vo'],
    'ゔゃ': ['vya'], 'ゔゅ': ['vyu'], 'ゔょ': ['vyo']
};

export const KANJI_SPLIT_MAP = {
    // ビジネス用語
    '一旦持': ['いっ', 'たん', 'も'],
    '上記': ['じょう', 'き'],
    '不安定': ['ふ', 'あん', 'てい'],
    '不明点': ['ふ', 'めい', 'てん'],
    '世話': ['せ', 'わ'],
    '了承': ['りょう', 'しょう'],
    '了解': ['りょう', 'かい'],
    '五分': ['ご', 'ふん'],
    '今後': ['こん', 'ご'],
    '付与': ['ふ', 'よ'],
    '以上': ['い', 'じょう'],
    '休暇': ['きゅう', 'か'],
    '何卒': ['なに', 'とぞ'],
    '先日': ['せん', 'じつ'],
    '共有': ['きょう', 'ゆう'],
    '再発防止': ['さい', 'はつ', 'ぼう', 'し'],
    '力添': ['ちから', 'ぞ'],
    '参加': ['さん', 'か'],
    '参考': ['さん', 'こう'],
    '可能': ['か', 'のう'],
    '問題': ['もん', 'だい'],
    '回線': ['かい', 'せん'],
    '在席': ['ざい', 'せき'],
    '報告': ['ほう', 'こく'],
    '外出': ['がい', 'しゅつ'],
    '多忙中恐': ['た', 'ぼう', 'ちゅう', 'おそ'],
    '大変恐縮': ['たい', 'へん', 'きょう', 'しゅく'],
    '失礼': ['しつ', 'れい'],
    '完了': ['かん', 'りょう'],
    '対応': ['たい', 'おう'],
    '対応完了': ['たい', 'おう', 'かん', 'りょう'],
    '手数': ['て', 'すう'],
    '承知': ['しょう', 'ち'],
    '投稿': ['とう', 'こう'],
    '教示': ['きょう', 'じ'],
    '日時': ['にち', 'じ'],
    '早速': ['さっ', 'そく'],
    '時間': ['じ', 'かん'],
    '期待': ['き', 'たい'],
    '本日': ['ほん', 'じつ'],
    '本日中': ['ほん', 'じつ', 'ちゅう'],
    '査収': ['さ', 'しゅう'],
    '案内': ['あん', 'ない'],
    '検討': ['けん', 'とう'],
    '権限': ['けん', 'げん'],
    '気軽': ['き', 'がる'],
    '気遣': ['き', 'づか'],
    '猛省': ['もう', 'せい'],
    '環境': ['かん', 'きょう'],
    '画面共有': ['が', 'めん', 'きょう', 'ゆう'],
    '画面見': ['が', 'めん', 'み'],
    '相談': ['そう', 'だん'],
    '確認': ['かく', 'にん'],
    '確認次第': ['かく', 'にん', 'し', 'だい'],
    '背景': ['はい', 'けい'],
    '至急': ['し', 'きゅう'],
    '見送': ['み', 'おく'],
    '言葉': ['こと', 'ば'],
    '認識': ['にん', 'しき'],
    '調子': ['ちょう', 'し'],
    '調整': ['ちょう', 'せい'],
    '議事録': ['ぎ', 'じ', 'ろく'],
    '足労': ['そ', 'くろう'],
    '辞退申': ['じ', 'たい', 'もう'],
    '返事': ['へん', 'じ'],
    '返信': ['へん', 'しん'],
    '迷惑': ['めい', 'わく'],
    '連携': ['れん', 'けい'],
    '連絡': ['れん', 'らく'],
    '進捗': ['しん', 'ちょく'],
    '道中': ['どう', 'ちゅう'],
    '都合': ['つ', 'ごう'],
    '離席': ['り', 'せき'],
    '音声途切': ['おん', 'せい', 'と', 'ぎ'],

    // ことわざ
    '一石二鳥': ['いっ', 'せき', 'に', 'ちょう'],
    '三年': ['さん', 'ねん'],
    '温故知新': ['おん', 'こ', 'ち', 'しん'],
    '以心伝心': ['い', 'しん', 'でん', 'しん'],
    '一期一会': ['いち', 'ご', 'いち', 'え'],
    '油断大敵': ['ゆ', 'だん', 'たい', 'てき'],
    '臨機応変': ['りん', 'き', 'おう', 'へん'],
    '起死回生': ['き', 'し', 'かい', 'せい'],
    '自業自得': ['じ', 'ごう', 'じ', 'とく'],
    '弱肉強食': ['じゃく', 'にく', 'きょう', 'しょく'],
    '本末転倒': ['ほん', 'まつ', 'てん', 'とう'],
    '電光石火': ['でん', 'こう', 'せっ', 'か'],
    '有言実行': ['ゆう', 'げん', 'じっ', 'こう'],
    '絶体絶命': ['ぜっ', 'たい', 'ぜつ', 'めい'],
    '波瀾万丈': ['は', 'らん', 'ばん', 'じょう']
};

export function alignTextAndRuby(text, ruby) {
    if (!text || !ruby) return [];
    let chunks = [];
    let textChunks = [];
    let currentType = null;
    let currentStr = '';

    const isHiragana = (char) => /^[\u3040-\u309F\u30FC]+$/.test(char);

    for (let char of text) {
        let type = isHiragana(char) ? 'H' : 'N';
        if (type !== currentType) {
            if (currentStr) textChunks.push({ type: currentType, text: currentStr });
            currentType = type;
            currentStr = char;
        } else {
            currentStr += char;
        }
    }
    if (currentStr) textChunks.push({ type: currentType, text: currentStr });

    let rubyIdx = 0;
    for (let chunk of textChunks) {
        if (chunk.type === 'H') {
            let matchIdx = ruby.indexOf(chunk.text, rubyIdx);
            if (matchIdx === -1) {
                return [{ text, ruby }]; // Fallback
            }
            let prevRuby = ruby.substring(rubyIdx, matchIdx);
            if (prevRuby && chunks.length > 0) {
                let lastChunk = chunks[chunks.length - 1];
                if (lastChunk.type === 'N') {
                    lastChunk.ruby = prevRuby;
                }
            }
            chunks.push({ type: 'H', text: chunk.text, ruby: chunk.text });
            rubyIdx = matchIdx + chunk.text.length;
        } else {
            chunks.push({ type: 'N', text: chunk.text, ruby: '' });
        }
    }
    
    if (rubyIdx < ruby.length) {
        if (chunks.length > 0) {
            chunks[chunks.length - 1].ruby += ruby.substring(rubyIdx);
        } else {
            chunks.push({ type: 'N', text: '', ruby: ruby.substring(rubyIdx) });
        }
    }

    // Apply KANJI_SPLIT_MAP to split multi-character N chunks for precise alignment
    let finalChunks = [];
    for (let chunk of chunks) {
        if (chunk.type === 'N' && chunk.text.length >= 2 && KANJI_SPLIT_MAP[chunk.text]) {
            let rubies = KANJI_SPLIT_MAP[chunk.text];
            if (rubies.length === chunk.text.length) {
                for (let i = 0; i < chunk.text.length; i++) {
                    finalChunks.push({
                        type: 'N',
                        text: chunk.text[i],
                        ruby: rubies[i]
                    });
                }
                continue;
            }
        }
        finalChunks.push(chunk);
    }

    return finalChunks;
}


const NA_LINE_FIRST_CHARS = new Set(['な', 'に', 'ぬ', 'ね', 'の', 'ナ', 'ニ', 'ヌ', 'ネ', 'ノ']);
const A_YA_CHARS = new Set([
    'あ', 'い', 'う', 'え', 'お',
    'ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ',
    'や', 'ゆ', 'よ',
    'ゃ', 'ゅ', 'ょ',
    'ア', 'イ', 'ウ', 'エ', 'オ',
    'ァ', 'ィ', 'ゥ', 'ェ', 'ォ',
    'ヤ', 'ユ', 'ヨ',
    'ャ', 'ュ', 'ョ'
]);

const NUMBER_MAP = {
    '0': ['ぜろ', 'れい', 'まる'],
    '1': ['いち'],
    '2': ['に'],
    '3': ['さん'],
    '4': ['よん', 'し'],
    '5': ['ご'],
    '6': ['ろく'],
    '7': ['なな', 'しち'],
    '8': ['はち'],
    '9': ['きゅう', 'く'],
    '10': ['じゅう'],
    '100': ['ひゃく'],
    '1000': ['せん']
};

export class TypingSession {
    constructor(ruby, text = null) {
        this.ruby = ruby;
        this.text = text;
        this.numberOptions = this._extractNumberOptions(text);
        this.nodes = this._buildNodes(ruby);
        this.currentIndex = 0;
        this.typedNodePrefix = '';

        // overall state tracking for UI
        this.completedRomaji = '';
        this.remainingRomajiCache = this._calcRemaining();
    }

    _extractNumberOptions(text) {
        if (!text) return null;
        const opts = {};
        let hasNum = false;
        for (const [digit, rubies] of Object.entries(NUMBER_MAP)) {
            if (text.includes(digit)) {
                hasNum = true;
                for (const rubyStr of rubies) {
                    if (!opts[rubyStr]) opts[rubyStr] = [];
                    opts[rubyStr].push(digit);
                }
            }
        }
        return hasNum ? opts : null;
    }

    _getRomajiCombos(rubyStr) {
        let subNodes = this._buildNodes(rubyStr, true);
        let paths = [''];
        for (let node of subNodes) {
            let newPaths = [];
            for (let p of paths) {
                for (let o of node.opts) {
                    newPaths.push(p + o);
                }
            }
            paths = newPaths;
        }
        return paths;
    }

    _buildNodes(ruby, ignoreNumbers = false) {
        let nodes = [];
        let i = 0;
        while (i < ruby.length) {
            let char = ruby[i];
            let nextChar = ruby[i + 1] || '';
            let nextNextChar = ruby[i + 2] || '';

            let opts = [];
            let step = 1;

            if (!ignoreNumbers && this.numberOptions) {
                let matchedNum = false;
                for (let len = 3; len >= 1; len--) {
                    if (i + len > ruby.length) continue;
                    let slice = ruby.substring(i, i + len);
                    if (this.numberOptions[slice]) {
                        step = len;
                        let combos = this._getRomajiCombos(slice);
                        opts = [...this.numberOptions[slice], ...combos];
                        matchedNum = true;
                        break;
                    }
                }
                if (matchedNum) {
                    nodes.push({ opts, chars: ruby.substring(i, i + step) });
                    i += step;
                    continue;
                }
            }

            // 1. Check for sokuon doubling (っ + consonant)
            if (char === 'っ' && nextChar && nextChar !== 'っ') {
                let baseOpts = [...ROMAJI_MAP['っ']]; // fallback ltu, xtu

                let nextOpts = ROMAJI_MAP[nextChar + nextNextChar] 
                    ? ROMAJI_MAP[nextChar + nextNextChar] 
                    : (ROMAJI_MAP[nextChar] ? ROMAJI_MAP[nextChar] : []);

                let consonants = [];
                for (let opt of nextOpts) {
                    if (opt && !['a', 'i', 'u', 'e', 'o'].includes(opt[0]) && !consonants.includes(opt[0])) {
                        consonants.push(opt[0]);
                    }
                }
                
                opts = [...consonants, ...baseOpts];
            }
            // 1.5 ん + な行の複合ノード化
            else if (char === 'ん' && nextChar && NA_LINE_FIRST_CHARS.has(nextChar)) {
                let naChars = nextChar;
                let naOpts = [];
                let naStep = 1;

                if (nextNextChar && ROMAJI_MAP[nextChar + nextNextChar]) {
                    naChars = nextChar + nextNextChar;
                    naOpts = [...ROMAJI_MAP[naChars]];
                    naStep = 2;
                } else if (ROMAJI_MAP[nextChar]) {
                    naOpts = [...ROMAJI_MAP[nextChar]];
                }

                if (naOpts.length > 0) {
                    let combinedOpts = [];
                    for (let opt of naOpts) {
                        combinedOpts.push('n' + opt);
                        combinedOpts.push('nn' + opt);
                        combinedOpts.push("n'" + opt);
                    }
                    nodes.push({ opts: combinedOpts, chars: char + naChars });
                    i += 1 + naStep;
                    continue;
                }
            }
            // 2. Check for yoon (2 chars combined)
            else if (nextChar && ROMAJI_MAP[char + nextChar]) {
                opts = [...ROMAJI_MAP[char + nextChar]];
                step = 2; // consumed 2 chars
            }
            // 3. Single char
            else if (char === 'ん') {
                if (nextChar && A_YA_CHARS.has(nextChar)) {
                    opts = ['nn', "n'"];
                } else {
                    opts = ['nn', 'n', "n'"];
                }
            }
            else if (ROMAJI_MAP[char]) {
                opts = [...ROMAJI_MAP[char]];
            }
            // 4. Default / unknown (space etc)
            else {
                opts = [char];
            }

            nodes.push({ opts, chars: ruby.substring(i, i + step) });
            i += step;
        }
        return nodes;
    }

    _calcRemaining(overridePrefix = null) {
        if (this.isFinished()) return '';
        let res = '';

        // Handle current node
        let currentOpts = this.nodes[this.currentIndex].opts;
        let prefix = overridePrefix !== null ? overridePrefix : this.typedNodePrefix;

        // Find best option matching what we typed so far
        let bestOpt = currentOpts.find(o => o.startsWith(prefix)) || currentOpts[0];
        res += bestOpt.substring(prefix.length);

        // Append rest
        for (let i = this.currentIndex + 1; i < this.nodes.length; i++) {
            if (this.nodes[i].chars === 'ん') {
                if (i + 1 < this.nodes.length) {
                    let nextOpts = this.nodes[i + 1].opts;
                    let needsNn = nextOpts.some(o => ['a', 'i', 'u', 'e', 'o', 'y', 'n'].includes(o[0]));
                    res += needsNn ? 'nn' : 'n';
                } else {
                    res += 'n';
                }
            } else {
                res += this.nodes[i].opts[0];
            }
        }
        return res;
    }

    input(char) {
        if (this.isFinished()) return null;

        let currentNode = this.nodes[this.currentIndex];
        let nextPrefix = this.typedNodePrefix + char;
        let validOpts = currentNode.opts.filter(o => o.startsWith(nextPrefix));

        if (validOpts.length > 0) {
            // Correct input
            this.typedNodePrefix = nextPrefix;
            this.completedRomaji += char;

            let exactMatches = validOpts.filter(o => o === nextPrefix);
            if (exactMatches.length > 0) {
                let shouldAdvance = true;

                // Handling 'n' vs 'nn'
                if (nextPrefix === 'n' && validOpts.includes('nn')) {
                    shouldAdvance = false;
                }

                // Single consonant from sokuon logic e.g. "k"
                if (nextPrefix.length === 1 && validOpts.length > 1 && !['n', 'n\''].includes(nextPrefix)) {
                    // If we matched the doubled consonant "k", we DO advance
                }

                if (shouldAdvance) {
                    this.currentIndex++;
                    this.typedNodePrefix = '';
                    this.remainingRomajiCache = this._calcRemaining();
                    return { success: true, finishedWord: this.isFinished() };
                }
            }

            this.remainingRomajiCache = this._calcRemaining();
            return { success: true, finishedWord: false };
        }

        // Special handling for 'n' followed by non-vowel/non-y/non-n consonant.
        // If current node is 'ん', we have already typed 'n' (typedNodePrefix === 'n'),
        // and the next char doesn't match any option of 'ん' (e.g. 'k' in 'kankei'),
        // and the next node is NOT an "a/na/ya" line node,
        // and the typed char is a valid start for the next node:
        // then we auto-complete 'ん' with a single 'n' and apply the char to the next node.
        if (currentNode.chars === 'ん' && this.typedNodePrefix === 'n') {
            const nextNode = this.nodes[this.currentIndex + 1];
            if (nextNode) {
                const firstChar = nextNode.chars[0];
                const isAnaya = A_YA_CHARS.has(firstChar) || NA_LINE_FIRST_CHARS.has(firstChar);
                if (!isAnaya) {
                    const nextValidOpts = nextNode.opts.filter(o => o.startsWith(char));
                    if (nextValidOpts.length > 0) {
                        // Advance 'ん' node
                        this.currentIndex++;
                        this.typedNodePrefix = '';
                        // Process the char for the next node
                        return this.input(char);
                    }
                }
            }
        }

        return { success: false, finishedWord: false };
    }

    isFinished() {
        return this.currentIndex >= this.nodes.length;
    }

    // Use property getters to easily fetch current mapped status
    get state() {
        let typedRuby = '';
        let targetRuby = '';
        for (let i = 0; i < this.nodes.length; i++) {
            if (i < this.currentIndex) {
                typedRuby += this.nodes[i].chars;
            } else {
                targetRuby += this.nodes[i].chars;
            }
        }

        return {
            typedRomaji: this.completedRomaji,
            targetRomaji: this.remainingRomajiCache,
            typedRuby: typedRuby,
            targetRuby: targetRuby,
            isFinished: this.isFinished()
        };
    }
}

export function getEvaluationLevel(score) {
    const s = Number(score);
    if (isNaN(s)) return '-';
    
    if (s >= 750) return 'Godhand';
    if (s >= 700) return 'Jedi';
    if (s >= 650) return 'Tatujin';
    if (s >= 600) return 'Rocket';
    if (s >= 550) return 'Meijin';
    if (s >= 500) return 'EddieVH';
    if (s >= 450) return 'LaserBeam';
    if (s >= 400) return 'Professor';
    if (s >= 375) return 'Comet';
    if (s >= 350) return 'Ninja';
    if (s >= 325) return 'Thunder';
    if (s >= 300) return 'Fast';
    if (s >= 277) return 'Good!';
    if (s >= 260) return 'S';
    if (s >= 243) return 'A+';
    if (s >= 226) return 'A';
    if (s >= 209) return 'A-';
    if (s >= 192) return 'B+';
    if (s >= 175) return 'B';
    if (s >= 158) return 'B-';
    if (s >= 141) return 'C+';
    if (s >= 124) return 'C';
    if (s >= 107) return 'C-';
    if (s >= 90) return 'D+';
    return 'D';
}
