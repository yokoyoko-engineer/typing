// Validation script: scan all word data for text/ruby mismatches
// Run: node /tmp/validate_words.js

import { LINUX_BASIC, LINUX_STORAGE } from './backend/data/cloudWords1.js';
import { NETWORK_BASIC, WEB_SERVER } from './backend/data/cloudWords2.js';
import { APP_SERVER, DB_SERVER, DNS_WORDS } from './backend/data/cloudWords3.js';
import { MAIL_SERVER, NFS_WORDS, SECURITY_WORDS } from './backend/data/cloudWords4.js';
import { NON_FUNCTIONAL, SHELL_SCRIPT, ZABBIX_WORDS, ALB_WORDS } from './backend/data/cloudWords5.js';
import { NETWORK_ADV, L2_SWITCH, L3_SWITCH_ROUTER, BIGIP_WORDS, SRX_WORDS } from './backend/data/cloudWords6.js';
import { BUSINESS_WORDS } from './backend/data/businessWords.js';

const ROMAJI_MAP = {
    'あ': ['a'], 'い': ['i'], 'う': ['u'], 'え': ['e'], 'お': ['o'],
    'か': ['ka'], 'き': ['ki'], 'く': ['ku'], 'け': ['ke'], 'こ': ['ko'],
    'さ': ['sa'], 'し': ['shi','si'], 'す': ['su'], 'せ': ['se'], 'そ': ['so'],
    'た': ['ta'], 'ち': ['chi','ti'], 'つ': ['tsu','tu'], 'て': ['te'], 'と': ['to'],
    'な': ['na'], 'に': ['ni'], 'ぬ': ['nu'], 'ね': ['ne'], 'の': ['no'],
    'は': ['ha'], 'ひ': ['hi'], 'ふ': ['fu','hu'], 'へ': ['he'], 'ほ': ['ho'],
    'ま': ['ma'], 'み': ['mi'], 'む': ['mu'], 'め': ['me'], 'も': ['mo'],
    'や': ['ya'], 'ゆ': ['yu'], 'よ': ['yo'],
    'ら': ['ra'], 'り': ['ri'], 'る': ['ru'], 'れ': ['re'], 'ろ': ['ro'],
    'わ': ['wa'], 'を': ['wo'], 'ん': ['nn','n'],
    'が': ['ga'], 'ぎ': ['gi'], 'ぐ': ['gu'], 'げ': ['ge'], 'ご': ['go'],
    'ざ': ['za'], 'じ': ['ji','zi'], 'ず': ['zu'], 'ぜ': ['ze'], 'ぞ': ['zo'],
    'だ': ['da'], 'ぢ': ['di'], 'づ': ['du'], 'で': ['de'], 'ど': ['do'],
    'ば': ['ba'], 'び': ['bi'], 'ぶ': ['bu'], 'べ': ['be'], 'ぼ': ['bo'],
    'ぱ': ['pa'], 'ぴ': ['pi'], 'ぷ': ['pu'], 'ぺ': ['pe'], 'ぽ': ['po'],
    'ー': ['-'], 'っ': ['ltu'],
};

// Check 1: text has 「は」particle where ruby has が/を/etc mismatch
// Check 2: English words in text but hiragana approximation in ruby
// Check 3: text content and ruby content semantic mismatch

const ALL_DATASETS = {
    'LINUX_BASIC': LINUX_BASIC,
    'LINUX_STORAGE': LINUX_STORAGE,
    'NETWORK_BASIC': NETWORK_BASIC,
    'WEB_SERVER': WEB_SERVER,
    'APP_SERVER': APP_SERVER,
    'DB_SERVER': DB_SERVER,
    'DNS_WORDS': DNS_WORDS,
    'MAIL_SERVER': MAIL_SERVER,
    'NFS_WORDS': NFS_WORDS,
    'SECURITY_WORDS': SECURITY_WORDS,
    'NON_FUNCTIONAL': NON_FUNCTIONAL,
    'SHELL_SCRIPT': SHELL_SCRIPT,
    'ZABBIX_WORDS': ZABBIX_WORDS,
    'ALB_WORDS': ALB_WORDS,
    'NETWORK_ADV': NETWORK_ADV,
    'L2_SWITCH': L2_SWITCH,
    'L3_SWITCH_ROUTER': L3_SWITCH_ROUTER,
    'BIGIP_WORDS': BIGIP_WORDS,
    'SRX_WORDS': SRX_WORDS,
    'BUSINESS_WORDS': BUSINESS_WORDS,
};

let issues = [];

for (const [name, words] of Object.entries(ALL_DATASETS)) {
    words.forEach((w, idx) => {
        // Check: text contains English/command words but ruby uses hiragana approximation
        // Extract English words from text
        const englishInText = w.text.match(/[a-zA-Z][a-zA-Z0-9_.\/]+/g) || [];
        
        for (const eng of englishInText) {
            const engLower = eng.toLowerCase();
            // Check if this English word appears as-is in the ruby
            if (!w.ruby.includes(engLower)) {
                // Check for common hiragana approximations
                issues.push({
                    dataset: name,
                    index: idx,
                    type: 'ENGLISH_MISMATCH',
                    text: w.text,
                    ruby: w.ruby,
                    detail: `English "${eng}" in text not found as "${engLower}" in ruby`
                });
            }
        }

        // Check: text says は but ruby says が (particle mismatch)
        // Simple heuristic: count は in text vs ruby
        const textHiragana = w.text.replace(/[a-zA-Z0-9\s\(\)\/「」。、]/g, '');
        
        // Check ruby has valid hiragana + ascii only
        const invalidChars = w.ruby.match(/[ア-ン]/g);
        if (invalidChars) {
            issues.push({
                dataset: name,
                index: idx,
                type: 'KATAKANA_IN_RUBY',
                text: w.text,
                ruby: w.ruby,
                detail: `Katakana found in ruby: ${invalidChars.join(',')}`
            });
        }
        
        // Check: text and ruby are semantically different (different particles)
        // Detect cases where text says "で" but ruby says "に" etc
        const textParticles = w.text.match(/[はがをのにでとも]/g) || [];
        const rubyParticles = w.ruby.match(/[はがをのにでとも]/g) || [];
        
        if (textParticles.length !== rubyParticles.length) {
            // Only flag if significantly different
            if (Math.abs(textParticles.length - rubyParticles.length) > 2) {
                issues.push({
                    dataset: name,
                    index: idx,
                    type: 'PARTICLE_COUNT_MISMATCH',
                    text: w.text,
                    ruby: w.ruby,
                    detail: `Text particles: ${textParticles.length}, Ruby particles: ${rubyParticles.length}`
                });
            }
        }
    });
}

console.log(`\n=== Found ${issues.length} potential issues ===\n`);

// Group by type
const byType = {};
for (const issue of issues) {
    if (!byType[issue.type]) byType[issue.type] = [];
    byType[issue.type].push(issue);
}

for (const [type, typeIssues] of Object.entries(byType)) {
    console.log(`\n--- ${type} (${typeIssues.length} issues) ---`);
    for (const issue of typeIssues) {
        console.log(`[${issue.dataset}:${issue.index}]`);
        console.log(`  text: ${issue.text}`);
        console.log(`  ruby: ${issue.ruby}`);
        console.log(`  detail: ${issue.detail}`);
    }
}
