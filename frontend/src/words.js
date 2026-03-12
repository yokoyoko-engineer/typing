export const WORDS = [
    { text: "猿も木から落ちる", ruby: "さるもきからおちる", romaji: "sarumokikaraochiru" },
    { text: "犬も歩けば棒に当たる", ruby: "いぬもあるけばぼうにあたる", romaji: "inumoarukebabouniataru" },
    { text: "豚に真珠", ruby: "ぶたにしんじゅ", romaji: "butanishinju" },
    { text: "猫に小判", ruby: "ねこにこばん", romaji: "nekonikoban" },
    { text: "石の上にも三年", ruby: "いしのうえにもさんねん", romaji: "ishinouenimosannen" },
    { text: "急がば回れ", ruby: "いそがばまわれ", romaji: "isogabamaware" },
    { text: "塵も積もれば山となる", ruby: "ちりもつもればやまとなる", romaji: "cirimotsumorebayamatonaru" },
    { text: "能ある鷹は爪を隠す", ruby: "のうあるたかはつめをかくす", romaji: "nouarutakahatsumewokakusu" },
    { text: "花より団子", ruby: "はなよりだんご", romaji: "hanayoridango" },
    { text: "笑う門には福来たる", ruby: "わらうかどにはふくきたる", romaji: "waraukadonihafukukitaru" },
    { text: "一石二鳥", ruby: "いっせきにちょう", romaji: "issekinichou" },
    { text: "五十歩百歩", ruby: "ごじっぽひゃっぽ", romaji: "gojippohyappo" },
    { text: "三日坊主", ruby: "みっかぼうず", romaji: "mikkabouzu" },
    { text: "七転び八起き", ruby: "ななころびやおき", romaji: "nanakorobiyaoki" },
    { text: "十人十色", ruby: "じゅうにんといろ", romaji: "juunintoiro" },
    { text: "百聞は一見に如かず", ruby: "ひゃくぶんはいっけんにしかず", romaji: "hyakubunhaikkennishikazu" },
    { text: "壁に耳あり障子に目あり", ruby: "かべにみみありしょうじにめあり", romaji: "kabenimimiarishoujinimeari" },
    { text: "継続は力なり", ruby: "けいぞくはちからなり", romaji: "keizokuhachikaranari" },
    { text: "井の中の蛙大海を知らず", ruby: "いのなかのからずたいかいをしらず", romaji: "inonakanokawazutaikaiwoshirazu" },
    { text: "青天の霹靂", ruby: "せいてんのへきれき", romaji: "seitennohekireki" }
];

export function getRandomWord() {
    const index = Math.floor(Math.random() * WORDS.length);
    return WORDS[index];
}
