// Episode four owns its notebook, dialogue and progress. All coordinates refer
// to the existing walkable model; this module never alters the station.
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};

export const EPISODE=freeze({
  id:'promise-again-v1',
  title:'あの日の約束を、もう一度',
  subtitle:'第4作 · 紬と祖母の、待ち合わせの手帳',
  description:'律の写真の片隅にいたのは、紬の祖母だった。古い手帳と友人からの絵はがきを読み解き、すれ違った約束の続きを手伝う。',
  duration:'25〜35分',
  difficulty:'手帳と記憶をたどる謎解き',
  protagonist:'紬〈つむぎ〉',
  opening:[
    '律から届いた、銀の鈴の前で撮った写真。その右奥に、紬は見慣れた横顔を見つけた。',
    '「おばあちゃん？ あの日、東京駅にいたの？」。写真を撮ってくれた人とは別に、祖母が背景に写っていた。',
    '祖母の手元には、長く会っていない友人・澄子から最近届いた絵はがきがあった。「近いうちに東京駅へ行きます。あの約束、もう一度しませんか」。連絡先も添えられている。',
    '再会の日を相談して、今日は二人で東京駅へ。祖母が持ってきた古い手帳から、二人だけの待ち合わせの呼び方と、すれ違った日のことをたどる。',
  ],
});

const bell={id:'silver-bell',zoneId:'silver-bell',title:'銀の鈴',floor:'B1F',x:34,z:10,modelX:34,modelZ:17};
export const SPOTS=freeze([
  {...bell},
  {id:'driving-wheels',zoneId:'driving-wheels',title:'動輪の広場',floor:'B1F',x:-51,z:7,modelX:-57,modelZ:19},
  {id:'station-postbox',zoneId:'station-postbox',title:'赤レンガ駅舎型ポスト',floor:'1F',x:-24,z:-2.5,modelX:-24,modelZ:4.6},
  {id:'square-zero',zoneId:'square-zero',title:'SQUARE ZERO',floor:'B1F',x:2,z:-3,modelX:2,modelZ:-19},
  {...bell},
  {...bell},
]);

