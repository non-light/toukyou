// Episode three owns its story and progress independently of the other episodes.
// Coordinates and photo viewpoints describe the authored model, not the real station.
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};

export const EPISODE=freeze({
  id:'photograph-ritsu-v2',
  title:'写真に写らなかった君',
  subtitle:'第3作 · 律と探す、写真の向こう',
  description:'「俺は撮る側だから」。写真に写るのが苦手な律と、兄とのアルバムに残る景色を探す。京葉線の地下から長い連絡通路を歩き、総武・横須賀線の深いホームまで、形と遠近を頼りにたどる。',
  duration:'30〜40分',
  difficulty:'写真を見比べる謎解き',
  protagonist:'律〈りつ〉',
  opening:[
    '律は、第2作で紬と晴の写真を撮ってくれた青年です。写真を撮るのは好き。でも、自分が写るのは苦手。',
    '「俺は撮る側だから」。そう言って、いつもカメラの後ろに立ちます。',
    '今日は、疎遠になった兄へ送る写真を撮りに来ました。手がかりは、昔、兄と二人で写ったアルバムから切り抜いた、小さな風景です。',
    '京葉線のB4Fから、B3F・B2F・B1Fの連絡通路を経て地上へ。さらに総武・横須賀線のB5Fへ下り、最後は本駅舎B1Fの銀の鈴へ向かいます。',
  ],
});

export const SPOTS=freeze([
  {id:'keiyo-platform-12',zoneId:'keiyo-platform-12',title:'京葉線 地下1・2番線',floor:'B4F',x:10,z:294,kind:'platform',region:{minX:-28,maxX:60,minZ:290.5,maxZ:297.5}},
  {id:'station-postbox',zoneId:'station-postbox',title:'赤レンガ駅舎型ポスト',floor:'1F',x:-24,z:-2.5,modelX:-24,modelZ:4.6},
  {id:'driving-wheels',zoneId:'driving-wheels',title:'動輪の広場',floor:'B1F',x:-51,z:7,modelX:-57,modelZ:19},
  {id:'sobu-platform-12',zoneId:'sobu-platform-12',title:'総武・横須賀線 地下1・2番線',floor:'B5F',x:-56,z:0,kind:'platform',region:{minX:-59.3,maxX:-52.7,minZ:-38,maxZ:38}},
  {id:'square-zero',zoneId:'square-zero',title:'SQUARE ZERO',floor:'B1F',x:2,z:-3,modelX:2,modelZ:-19},
  {id:'silver-bell',zoneId:'silver-bell',title:'銀の鈴',floor:'B1F',x:34,z:10,modelX:34,modelZ:17},
]);

