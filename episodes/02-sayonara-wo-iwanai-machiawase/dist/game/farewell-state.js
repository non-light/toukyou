// Episode two owns its story and progress independently of the ticket episode.
// Coordinates describe the authored walkable model, not the real station.
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};

export const EPISODE=freeze({
  id:'farewell-meeting-v1',
  title:'さよならを言わない待ち合わせ',
  subtitle:'第2作 · 紬と晴の最後の宝探し',
  description:'東京を離れる幼なじみの晴から届いた、最後の宝探し。紬と一緒に写真と短いメッセージを読み解き、晴の待つ場所へ。',
  duration:'20〜30分',
  difficulty:'やさしい謎解き',
  protagonist:'紬〈つむぎ〉',
});

export const SPOTS=freeze([
  {id:'driving-wheels',zoneId:'driving-wheels',title:'動輪の広場',floor:'B1F',x:-51,z:7,modelX:-57,modelZ:19},
  {id:'station-postbox',zoneId:'station-postbox',title:'赤レンガ駅舎型ポスト',floor:'1F',x:-24,z:-2.5,modelX:-24,modelZ:4.6},
  {id:'platform-tokaido-1415',zoneId:'platform-tokaido-1415',title:'東海道・山陽新幹線 14・15番線',floor:'2F',x:56,z:-40.6,region:{minX:52.7,maxX:59.3,minZ:-42,maxZ:42}},
  {id:'square-zero',zoneId:'square-zero',title:'SQUARE ZERO',floor:'B1F',x:2,z:-3,modelX:2,modelZ:-19},
  {id:'silver-bell',zoneId:'silver-bell',title:'銀の鈴',floor:'B1F',x:34,z:10,modelX:34,modelZ:17},
]);

export const PUZZLES=freeze([
  {
    id:'photo',title:'最初の一枚',photoId:'driving-wheels',
    message:'今日の待ち合わせは、最後の宝探し。\n最初はこの写真。もう走らない「旅の足」が並んでいる場所へ。',
    question:'写真の場所を選んでください。',
    options:[
      {id:'station-postbox',title:'赤レンガ駅舎型ポスト'},
      {id:'silver-bell',title:'銀の鈴'},
      {id:'driving-wheels',title:'動輪の広場'},
      {id:'square-zero',title:'SQUARE ZERO'},
    ],
    hints:[
      '写真に並んでいる、丸い形を見てみましょう。',
      '大きな車輪が三つ、横一列に並んでいます。',
      '答えは「動輪の広場」。B1Fの丸の内地下南口側にあります。',
    ],
    successText:'最初の場所は、B1Fの「動輪の広場」。近くで写真をもう一度開いてみよう。',
    tsumugi:'相変わらず、回りくどい。……いつもの待ち合わせ、みたい。',
    haru:'最初の一枚、分かった？ 次は、そこで数えてみて。',
  },
  {
    id:'third-letter',title:'三つの思い出',photoId:'driving-wheels',
    message:'昔、二人で書いたメモ。\n散歩して、アイスを食べて、ノートにハートを描いた日。覚えてる？',
    question:'目の前に並ぶ、大きな車輪はいくつ？\nその数と同じ番目の文字を、それぞれの言葉の左から一文字ずつ拾い、上から読んでください。',
    lines:['さんぽ','あいす','はあと'],
    hints:[
      '動輪の広場の、大きな車輪を数えます。写真でも確かめられます。',
      '車輪は三つ。それぞれの言葉の、左から三文字目を読みましょう。',
      '「さんぽ」の「ぽ」、「あいす」の「す」、「はあと」の「と」。答えは「ぽすと」です。',
    ],
    successText:'次は1F、丸の内中央口側の「赤レンガ駅舎型ポスト」。',
    tsumugi:'そんなメモまで、まだ持ってたんだ。……遠くても、メッセージくらい送れるしね。',
    haru:'ポストの写真も送る。小さな駅舎の形を探してね。',
  },
  {
    id:'departure-place',title:'出発する場所',photoId:'station-postbox',
    message:'ポストまで来たら、少しだけ上へ。\n僕が今日乗る列車のところにも、君に見ておいてほしい景色がある。まだ出発しないから、安心して。',
    question:'三つの言葉の「最後の二文字」を、それぞれ拾ってください。上からつなぐと、僕が乗る乗り物の名前になります。',
    lines:['しゃしん','じかん','ろせん'],
    hints:[
      '今度は言葉の終わりを見ます。一つの言葉から、二文字ずつ拾ってみましょう。',
      '「しゃしん」は「しん」、「じかん」は「かん」、「ろせん」は「せん」です。上から順につなぎます。',
      '答えは「しんかんせん」。次は東海道・山陽側の14・15番線。1FからM2Fの中間階を通り、2Fホームへ上がりましょう。',
    ],
    successText:'次は2Fの「東海道・山陽新幹線 14・15番線」。1FからM2Fの中間階を通って、ホームへ。',
    tsumugi:'晴を遠くへ運ぶ電車。……でも、帰ってくるときもここなんだ。',
    haru:'ホームの場所を確かめたら、次のメッセージを開いて。僕の待つ場所は、最後の謎の答えにしておく。',
  },
  {
    id:'first-letters',title:'言葉のはじめ',photoId:'platform-tokaido-1415',
    message:'長く書くと、照れくさいから。\n次の場所は、いつものルールで。「はじめの一文字」だけ、拾って。',
    question:'六行それぞれの、はじめの一文字を上から読んでください。次の場所の名前になります。',
    lines:[
      'すこし早く着いた。',
      'くせで、君の分までベンチを空けた。',
      'えきって、こんなに広かったっけ。',
      'あしたからは、返事が少し遅れるかも。',
      'ぜんぶ片づいたら、連絡するよ。',
      'ろくでもない冗談も、また送る。',
    ],
    hints:[
      '文の意味とは別に、行のはじめを見てみましょう。',
      '一行目は「す」、二行目は「く」。一文字ずつ、上からつなぎます。',
      '「す・く・え・あ・ぜ・ろ」。次はB1Fの「SQUARE ZERO」です。',
    ],
    successText:'次はB1Fの「SQUARE ZERO」。三本の光の柱が目印。',
    tsumugi:'返事が、少し遅れる。……今までみたいには、いかないんだ。',
    haru:'最後の問題は、三本の光のそばに着いたら開いて。',
  },
  {
    id:'unspoken-goodbye',title:'言わない四文字',photoId:'square-zero',
    message:'今日は、まだ「さよなら」を言わない。\n最後の待ち合わせは、残った言葉のところ。',
    question:'文字盤から「さ・よ・な・ら」を一つずつ消してください。\n残った文字を、上の行から順に、各行の左から右へ読んでください。',
    grid:[['さ','ぎ','よ'],['ん','な','の'],['ら','す','ず']],
    hints:[
      '消すのは「さよなら」の四文字だけです。残った文字を読みます。',
      '上の行には「ぎ」、真ん中の行には「ん」「の」、下の行には「す」「ず」が残ります。',
      '残った五文字は「ぎんのすず」。晴が待つのは、B1Fの「銀の鈴」です。',
    ],
    successText:'最後の待ち合わせは、B1Fの「銀の鈴」。晴に会いに行こう。',
    tsumugi:'分かっちゃった。……まだ、分からないふりをしていたかった。',
    haru:'ここで待ってる。急がなくていいよ。',
  },
]);