export const PUZZLES=freeze([
  {
    id:'a-place-drawn-in-circles',title:'手帳の中の、三つの輪',kind:'choice',
    message:'「この前ここにいたのは、待ち合わせを思い出していたから」。祖母は、律の写真と同じ銀の鈴を見上げた。手帳の最初のページには、次に見たい場所の絵がある。',
    question:'手帳の絵とメモに当てはまる、次の場所を選んでください。',
    evidence:[
      {label:'祖母の描いた絵',text:'大きな丸が三つ横に並び、一本の棒でつながっている。円の内側には、車輪のような線。'},
      {label:'絵の横のメモ',text:'もう走らない、旅の足。丸の内側の地下、改札の外で待つときの目印。'},
    ],
    options:[{id:'square-zero',label:'SQUARE ZERO'},{id:'driving-wheels',label:'動輪の広場'},{id:'silver-bell',label:'銀の鈴'},{id:'station-postbox',label:'赤レンガ駅舎型ポスト'}],
    answer:'driving-wheels',
    hints:['三つの丸の形と、一本の棒に注目してみましょう。','丸は大きな車輪です。絵のメモは、改札の外と書いてあります。','答えは「動輪の広場」。B1Fの丸の内地下南口側へ向かいましょう。'],
    successText:'次はB1Fの「動輪の広場」。手帳には、ここで道を尋ねられた日の記録が挟まっていた。',
    reflection:'私も昔、行き先が分からずに困ったことがあってね。道を聞かれると、そのまま通り過ぎられなくなったの。',
    discovery:'祖母が道を尋ねられると足を止めるのは、自分も迷った日に助けられたから。',
  },
  {
    id:'the-day-they-missed',title:'会えなかった日の、二つの記録',kind:'order',
    message:'祖母の手帳に、澄子が絵はがきへ書き写した昔の記録を重ねる。二人とも相手を待っていたのに、会えなかった日がある。',
    question:'四つの記録を、同じ日の早い時刻から順に並べてください。誰が、いつ、どこにいたのか確かめましょう。',
    evidence:[
      {label:'祖母の手帳',text:'14時40分：動輪のそばで迷っている女の子を、案内所へ連れていく。\n15時10分：銀の鈴へ戻った。でも澄子の姿はなかった。'},
      {label:'澄子が書き写した記録',text:'15時00分：銀の鈴で待つ。\n15時05分：改札の外で迷ったのかも。動輪のほうへ探しに行く。'},
    ],
    options:[{id:'grandma-returns',label:'祖母が銀の鈴へ戻る'},{id:'friend-waits',label:'澄子が銀の鈴で待つ'},{id:'guide-child',label:'祖母が迷っている女の子を案内する'},{id:'friend-searches',label:'澄子が改札の外へ探しに行く'}],
    answer:['guide-child','friend-waits','friend-searches','grandma-returns'],
    hints:['二人の記録は同じ日のもの。まず、14時の出来事を探しましょう。','14時40分の案内のあと、15時00分に澄子が待ち、15時05分には探しに出ています。','「女の子を案内する → 澄子が待つ → 澄子が探しに行く → 祖母が戻る」の順です。'],
    successText:'祖母が戻る五分前に、澄子は探しに出ていた。手帳の続きには、伝えられなかった言葉を手紙にしたとある。次は1Fの赤レンガ駅舎型ポストへ。',
    reflection:'来てくれなかったんじゃなかった。私を探しに行ってくれていたのね。あの日、女の子を案内したことも、やっと澄子に話せる。',
    discovery:'澄子が銀の鈴を離れたのは、来ない祖母を動輪の広場へ探しに行ったから。',
  },
  {
    id:'words-written-together',title:'二人で読む、短い返事',kind:'text',
    message:'あのあとも手紙は何度か交わした。その手紙では近況ばかり伝え、二人とも会えなかった日のことには触れられなかった。引っ越しや忙しさが重なり、会う約束もそのままになった。手帳には、二人で一文字ずつ書いた言葉が残っている。',
    question:'祖母の一文字目、澄子の一文字目、祖母の二文字目、澄子の二文字目……と交互につないでください。最後は祖母の三文字目です。できた五文字は何でしょう。',
    evidence:[
      {label:'祖母が書いた文字',text:'ま　あ　う'},
      {label:'澄子が書いた文字',text:'た　お'},
      {label:'二人の小さな約束',text:'一人ずつだと、ちぐはぐ。二人で交互に読めば、次に会う日の言葉になる。'},
    ],
    options:[],answer:'また会おう',
    hints:['二つの文字列を、それぞれ左から読みます。祖母の列から始めましょう。','最初は祖母の「ま」、次は澄子の「た」。次に祖母の「あ」、澄子の「お」と続きます。','最後の「う」までつなぐと「またあおう」。「また会おう」と入力しても大丈夫です。'],
    successText:'「また会おう」。澄子の絵はがきにも、同じ言葉があった。次は、祖母が今日の休憩場所に選んだB1FのSQUARE ZEROで、絵はがきの続きを読もう。',
    reflection:'会えなかった日に、「さよなら」とは書けなくて。二人なら読める言葉を、残しておきたかったの。',
    discovery:'二人が交互に読める言葉を残したのは、会えなくても「また会おう」を伝えたかったから。',
  },
  {
    id:'the-place-today',title:'今の駅で、あの場所へ',kind:'choice',
    message:'SQUARE ZEROのベンチで、祖母は最近届いた絵はがきを開いた。「昔はなかった景色も増えたね。今日はここで一息つこう」。これは今日の休憩場所。再会の場所は、澄子のメモから確かめられる。',
    question:'澄子が再会の場所として書いた条件を、すべて満たす目印はどれでしょう。',
    evidence:[
      {label:'澄子からの絵はがき',text:'今度は、地下1階の改札の中で。三本の光ではなく、ひとつの大きな銀色の目印。その下で会いましょう。'},
      {label:'紬がまとめた目印',text:'動輪の広場：B1F・改札の外・三つの車輪。\nポスト：1F・改札の中・小さな駅舎の形。\nSQUARE ZERO：B1F・改札の中・三本の光る柱。\n銀の鈴：B1F・改札の中・大きな銀色の鈴。'},
    ],
    options:[{id:'station-postbox',label:'赤レンガ駅舎型ポスト'},{id:'square-zero',label:'SQUARE ZERO'},{id:'silver-bell',label:'銀の鈴'},{id:'driving-wheels',label:'動輪の広場'}],
    answer:'silver-bell',
    hints:['階、改札の内外、目印の形を、一つずつ照らし合わせましょう。','ポストは1F、動輪は改札の外。三本の光る柱も違うと書かれています。','すべての条件に合うのは「銀の鈴」。B1Fの銀の鈴へ戻りましょう。'],
    successText:'再会の場所はB1Fの「銀の鈴」。今度は場所だけでなく、時刻も一緒に確認しよう。',
    reflection:'あのときも、一言、確かめていればよかったね。今度は、同じ場所にいるって、ちゃんと言葉にしよう。',
    discovery:'祖母が目印を一つずつ確かめるのは、もう相手を探してすれ違いたくないから。',
  },
  {
    id:'one-place-one-time',title:'同じ場所、同じ時刻',kind:'text',
    message:'銀の鈴の前へ戻った紬たち。澄子の絵はがきには、今日の列車と移動の予定も添えられていた。祖母は携帯電話を取り出す。「場所と時間、どちらも伝えようね」',
    question:'待ち合わせの「場所」と「時刻」を両方つなげて入力してください。例：○○で○時。書かれた予定から、到着する時刻を考えましょう。',
    evidence:[
      {label:'確かめた待ち合わせ場所',text:'地下1階の改札の中、大きな銀色の目印。名前は「銀の鈴」。'},
      {label:'澄子の今日の予定',text:'列車が東京駅に着くのは14時30分。着いてから15分休憩し、そのあと15分歩いて、待ち合わせの目印へ向かいます。'},
      {label:'祖母の確認メモ',text:'休憩の15分と、歩く15分を両方足す。今回は、場所と時刻をそろえて返事をする。'},
    ],
    options:[],answer:'銀の鈴で15時',
    hints:['14時30分に、休憩の15分を足すと何時でしょう。さらに歩く15分も足します。','14時30分 → 14時45分 → 15時00分。場所の名前も一緒に書きましょう。','答えは「銀の鈴で15時」。「ぎんのすずで15じ」や「銀の鈴で午後3時」でも入力できます。'],
    successText:'「銀の鈴で15時」。同じ場所、同じ時刻がそろった。祖母から澄子へ、電話で待ち合わせを確認しよう。',
    reflection:'たった一言でも、今なら伝えられる。会える日を待つだけじゃなくて、会おうって、私から言ってみるね。',
    discovery:'祖母が自分から電話をかけるのは、待つだけだった約束を、今日の再会に変えたいから。',
  },
]);