export const PUZZLES=freeze([
  {
    id:'train-beyond-the-walkway',title:'長い通路の、その先',spotId:'keiyo-platform-12',correctView:'left',
    message:'「兄貴と撮った写真。ここへ来るまで、ずっと長い通路を歩いたのを覚えてる」\nアルバムの最初の切り抜きには、濃い帯の列車が斜めに写っている。',
    question:'この列車のいる場所はどこ？ 車体の正面と側面が見える向き、窓が奥へ小さくなる並びを、切り抜きと見比べてください。',
    photoDescription:'濃い帯の列車。正面と左側の長い側面が一緒に見え、窓や扉は手前から奥へ少しずつ小さくなっている。',
    hints:[
      'これは地上の待ち合わせ目印ではなく、地下ホームの列車です。構内地図の「ホーム・電車」も手がかりにできます。',
      '場所はB4Fの「京葉線 地下1・2番線」。正面だけが見える写真と、長い側面も見える写真を比べましょう。',
      '切り抜きと同じなのは「左から」の視点。撮れたらB3F・B2F・B1Fの長い連絡通路を経由して、1Fへ上がります。',
    ],
    successText:'列車の正面と、奥へ続く窓の並びがそろった。次は小さな赤レンガの建物。B3F、B2F、B1Fの動く歩道を経由し、1Fのポストを探そう。',
    reflection:'「昔は、ホームまで遠いって文句ばっかり言ってた。兄貴は、歩いてる途中の写真も撮ってくれてたんだな」',
  },
  {
    id:'center-of-the-roof',title:'小さな屋根の真ん中',spotId:'station-postbox',correctView:'center',
    message:'「今も、ここにあるかな。兄貴と二人で、旅先のはがきを入れたんだ」\n次の切り抜きには、屋根のふくらみと、横に並んだ二つの投函口が写っている。',
    question:'この小さな建物はどこ？ 着いたら、中央の屋根と二つの投函口の位置関係が、切り抜きと同じになる視点を選んでください。',
    photoDescription:'中央の屋根が左右の屋根のちょうど真ん中に見える。赤と青の投函口も、中央から同じくらいの幅と間隔で並んでいる。',
    hints:[
      '駅舎のような小さな屋根の下に、二つの投函口があります。大きさより、建物の形と役割を見てみましょう。',
      '場所は1Fの「赤レンガ駅舎型ポスト」。中央の屋根を目印に、左右の見え幅を比べましょう。斜めからだと幅が変わります。',
      '屋根と二つの投函口が左右対称に並ぶのは「正面から」の視点です。',
    ],
    successText:'屋根の真ん中と、二つの投函口がそろった。次の切り抜きには、大きな三つの輪が写っている。丸の内側の地下へ向かおう。',
    reflection:'「送る理由がなくなったわけじゃないんだ。ただ、何て書けばいいか分からないまま、ずいぶん経った」',
  },

  {
    id:'overlapping-wheels',title:'遠くなる三つの輪',spotId:'driving-wheels',correctView:'left',
    message:'「兄貴と撮った写真。人のところをよけたら、景色だけの小さな切り抜きになった」\n三つの輪は、同じ大きさのはずなのに、写真では少しずつ違って見える。',
    question:'この風景はどこ？ 着いたら、三つの輪の見え幅と大きさの違いが、切り抜きと同じになる視点を選んでください。',
    photoDescription:'左の輪が大きく、右の輪ほど小さく細く見える。三つの輪が、斜めに奥へ続いている。',
    hints:[
      'まず、写真に写る三つの大きな輪から場所を選びましょう。場所を選ぶだけなら、まだ移動しなくても大丈夫です。',
      '場所はB1Fの「動輪の広場」。近くで写真を開き、左・正面・右の視点を見比べましょう。丸の数ではなく、見え幅と前後関係に注目。',
      '左の輪が手前に大きく見え、右へ向かって奥に続くのは「左から」の視点です。',
    ],
    successText:'三つの輪の見え幅と遠近がそろった。次は、青と淡い色の帯が並ぶ列車の切り抜き。さらに深いホームへ。',
    reflection:'「小さいころ、俺だけいつも前に出ちゃってさ。兄貴が『並べば二人とも写る』って。……そうだったな」',
  },

  {
    id:'two-lines-in-the-depths',title:'深いホームの二本線',spotId:'sobu-platform-12',correctView:'right',
    message:'「この青い線の列車も、一緒に見に来た。さっきのホームと同じ地下でも、違う場所なんだ」\n濃い帯と淡い帯が並ぶ車体。今度は、右の側面が奥へ続いている。',
    question:'この列車のいる場所はどこ？ 正面のライトと、右へ奥行きのある車体の位置関係を、切り抜きと見比べてください。',
    photoDescription:'濃い帯と淡い帯の二本線が並ぶ列車。正面と右側の長い側面が一緒に見え、右の側面の窓や扉が奥へ小さくなっている。',
    hints:[
      '京葉線とは別の地下ホームです。本駅舎の丸の内側から、総武地下コンコースを経由して下ります。',
      '場所はB5Fの「総武・横須賀線 地下1・2番線」。B4Fは総武地下コンコース、ホームはさらに一つ下です。',
      '正面と右の側面が見える「右から」の視点です。撮れたら同じ経路で本駅舎B1Fに戻り、三本の光る柱を探しましょう。',
    ],
    successText:'ライトと二本線の奥行きがそろった。最後の切り抜きは三本の光る柱。総武地下コンコースを経由して、本駅舎B1Fで三本の光る柱を探そう。',
    reflection:'「同じ東京駅でも、こんなに違う景色がある。兄貴に送るなら、ただ昔と同じだけじゃなくて、今日の俺が見たものも入れたい」',
  },
  {
    id:'distance-between-lights',title:'光のあいだ',spotId:'square-zero',correctView:'right',
    message:'「同じ景色なら、何も説明しなくても伝わると思ったんだけど」\n律は写真の端をなぞる。三本の柱は、右へいくほど幅広く見える。',
    question:'この三本の柱はどこ？ 着いたら、柱の見え幅と隣どうしの間隔が、切り抜きと同じになる視点を選んでください。',
    photoDescription:'右の柱が手前に幅広く見え、左の柱ほど細く小さく見える。柱のあいだの隙間も、左右で同じ幅には見えない。',
    hints:[
      '写真の縦長の光る柱を数えてみましょう。三本の柱の幅や、柱どうしの隙間に違いがあります。',
      '場所はB1Fの「SQUARE ZERO」。手前の柱は大きく、奥の柱は小さく見えます。右と左の見え幅を比べましょう。',
      '右の柱が手前に幅広く、左へ向かって奥に続くのは「右から」の視点です。',
    ],
    successText:'三本の柱の幅と間隔がそろった。律がアルバムの切り抜きではない、最後の一枚を取り出す。銀の鈴の下で、兄と二人が並んでいる。',
    reflection:'「駅の写真を送りたいんじゃないのかも。今の俺は、こんなふうに暮らしてるよって。……それを、見てもらいたかったんだ」',
  },

]);