export const ENDING=freeze([
  {speaker:'晴',text:'見つけた。……って、それはこっちの台詞か。'},
  {speaker:'紬',text:'最後まで、回りくどいんだから。'},
  {speaker:'晴',text:'いつもの待ち合わせ、できてよかった。'},
  {speaker:'紬',text:'……晴。'},
  {speaker:'紬',text:'寂しいよ。でも、帰ってきたら一番に連絡して'},
  {speaker:'晴',text:'うん。帰ってきたら、一番に。約束。'},
  {speaker:'紬',text:'いつかまた、銀の鈴の下で。'},
  {speaker:'晴',text:'その言い方、おばあちゃんそっくり'},
]);

const answerAliases=freeze([
  ['driving-wheels','動輪の広場','どうりんのひろば','動輪','どうりん','driving wheels'],
  ['station-postbox','赤レンガ駅舎型ポスト','あかれんがえきしゃがたぽすと','駅舎型ポスト','えきしゃがたぽすと','ポスト','post','postbox','tokyo station postbox'],
  ['platform-tokaido-1415','しんかんせん','新幹線','東海道新幹線','東海道・山陽新幹線','shinkansen','14・15番線','14･15番線'],
  ['square-zero','SQUARE ZERO','square0','スクエアゼロ','スクウェアゼロ','スクエア0','ゼロ','zero'],
  ['silver-bell','銀の鈴','ぎんのすず','銀のすず','ぎんの鈴','silver bell'],
]);
const normalize=value=>typeof value==='string'?value.normalize('NFKC').toLocaleLowerCase('ja').replace(/[\u30a1-\u30f6]/gu,char=>String.fromCharCode(char.charCodeAt(0)-0x60)).replace(/\s+/gu,''):'';
const acceptedAnswers=answerAliases.map(answers=>new Set(answers.map(normalize)));

export function initialProgress(){return {version:4,stage:0,met:false,photographed:false,endingLine:0,endingRead:false};}