// These lines are opened only after the independently saved reunion step.
export const REVEAL=freeze([
  {speaker:'',text:'再会のあと、祖母が手帳を開く。長く使ったページの余白に、短い書き出しが残っていた。'},
  {speaker:'手帳',text:'未来の駅を歩く、あなたへ。'},
  {speaker:'',text:'あの手紙と、同じ書き出しだった。'},
  {speaker:'祖母',text:'昔、私もこの駅で迷ってね。見知らぬ人が、約束の場所まで一緒に歩いてくれたの。'},
  {speaker:'祖母',text:'その人とは、それきり。でも、してもらったことは、ずっと覚えていた。だから、困っている人を見ると、声をかけたくなるのね。'},
  {speaker:'祖母',text:'あの手紙を書いたのは、私。この駅を歩く誰かにも、小さな出会いや約束が生まれたらと思って、手帳の言葉を手紙にしたの。'},
  {speaker:'手紙',text:'この手紙を見つけてくれて、ありがとう。\nまた、この駅で会いましょう。'},
  {speaker:'紬',text:'いつかまた、銀の鈴の下で。……私がいつも使っていた言葉も、おばあちゃんから受け取ってたんだ。'},
]);

export const ENDING=freeze([
  {speaker:'澄子',text:'あの日は、あなたを探しに行ったの。もう一度会えたら、それを話したかった。'},
  {speaker:'祖母',text:'私も、話したいことがたくさん。あの日の続きから、聞いてくれる？'},
  {speaker:'澄子',text:'もちろん。今日は、二人ともここにいるもの。'},
  {speaker:'',text:'紬は二人の間に、少しだけ場所を空けた。待っていた時間のぶん、話せることがある。'},
  {speaker:'紬',text:'いつかまた、銀の鈴の下で。'},
  {speaker:'祖母',text:'うん。また、この駅で会いましょう。'},
]);