export const ENDING=freeze([
  {speaker:'',text:'送った写真を、律はもう一度開いた。銀の鈴のそばで、今の自分がこちらを見ている。'},
  {speaker:'律',text:'この前、ここで二人の写真を撮ったんだ。ひとりが東京を離れるって。'},
  {speaker:'律',text:'一緒に写ってる写真を、一枚でも残してあげたくて。'},
  {speaker:'律',text:'俺にも、あってよかったんだな。今の自分が写ってる写真。'},
  {speaker:'',text:'律は画面を閉じる前に、写真に添えた短い便りを読み返した。'},
  {speaker:'便り',text:'久しぶり。今日、東京駅に来ました。今の俺は、こんなふうに暮らしています。'},
  {speaker:'律',text:'……ありがとう。撮ってくれて。'},
]);

const progressKeys=['version','stage','located','handed','photographed','sent'];
const actionTypes=['locate','frame','hand-camera','photograph','send','read-ending'];

export function initialProgress(){
  return {version:3,stage:0,located:false,handed:false,photographed:false,sent:false,endingLine:0,endingRead:false};
}

export function sanitizeProgress(value){
  if(!value||typeof value!=='object'||Array.isArray(value)||
    !progressKeys.every(key=>Object.hasOwn(value,key))||
    !Number.isInteger(value.stage)||
    !['located','handed','photographed','sent'].every(key=>typeof value[key]==='boolean'))return initialProgress();
  // Existing complete photographs survive the longer route. A partly played
  // old three-photo route restarts rather than treating new photos as solved.
  if(value.version===1){
    if(value.stage===3&&value.handed&&value.photographed&&value.sent)return {version:3,stage:5,located:false,handed:true,photographed:true,sent:true,endingLine:ENDING.length-1,endingRead:true};
    return initialProgress();
  }
  if(![2,3].includes(value.version)||value.stage<0||value.stage>5||
    (value.version===3&&(!Object.hasOwn(value,'endingLine')||!Number.isInteger(value.endingLine)||value.endingLine<0||value.endingLine>=ENDING.length||
      !Object.hasOwn(value,'endingRead')||typeof value.endingRead!=='boolean')))return initialProgress();
  const final=value.stage===5;
  const handed=final&&value.handed;
  const photographed=handed&&value.photographed;
  const sent=photographed&&value.sent,endingRead=sent&&(value.version===2||value.endingRead||value.endingLine===ENDING.length-1);
  const endingLine=sent?(endingRead?ENDING.length-1:value.endingLine):0;
  return {version:3,stage:value.stage,located:!final&&value.located,handed,photographed,sent,endingLine,endingRead};
}

export function targetSpot(value){
  return SPOTS[sanitizeProgress(value).stage];
}

