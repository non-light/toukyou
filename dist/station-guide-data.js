import {landmarkAt} from './landmarks.js?v=6';
import {FLOOR_AREAS,FLOOR_ZONES,LINE_GROUPS,insideFloor} from './floor-layout.js?v=6';
import {GROUPS} from './station-layout.js?v=6';

// Positions describe this walkable model. Location is the player's position in
// the model, not GPS or a claim about their position in the real station.
export const LOCATION_CAPTION='いま歩いている場所';
const GROUP_DATA={...GROUPS,...LINE_GROUPS};
const byZone=new Map(FLOOR_ZONES.map(z=>[z.id,z]));
function gate(zoneId,x,z,axis,insideSide,span=10.8){
  const zone=byZone.get(zoneId),group=zone.group,transfer=zone.kind==='transfer',operator=group==='tokaido'?'JR東海':'JR東日本';
  const title=transfer?`${group==='east'?'JR東日本 新幹線':'東海道・山陽新幹線'} ${zone.title.replace(/^新幹線\s*/, '')}`:zone.title;
  const destination=transfer?`${GROUP_DATA[group].label} ${GROUP_DATA[group].platforms}`:group==='keiyo'?'京葉線・武蔵野線 地下1〜4番線':`${zoneId.includes('yaesu')?'八重洲方面':'丸の内方面'} / 在来線`;
  const spawn={x,z,yaw:axis==='x'?(insideSide===1?-Math.PI/2:Math.PI/2):(insideSide===1?Math.PI:0)};spawn[axis]-=insideSide*5;
  return {id:`gate-${zoneId}`,zoneId,title,floor:zone.floor,group,operator,destination,kind:transfer?'transfer':'exit',x,z,axis,span,insideSide,spawn,color:GROUP_DATA[group]?.color??GROUPS.general.color};
}
export const GATES=[
  gate('marunouchi-north',-40,-30,'x',1),gate('marunouchi-central',-40,0,'x',1),gate('dome',-40,30,'x',1),
  gate('yaesu-north',48,-30,'x',-1),gate('yaesu-central',48,0,'x',-1),gate('yaesu-south',48,30,'x',-1),
  gate('jr-east-north',15,-48,'z',-1,14.8),gate('jr-east-south',15,48,'z',1,14.8),
  gate('tokaido-central',36,-17,'z',-1,13.5),gate('tokaido-south',36,48,'z',1,13.5),
  gate('marunouchi-underground',-49,0,'x',1,9.2),gate('yaesu-underground',54,0,'x',-1,9.2),
  gate('keiyo-marunouchi',-12,294,'x',1,10.2),gate('keiyo-yaesu',48,294,'x',-1,10.2)
];
const result=(id,title,floor,areaLabel,group='general',paid=true)=>({id,title,floor,areaLabel,group,paid});
function zoneResult(zone,areaLabel){return result(zone.id,zone.title,zone.floor,areaLabel,zone.group,true);}
export function resolveLocation({x,z,floor='1F'}={}){
  const areas=FLOOR_AREAS[floor]??[],index=areas.findIndex(a=>x>=a.minX&&x<=a.maxX&&z>=a.minZ&&z<=a.maxZ);
  if(!Number.isFinite(x)||!Number.isFinite(z)||index<0)return result(`outside-${floor}`,'散策エリアの外',floor,'散策エリア外','general',false);
  const landmark=landmarkAt(x,z,floor);if(landmark)return result(landmark.id,landmark.title,floor,landmark.areaLabel,landmark.group,landmark.paid);
  if(floor==='1F'){
    if(x<-40){const side=z<-15?'north':z>15?'south':'central',title=z<-15?'丸の内北口側':z>15?'丸の内南口ドーム':'丸の内中央口側';return result(`marunouchi-public-${side}`,title,floor,'改札外・丸の内側','general',false);}
    if(x>48){const side=z<-15?'north':z>15?'south':'central';return result(`yaesu-public-${side}`,`八重洲${side==='north'?'北口':side==='south'?'南口':'中央口'}側`,floor,'改札外・八重洲側','general',false);}
    if(x>=6&&x<=24&&(z<-48||z>48))return result(`east-paid-${z<0?'north':'south'}`,'JR東日本 新幹線改札内',floor,'新幹線改札内・20〜23番線','east',true);
    if(x>=28&&x<=44&&(z>=-25&&z<-17||z>48))return result(`tokaido-paid-${z<0?'central':'south'}`,'東海道・山陽新幹線 改札内',floor,'新幹線改札内・14〜19番線','tokaido',true);
    const title=z<-24?'北通路':z>24?'南通路':Math.abs(z)<=6?'中央通路':'在来線連絡通路';return result(`general-paid-${title}`,title,floor,'在来線改札内','general',true);
  }
  if(floor==='B1F'){
    if(index===1){const id=z<76?'keiyo-passage-entry':z>250?'keiyo-passage-end':'keiyo-passage';return zoneResult(byZone.get(id),'京葉線改札内・連絡通路');}
    if(x<-49)return result('marunouchi-underground-public','丸の内地下・改札外',floor,'改札外・丸の内地下','general',false);
    if(x>54)return result('yaesu-underground-public','八重洲地下・改札外',floor,'改札外・八重洲地下','general',false);
    return result('b1-concourse','地下中央通路',floor,'在来線改札内・地下通路','general',true);
  }
  if(floor==='B2F'){
    if(x<-12)return result('keiyo-marunouchi-public','京葉地下丸の内口・改札外',floor,'改札外・京葉地下丸の内口','keiyo',false);
    if(x>48)return result('keiyo-yaesu-public','京葉地下八重洲口・改札外',floor,'改札外・京葉地下八重洲口','keiyo',false);
    return result('keiyo-concourse','京葉地下改札コンコース',floor,'京葉線改札内','keiyo',true);
  }
  if(floor==='B3F')return zoneResult(byZone.get('keiyo-intermediate'),'京葉線改札内・中間階');
  if(floor==='B4F')return index===2?zoneResult(byZone.get('sobu-concourse'),'総武・横須賀線改札内'):zoneResult(byZone.get(index===0?'keiyo-platform-12':'keiyo-platform-34'),'京葉線改札内・地下ホーム');
  if(floor==='B5F')return zoneResult(byZone.get(index===0?'sobu-platform-12':'sobu-platform-34'),'総武・横須賀線改札内・地下ホーム');
  if(floor==='M2F'){
    const ids=['m2-east-north','m2-east-south','m2-tokaido-central','m2-tokaido-south','m2-yaekita'],zone=byZone.get(ids[index]);
    if(index===4)return result(zone.id,zone.title,floor,'改札外・八重洲北側の中間階','general',false);
    return zoneResult(zone,zone.group==='east'?'JR東日本 新幹線改札内・中間階':'東海道・山陽新幹線改札内・中間階');
  }
  if(floor==='2F'){
    const a=areas[index],zone=FLOOR_ZONES.find(q=>q.floor===floor&&q.kind==='platform'&&q.x>=a.minX&&q.x<=a.maxX&&q.z>=a.minZ&&q.z<=a.maxZ);
    if(zone)return zoneResult(zone,zone.group==='east'?'JR東日本 新幹線改札内・ホーム':zone.group==='tokaido'?'東海道・山陽新幹線改札内・ホーム':'在来線改札内・ホーム');
  }
  return result(`floor-${floor}`,'東京駅の散策エリア',floor,'散策エリア','general',true);
}
export function detectGateCrossings(from,to,floor='1F'){
  if(!from||!to||[from.x,from.z,to.x,to.z].some(v=>!Number.isFinite(v))||(from.floor&&from.floor!==floor)||(to.floor&&to.floor!==floor))return [];
  const hits=[];
  for(const gate of GATES){
    if(gate.floor!==floor)continue;const axis=gate.axis,tangent=axis==='x'?'z':'x',a=(from[axis]-gate[axis])*gate.insideSide,b=(to[axis]-gate[axis])*gate.insideSide;
    if((a>=0)===(b>=0)||to[axis]===from[axis])continue;
    const t=(gate[axis]-from[axis])/(to[axis]-from[axis]),at=from[tangent]+(to[tangent]-from[tangent])*t;
    if(t<0||t>1||Math.abs(at-gate[tangent])>gate.span/2)continue;
    const cross={x:from.x+(to.x-from.x)*t,z:from.z+(to.z-from.z)*t};if(!insideFloor(cross.x,cross.z,floor))continue;
    const entered=b>=0,message=gate.kind==='transfer'?`${gate.title}を${entered?'通過しました。新幹線の改札内です。':'出ました。在来線の改札内です。'}`:`${gate.title}から${entered?'改札内に入りました。':'改札外に出ました。'}`;
    hits.push({gate,entered,message,t});
  }
  return hits.sort((a,b)=>a.t-b.t).map(({t,...hit})=>hit);
}
const normalize=value=>String(value??'').normalize('NFKC').toLocaleLowerCase('ja').replace(/[〜～~]/g,'-');
export function filterGates({group='all',query=''}={}){
  const terms=normalize(query).replace(/\bjr\s*east\b/g,'jr東日本').replace(/\bjr\s*central\b/g,'jr東海').trim().split(/\s+/).filter(Boolean);
  return GATES.filter(gate=>{
    if(group&&group!=='all'&&gate.group!==group)return false;
    const aliases=gate.group==='east'?'jr east hokuriku tohoku joetsu shinkansen':gate.group==='tokaido'?'jr central tokaido sanyo shinkansen':gate.group==='keiyo'?'keiyo musashino':gate.zoneId.includes('yaesu')?'yaesu east':'marunouchi west';
    const text=normalize([gate.title,gate.operator,gate.destination,gate.floor,gate.zoneId,byZone.get(gate.zoneId)?.en,aliases].join(' '));return terms.every(term=>text.includes(term));
  });
}