const progressKeys=['version','stage','invited','reunited','revealed'];
const finalActions=['invite','reunite','reveal'];
const readingActions=['advance-scene','previous-scene'];
const scenes={reveal:REVEAL,ending:ENDING};
const normalizeWriting=value=>typeof value==='string'?value.normalize('NFKC').toLocaleLowerCase('ja').replace(/[\u30a1-\u30f6]/gu,char=>String.fromCharCode(char.charCodeAt(0)-0x60)):'';
const normalize=value=>normalizeWriting(value).replace(/[\s、。，,.]/gu,'');
const textAnswers=new Map([
  [2,new Set(['また会おう','またあおう'].map(normalize))],
]);
const meetingPlace='(?:銀|ぎん)の(?:鈴|すず)';
const zeroMinutes='(?:(?:0{1,2}|零|〇|れい|ぜろ)(?:分|ふん))?';
const meetingClock=`(?:15:00|(?:午後|ごご)3:00|(?:15|十五|じゅうご)(?:時|じ)${zeroMinutes}|(?:午後|ごご)(?:3|三|さん)(?:時|じ)${zeroMinutes})`;
// Match the whole place and exact 15:00 clock. Punctuation inside a number is
// kept, so a decimal such as 1.5 cannot silently become the correct hour 15.
const meetingAnswer=new RegExp(`^(?:${meetingPlace}(?:で|に|[、,])?${meetingClock}|${meetingClock}(?:に|で|[、,])?${meetingPlace})[。.]?$`,'u');
const correctTextAnswer=(stage,value)=>stage===4?meetingAnswer.test(normalizeWriting(value).replace(/\s+/gu,'')):textAnswers.get(stage)?.has(normalize(value))===true;

export function initialProgress(){return {version:2,stage:0,invited:false,reunited:false,revealed:false,scene:null,sceneLine:0,finished:false};}

export function sanitizeProgress(value){
  if(!value||typeof value!=='object'||Array.isArray(value)||!progressKeys.every(key=>Object.hasOwn(value,key))||
    ![1,2].includes(value.version)||!Number.isInteger(value.stage)||value.stage<0||value.stage>PUZZLES.length||
    !['invited','reunited','revealed'].every(key=>typeof value[key]==='boolean'))return initialProgress();
  const invited=value.stage===PUZZLES.length&&value.invited;
  const reunited=invited&&value.reunited;
  const revealed=reunited&&value.revealed;
  const progress={version:2,stage:value.stage,invited,reunited,revealed,scene:null,sceneLine:0,finished:false};
  if(!revealed)return progress;
  // Version one did not store a reading cursor. Keep its completed stories in
  // the journal; new runs finish only after the last line is acknowledged.
  if(value.version===1)return {...progress,finished:true};
  const ownReading=['scene','sceneLine','finished'].every(key=>Object.hasOwn(value,key));
  if(ownReading&&value.finished===true&&value.scene===null&&value.sceneLine===0)return {...progress,finished:true};
  if(ownReading&&value.finished===false&&typeof value.scene==='string'&&Object.hasOwn(scenes,value.scene)&&
    Number.isInteger(value.sceneLine)&&value.sceneLine>=0&&value.sceneLine<scenes[value.scene].length)
    return {...progress,scene:value.scene,sceneLine:value.sceneLine};
  // A damaged or incomplete cursor must not silently skip the sender reveal.
  return {...progress,scene:'reveal'};
}

export function targetSpot(value){return SPOTS[sanitizeProgress(value).stage];}

export function nearSpot(position,spot,radius=10){
  return Boolean(position&&spot&&typeof position==='object'&&position.floor===spot.floor&&
    Number.isFinite(position.x)&&Number.isFinite(position.z)&&Number.isFinite(spot.x)&&Number.isFinite(spot.z)&&
    Number.isFinite(radius)&&radius>=0&&Math.hypot(position.x-spot.x,position.z-spot.z)<=radius);
}

