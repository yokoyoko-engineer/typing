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

    return chunks;
}

export class TypingSession {
    constructor(ruby) {
        this.ruby = ruby;
        this.nodes = this._buildNodes(ruby);
        this.currentIndex = 0;
        this.typedNodePrefix = '';

        // overall state tracking for UI
        this.completedRomaji = '';
        this.remainingRomajiCache = this._calcRemaining();
    }

    _buildNodes(ruby) {
        let nodes = [];
        let i = 0;
        while (i < ruby.length) {
            let char = ruby[i];
            let nextChar = ruby[i + 1];

            let opts = [];
            let step = 1;

            // 1. Check for sokuon doubling (っ + consonant)
            if (char === 'っ' && nextChar && nextChar !== 'っ') {
                let baseOpts = [...ROMAJI_MAP['っ']]; // fallback ltu, xtu

                let nextOpts = ROMAJI_MAP[nextChar + (ruby[i + 2] || '')] 
                    ? ROMAJI_MAP[nextChar + (ruby[i + 2] || '')] 
                    : (ROMAJI_MAP[nextChar] ? ROMAJI_MAP[nextChar] : []);

                let consonants = [];
                for (let opt of nextOpts) {
                    if (opt && !['a', 'i', 'u', 'e', 'o'].includes(opt[0]) && !consonants.includes(opt[0])) {
                        consonants.push(opt[0]);
                    }
                }
                
                opts = [...consonants, ...baseOpts];
            }
            // 2. Check for yoon (2 chars combined)
            else if (nextChar && ROMAJI_MAP[char + nextChar]) {
                opts = [...ROMAJI_MAP[char + nextChar]];
                step = 2; // consumed 2 chars
            }
            // 3. Single char
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
                if (this.currentIndex + 1 < this.nodes.length) {
                    let nextOpts = this.nodes[this.currentIndex + 1].opts;
                    let needsNn = nextOpts.some(o => ['a', 'i', 'u', 'e', 'o', 'y'].includes(o[0]));
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

        let nextPrefix = this.typedNodePrefix + char;
        let validOpts = this.nodes[this.currentIndex].opts.filter(o => o.startsWith(nextPrefix));

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