export function sanitizeProgress(value){
  if(!value||typeof value!=='object'||Array.isArray(value)||
    !['version','stage','met'].every(key=>Object.hasOwn(value,key))||
    ![1,2,3,4].includes(value.version)||!Number.isInteger(value.stage)||value.stage<0||
    value.stage>(value.version===1?4:PUZZLES.length)||typeof value.met!=='boolean'||
    (value.version>=3&&(!Object.hasOwn(value,'photographed')||typeof value.photographed!=='boolean'))||
    (value.version===4&&(!Object.hasOwn(value,'endingLine')||!Number.isInteger(value.endingLine)||value.endingLine<0||value.endingLine>=ENDING.length||
      !Object.hasOwn(value,'endingRead')||typeof value.endingRead!=='boolean')))return initialProgress();
  // Old players who already found SQUARE ZERO keep that discovery. Only new
  // runs take the new platform detour; an already completed story stays complete.
  const stage=value.version===1&&value.stage>=3?value.stage+1:value.stage;
  const met=stage===PUZZLES.length&&value.met;
  // Earlier editions treated meeting Haru as completion and did not record
  // the portrait separately. Keep those completed stories complete.
  const photographed=met&&(value.version<3||value.photographed);
  const endingRead=met&&(value.version<4?photographed:value.endingRead||value.endingLine===ENDING.length-1);
  const endingLine=met?(endingRead?ENDING.length-1:value.version===4?value.endingLine:0):0;
  return {version:4,stage,met,photographed,endingLine,endingRead};
}

export function targetSpot(value){
  const {stage}=sanitizeProgress(value);
  return SPOTS[Math.max(0,stage-1)];
}

export function nearSpot(position,spot,radius=10){
  if(!position||!spot||typeof position!=='object'||position.floor!==spot.floor||
    !Number.isFinite(position.x)||!Number.isFinite(position.z)||!Number.isFinite(spot.x)||
    !Number.isFinite(spot.z)||!Number.isFinite(radius)||radius<0)return false;
  if(spot.id==='platform-tokaido-1415'){
    // The guide centre and the train photo point belong to the same platform.
    // A radial buffer would also admit the near edge of the next platform.
    const region=spot.region;
    return Boolean(region&&position.x>=region.minX&&position.x<=region.maxX&&
      position.z>=region.minZ&&position.z<=region.maxZ);
  }
  return Math.hypot(position.x-spot.x,position.z-spot.z)<=radius;
}

export function applyAction(value,action,position){
  const progress=sanitizeProgress(value);
  const result=(correct,message,extra={})=>({progress:{...progress},correct,message,...extra});
  if(!action||typeof action!=='object'||Array.isArray(action)||!Object.hasOwn(action,'type')||!['answer','meet','photograph','read-ending'].includes(action.type))return result(false,'写真とメッセージを、もう一度見てみよう。');
  if(action.type==='read-ending'){
    if(!progress.met||!Object.hasOwn(action,'line')||!Number.isInteger(action.line)||action.line<0||action.line>=ENDING.length)return result(false,'晴と会ってから、会話の続きを読みましょう。');
    if(progress.endingRead)return result(true,'約束の会話を、何度でも読み返せます。',{alreadyApplied:true});
    if(Math.abs(action.line-progress.endingLine)>1)return result(false,'会話を一つずつ、読み進めましょう。');
    progress.endingLine=action.line;progress.endingRead=action.line===ENDING.length-1;
    return result(true,'会話の続きが保存されました。');
  }
  if(action.type==='photograph'){
    if(progress.stage!==PUZZLES.length||!progress.met)return result(false,'先に晴に会い、二人の気持ちを話そう。');
    if(progress.photographed)return result(true,'二人で写った写真を、読み返せます。',{alreadyApplied:true});
    const spot=targetSpot(progress);
    if(!nearSpot(position,spot))return result(false,`${spot.floor}の「${spot.title}」の近くで、二人の写真を撮ってもらおう。`);
    progress.photographed=true;
    return result(true,'銀の鈴の前で、紬と晴が一緒に写った写真を残しました。');
  }
  if(action.type==='meet'){
    if(progress.stage!==PUZZLES.length)return result(false,'先に、晴から届いた謎をたどろう。');
    if(progress.met)return result(true,'晴と、次の待ち合わせを約束しました。',{alreadyApplied:true});
    const spot=targetSpot(progress);
    if(!nearSpot(position,spot))return result(false,`${spot.floor}の「${spot.title}」の近くで、晴に声をかけよう。`);
    progress.met=true;
    return result(true,'晴と、次の待ち合わせを約束しました。');
  }
  if(progress.stage===PUZZLES.length)return result(false,progress.met?'晴との約束を、読み返せます。':'最後の待ち合わせ場所で、晴に会いに行こう。');
  if(progress.stage>0){
    const spot=targetSpot(progress);
    if(!nearSpot(position,spot))return result(false,`${spot.floor}の「${spot.title}」の近くで、このメッセージを開いてみよう。`);
  }
  if(!Object.hasOwn(action,'answer')||!acceptedAnswers[progress.stage].has(normalize(action.answer)))return result(false,'もう一度、写真とメッセージを見てみよう。ヒントも読めます。');
  const solved=progress.stage;
  progress.stage++;
  return result(true,PUZZLES[solved].successText);
}