export function applyAction(value,action,position){
  const progress=sanitizeProgress(value);
  const result=(correct,message,extra={})=>({progress:{...progress},correct,message,...extra});
  if(!action||typeof action!=='object'||Array.isArray(action)||!Object.hasOwn(action,'type')||
    !['solve',...finalActions,...readingActions].includes(action.type))return result(false,'手帳を開いて、今できることを確かめましょう。');
  if(readingActions.includes(action.type)){
    if(!progress.revealed)return result(false,'まずは、再会のあとに祖母の手帳を開きましょう。');
    if(progress.finished)return result(true,'二人の約束と手帳の言葉を、いつでも読み返せます。',{alreadyApplied:true});
    if(action.type==='previous-scene'){
      if(progress.sceneLine===0)return result(true,'この場面の最初の言葉です。',{alreadyApplied:true});
      progress.sceneLine--;
      return result(true,'ひとつ前の言葉に戻りました。');
    }
    if(progress.sceneLine<scenes[progress.scene].length-1){
      progress.sceneLine++;
      return result(true,'言葉の続きを読みます。');
    }
    if(progress.scene==='reveal'){
      progress.scene='ending';progress.sceneLine=0;
      return result(true,'二人と紬の、最後の会話へ。');
    }
    progress.scene=null;progress.sceneLine=0;progress.finished=true;
    return result(true,'祖母と澄子の再会、そして受け継いだ言葉を、手帳に残しました。');
  }
  const spot=targetSpot(progress);
  if(action.type==='solve'){
    if(progress.stage===PUZZLES.length)return result(false,progress.revealed?'二人の約束と手帳の言葉を読み返せます。':'謎はすべて解けました。銀の鈴で、待ち合わせの続きを手伝いましょう。');
    if(!nearSpot(position,spot))return result(false,`${spot.floor}の「${spot.title}」の近くで、このページを開きましょう。`);
    const puzzle=PUZZLES[progress.stage];
    const hasAnswer=Object.hasOwn(action,'answer');
    const correct=hasAnswer&&(puzzle.kind==='order'?
      Array.isArray(action.answer)&&action.answer.length===puzzle.answer.length&&puzzle.answer.every((id,index)=>Object.hasOwn(action.answer,index)&&action.answer[index]===id):
      puzzle.kind==='choice'?typeof action.answer==='string'&&action.answer===puzzle.answer:
      typeof action.answer==='string'&&correctTextAnswer(progress.stage,action.answer));
    if(!correct)return result(false,puzzle.kind==='order'?'二人の記録の時刻を、もう一度見比べてみましょう。':progress.stage===4?'場所と時刻を両方、確かめてみましょう。ヒントも読めます。':'手帳とメモを、もう一度照らし合わせてみましょう。ヒントも読めます。');
    progress.stage++;
    return result(true,puzzle.successText);
  }
  if(progress.stage!==PUZZLES.length)return result(false,'先に、祖母の手帳と澄子の絵はがきを読み解きましょう。');
  const key={invite:'invited',reunite:'reunited',reveal:'revealed'}[action.type];
  if(progress[key])return result(true,action.type==='invite'?'「銀の鈴で15時」の約束は、二人で確認できています。':action.type==='reunite'?'祖母と澄子は、銀の鈴で再会しました。':'手帳にあった言葉を、もう一度読み返せます。',{alreadyApplied:true});
  if(action.type==='reunite'&&!progress.invited)return result(false,'先に、祖母から澄子へ電話をかけ、場所と時刻を確認しましょう。');
  if(action.type==='reveal'&&!progress.reunited)return result(false,'まずは、祖母と澄子の再会を見届けましょう。');
  if(!nearSpot(position,spot))return result(false,'B1Fの「銀の鈴」の近くで、約束の続きを見届けましょう。');
  if(action.type==='invite'){
    progress.invited=true;
    return result(true,'祖母は絵はがきの連絡先へ電話をかけた。「銀の鈴で15時」。澄子の返事は「ええ、そこで。もうすぐ着きます」。二人で場所と時刻を確かめた。');
  }
  if(action.type==='reunite'){
    progress.reunited=true;
    return result(true,'やがて15時。銀の鈴のそばで、澄子が祖母の名前を呼んだ。「今度は、会えたね」。二人は顔を見合わせ、笑った。');
  }
  progress.revealed=true;
  progress.scene='reveal';progress.sceneLine=0;progress.finished=false;
  return result(true,'祖母が古い手帳を開きました。余白に残っていた言葉を、一緒に読んでみましょう。');
}
