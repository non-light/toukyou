// Story and rules for the first ticket episode. This module never changes the
// station model and can run in either the browser or a room server.
export const EPISODE=Object.freeze({
  id:'time-letter-v1',
  title:'時を超えた一通',
  subtitle:'東京駅のふしぎな切符',
  description:'古い切符をかざすと、昔の案内が浮かび上がる。三つの目印をたどり、あなたに届いた一通を、次の旅人へつなぎましょう。',
  duration:'10〜15分',
  difficulty:'はじめての謎解き',
});

export const SPOTS=Object.freeze([
  Object.freeze({id:'bell',zoneId:'silver-bell',title:'銀の鈴',floor:'B1F',x:34,z:10,modelX:34,modelZ:17}),
  Object.freeze({id:'pillars',zoneId:'square-zero',title:'SQUARE ZERO',floor:'B1F',x:2,z:-3,modelX:2,modelZ:-19}),
  Object.freeze({id:'postbox',zoneId:'station-postbox',title:'赤レンガ駅舎型ポスト',floor:'1F',x:-24,z:-2.5,modelX:-24,modelZ:4.6}),
]);

// CLUES appear through the ticket; discoveries are also kept in the notebook.
export const CLUES=Object.freeze([
  Object.freeze({title:'鈴の下に残された案内',text:'待ち合わせのしるしを見つけたね。\n次は、三本の光の柱のところへ。',stamp:'bell',next:'B1F · SQUARE ZERO'}),
  Object.freeze({title:'三本の柱に残された絵',text:'この手紙は、小さな駅舎に届けてください。\n屋根のある箱の絵が描かれています。',stamp:'pillars',next:'1F · 赤レンガ駅舎型ポスト'}),
  Object.freeze({title:'手紙のたどった道',text:'見つけた目印を、出会った順に並べてください。\n手帳を見ながらで、だいじょうぶ。',stamp:'postbox',next:'三つの印を並べる'}),
  Object.freeze({title:'宛先が戻った手紙',text:'未来の駅を歩く、あなたへ。\nこの手紙を見つけてくれて、ありがとう。\nまた、この駅で会いましょう。',stamp:null,next:'手紙を届ける'}),
]);

export const HINTS=Object.freeze([
  Object.freeze(['最初の目印は、B1Fの「銀の鈴」です。','銀の鈴の近くで「切符をかざす」を押してみましょう。','昔の案内が見えたら、案内を読んで最初の印を受け取りましょう。']),
  Object.freeze(['次の目印は、同じB1Fの「SQUARE ZERO」です。','切符に見える絵と、選択肢の形を見比べてみましょう。','「小さな駅舎」の形をした箱は、赤レンガ駅舎型ポストです。']),
  Object.freeze(['最後の目印は、1Fの「赤レンガ駅舎型ポスト」です。','手帳には、見つけた目印が順番に残っています。','「銀の鈴 → 三本の柱 → ポスト」の順に並べましょう。']),
  Object.freeze(['三つの印がそろいました。','赤レンガ駅舎型ポストの前で、宛先の戻った手紙を開きましょう。','あなたに届いた手紙を読み、次にこの駅を歩く人へポストから託しましょう。']),
]);

export function initialProgress(){return {version:1,stage:0,delivered:false};}

export function sanitizeProgress(value){
  if(!value||typeof value!=='object'||Array.isArray(value)||
    (value.version!==undefined&&value.version!==1)||
    !Number.isInteger(value.stage)||value.stage<0||value.stage>3)return initialProgress();
  return {version:1,stage:value.stage,delivered:value.stage===3&&value.delivered===true};
}

export function targetSpot(progress){
  const {stage}=sanitizeProgress(progress);
  return SPOTS[Math.min(stage,SPOTS.length-1)];
}

export function nearSpot(position,spot,radius=10){
  return Boolean(position&&spot&&typeof position==='object'&&
    position.floor===spot.floor&&Number.isFinite(position.x)&&Number.isFinite(position.z)&&
    Number.isFinite(spot.x)&&Number.isFinite(spot.z)&&Number.isFinite(radius)&&radius>=0&&
    Math.hypot(position.x-spot.x,position.z-spot.z)<=radius);
}

const actionStages={bell:0,choice:1,order:2,deliver:3};
const correctOrder=['bell','pillars','postbox'];

export function applyAction(value,action,position){
  const progress=sanitizeProgress(value);
  const result=(correct,message,extra={})=>({progress:{...progress},correct,message,...extra});
  if(!action||typeof action!=='object'||Array.isArray(action)||
    !Object.hasOwn(actionStages,action.type))return result(false,'切符の案内から、もう一度試してみましょう。');
  const expected=actionStages[action.type];
  if(expected>progress.stage)return result(false,'まずは、切符に書かれた目印をたどりましょう。');
  if(action.type==='choice'&&action.answer!=='postbox')return result(false,'もう一度、屋根の形を見比べてみましょう。間違えても、だいじょうぶ。');
  if(action.type==='order'&&(!Array.isArray(action.answer)||action.answer.length!==3||
    action.answer.some((id,index)=>id!==correctOrder[index])))return result(false,'手帳を見ながら、出会った順に並べ直してみましょう。');
  // A delayed duplicate from another player is safe even after everyone moves on.
  if(expected<progress.stage||(action.type==='deliver'&&progress.delivered))return result(true,'この発見は、もう手帳に残っています。',{alreadyApplied:true});
  const spot=SPOTS[Math.min(expected,2)];
  if(!nearSpot(position,spot))return result(false,`${spot.floor}の「${spot.title}」の近くで試してみましょう。`);
  if(action.type==='deliver'){
    progress.delivered=true;
    return result(true,'あなたに届いた一通を、次の旅人へ託しました。また、この駅で会いましょう。');
  }
  progress.stage++;
  return result(true,action.type==='bell'?'鈴の印を受け取りました。次は、三本の光の柱へ。':action.type==='choice'?'同じ形が見つかりました。次は、1Fのポストへ。':'三つの印がそろい、手紙の宛先が戻りました。');
}