export function nearSpot(position,spot,radius=10){
  if(!position||!spot||typeof position!=='object'||
    position.floor!==spot.floor||!Number.isFinite(position.x)||!Number.isFinite(position.z)||
    !Number.isFinite(spot.x)||!Number.isFinite(spot.z)||!Number.isFinite(radius)||radius<0)return false;
  // Platform centres and the train-view spawn are far apart. Both belong to
  // the same island; accepting its exact bounds excludes adjacent platforms.
  if(spot.kind==='platform'){
    const region=spot.region;
    return Boolean(region&&position.x>=region.minX&&position.x<=region.maxX&&position.z>=region.minZ&&position.z<=region.maxZ);
  }
  return Math.hypot(position.x-spot.x,position.z-spot.z)<=radius;
}

export function applyAction(value,action,position){
  const progress=sanitizeProgress(value);
  const result=(correct,message,extra={})=>({progress:{...progress},correct,message,...extra});
  if(!action||typeof action!=='object'||Array.isArray(action)||!Object.hasOwn(action,'type')||!actionTypes.includes(action.type))return result(false,'写真の形と、今できることを確かめよう。');
  if(action.type==='read-ending'){
    if(!progress.sent||!Object.hasOwn(action,'line')||!Number.isInteger(action.line)||action.line<0||action.line>=ENDING.length)return result(false,'写真と便りを送ったあとで、会話の続きを読みましょう。');
    if(progress.endingRead)return result(true,'最後の会話を、何度でも読み返せます。',{alreadyApplied:true});
    if(Math.abs(action.line-progress.endingLine)>1)return result(false,'会話を一つずつ、読み進めましょう。');
    progress.endingLine=action.line;progress.endingRead=action.line===ENDING.length-1;
    return result(true,'会話の続きが保存されました。');
  }
  const spot=targetSpot(progress);
  if(progress.stage<5){
    const puzzle=PUZZLES[progress.stage];
    if(action.type==='locate'){
      if(!Object.hasOwn(action,'answer')||action.answer!==puzzle.spotId)return result(false,'形をもう一度見比べよう。写真の場所を選んでください。');
      if(progress.located)return result(true,`${spot.floor}の「${spot.title}」で、三つの視点を見比べよう。`,{alreadyApplied:true});
      progress.located=true;
      return result(true,`${spot.floor}の「${spot.title}」だ。近くで写真を開き、同じ構図を探そう。`);
    }
    if(action.type!=='frame')return result(false,'まずは、アルバムの風景と同じ場所・構図を探そう。');
    if(!progress.located)return result(false,'先に、写真に写っている場所を選んでください。');
    if(!nearSpot(position,spot))return result(false,`${spot.floor}の「${spot.title}」の近くで、三つの視点を見比べよう。`);
    if(!Object.hasOwn(action,'view')||action.view!==puzzle.correctView)return result(false,'まだ少し違うみたい。形の見え幅と、並び方や間隔を比べてみよう。');
    progress.stage++;
    progress.located=false;
    return result(true,puzzle.successText);
  }
  if(action.type==='locate'||action.type==='frame')return result(false,'最後はB1Fの「銀の鈴」で、今の律が写る一枚を残そう。');
  const completed=action.type==='hand-camera'?progress.handed:action.type==='photograph'?progress.photographed:progress.sent;
  if(completed)return result(true,action.type==='send'?'律は、今の自分が写る写真を兄へ送りました。':'律の写真を、もう一度見返せます。',{alreadyApplied:true});
  if(!nearSpot(position,spot))return result(false,'B1Fの「銀の鈴」の近くで、最後の写真を撮ろう。');
  if(action.type==='hand-camera'){
    progress.handed=true;
    return result(true,'律はカメラを渡し、銀の鈴のそばへ歩いた。「俺も、入るから」');
  }
  if(action.type==='photograph'){
    if(!progress.handed)return result(false,'先にカメラを渡して、律にも写真に入ってもらおう。');
    progress.photographed=true;
    return result(true,'シャッターが切れた。銀の鈴のそばで、今の律がこちらを見ている。');
  }
  if(!progress.photographed)return result(false,'まずは、今の律が写った一枚を撮ろう。');
  progress.sent=true;
  return result(true,'「今の俺は、こんなふうに暮らしています」。律は写真を兄へ送った。');
}
