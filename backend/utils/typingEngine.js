export const ROMAJI_MAP = {
    'あ': ['a'], 'い': ['i'], 'う': ['u', 'wu'], 'え': ['e'], 'お': ['o'],
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

    // contractions
    'きゃ': ['kya'], 'きゅ': ['kyu'], 'きょ': ['kyo'],
    'しゃ': ['sha', 'sya'], 'しゅ': ['shu', 'syu'], 'しょ': ['sho', 'syo'],
    'ちゃ': ['cha', 'tya', 'cya'], 'ちゅ': ['chu', 'tyu', 'cyu'], 'ちょ': ['cho', 'tyo', 'cyo'],
    'にゃ': ['nya'], 'にゅ': ['nyu'], 'にょ': ['nyo'],
    'ひゃ': ['hya'], 'ひゅ': ['hyu'], 'ひょ': ['hyo'],
    'みゃ': ['mya'], 'みゅ': ['myu'], 'みょ': ['myo'],
    'りゃ': ['rya'], 'りゅ': ['ryu'], 'りょ': ['ryo'],

    'ぎゃ': ['gya'], 'ぎゅ': ['gyu'], 'ぎょ': ['gyo'],
    'じゃ': ['ja', 'jya', 'zya'], 'じゅ': ['ju', 'jyu', 'zyu'], 'じょ': ['jo', 'jyo', 'zyo'],
    'びゃ': ['bya'], 'びゅ': ['byu'], 'びょ': ['byo'],
    'ぴゃ': ['pya'], 'ぴゅ': ['pyu'], 'ぴょ': ['pyo'],
};

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

                let testNextOpt = ROMAJI_MAP[nextChar + (ruby[i + 2] || '')] ? ROMAJI_MAP[nextChar + (ruby[i + 2] || '')][0]
                    : (ROMAJI_MAP[nextChar] ? ROMAJI_MAP[nextChar][0] : null);

                if (testNextOpt && !['a', 'i', 'u', 'e', 'o'].includes(testNextOpt[0])) {
                    baseOpts.unshift(testNextOpt[0]); // the consonant to double
                }
                opts = baseOpts;
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

            nodes.push(opts);
            i += step;
        }
        return nodes;
    }

    _calcRemaining(overridePrefix = null) {
        if (this.isFinished()) return '';
        let res = '';

        // Handle current node
        let currentOpts = this.nodes[this.currentIndex];
        let prefix = overridePrefix !== null ? overridePrefix : this.typedNodePrefix;

        // Find best option matching what we typed so far
        let bestOpt = currentOpts.find(o => o.startsWith(prefix)) || currentOpts[0];
        res += bestOpt.substring(prefix.length);

        // Append rest
        for (let i = this.currentIndex + 1; i < this.nodes.length; i++) {
            res += this.nodes[i][0];
        }
        return res;
    }

    input(char) {
        if (this.isFinished()) return null;

        let nextPrefix = this.typedNodePrefix + char;
        let validOpts = this.nodes[this.currentIndex].filter(o => o.startsWith(nextPrefix));

        if (validOpts.length > 0) {
            // Correct input
            this.typedNodePrefix = nextPrefix;
            this.completedRomaji += char;

            let exactMatches = validOpts.filter(o => o === nextPrefix);
            if (exactMatches.length > 0) {
                let shouldAdvance = true;

                // Handling 'n' vs 'nn'
                if (nextPrefix === 'n' && validOpts.includes('nn')) {
                    if (this.currentIndex + 1 < this.nodes.length) {
                        let nextOpts = this.nodes[this.currentIndex + 1];
                        let needsNn = nextOpts.some(o => ['a', 'i', 'u', 'e', 'o', 'y'].includes(o[0]));
                        if (needsNn) {
                            shouldAdvance = false;
                        }
                    }
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
        return {
            typedRomaji: this.completedRomaji,
            targetRomaji: this.remainingRomajiCache,
            isFinished: this.isFinished()
        };
    }
}
