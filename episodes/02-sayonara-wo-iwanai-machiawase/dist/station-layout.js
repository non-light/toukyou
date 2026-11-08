// A walkable schematic, not a surveyed floor plan. x=east, z=south; north=-z.
export const GROUPS = {
  general: {label:'在来線・出入口',shortLabel:'在来線',color:'#d9bf87',area:'在来線改札内',platforms:''},
  east: {label:'東北・山形・秋田・北海道・上越・北陸新幹線',shortLabel:'北陸ほか・JR東日本',color:'#86c8a4',area:'JR東日本 新幹線改札内',platforms:'20〜23番線',operator:'JR東日本'},
  tokaido: {label:'東海道・山陽新幹線',shortLabel:'東海道・山陽',color:'#80b9e9',area:'東海道・山陽 新幹線改札内',platforms:'14〜19番線',operator:'JR東海'}
};
export const SOURCES = [
 {label:'JR東日本 東京駅構内図・のりば案内',url:'https://www.jreast.co.jp/estation/stations/1039.html'},
 {label:'JR東海 東京駅構内図',url:'https://railway.jr-central.co.jp/station-guide/shinkansen/tokyo/map.html'},
 {label:'Tokyo Station City 丸の内駅舎のみどころ',url:'https://www.tokyostationcity.com/learning/station_building/'}
];
const exit=(id,title,x,z,side)=>({id,title,en:side==='west'?'MARUNOUCHI EXIT':'YAESU EXIT',x,z,yaw:side==='west'?-Math.PI/2:Math.PI/2,pitch:.06,group:'general',kind:'exit',side,subtitle:side==='west'?'MARUNOUCHI / WEST':'YAESU / EAST',body:`${title}は、${side==='west'?'駅の西側・丸の内方面':'駅の東側・八重洲方面'}の在来線改札です。北口・中央口・南口はそれぞれ別の出入口です。${side==='east'?'東海道・山陽新幹線の同名の直接改札とは別なので、案内にある路線名も確かめましょう。':'新幹線に乗る場合は、改札内の通路から利用する新幹線の「のりかえ口」へ進みます。'}`});
const transfer=(id,title,x,z,yaw,group)=>({id,title,en:group==='east'?'JR EAST SHINKANSEN':'TOKAIDO / SANYO SHINKANSEN',x,z,yaw,pitch:.10,group,kind:'transfer',subtitle:GROUPS[group].label,body:group==='east'?`北陸新幹線は、東北・山形・秋田・北海道・上越新幹線と共通の改札を利用します。北陸専用の改札ではありません。この${title.includes('北')?'北':'南'}のりかえ口は在来線改札内とJR東日本側の新幹線改札内を結びます。ホームは2Fの20〜23番線です。`:`東海道・山陽新幹線の${title.includes('中央')?'中央':'南'}のりかえ口です。在来線改札内と東海道・山陽新幹線の改札内を結びます。ホームは2Fの14〜19番線。北陸新幹線などのJR東日本側の改札とは別です。`});
export const ZONES = [
 {...exit('dome','丸の内南口',-49,30,'west'),en:'MARUNOUCHI SOUTH DOME',pitch:.24,body:'丸の内南口は東京駅の西側にある在来線改札です。八角形の南口ドームが目印。丸の内北口・中央口とは別の出入口で、新幹線へは改札内の各のりかえ口を利用します。'},
 exit('marunouchi-central','丸の内中央口',-49,0,'west'),
 exit('marunouchi-north','丸の内北口',-49,-30,'west'),
 {id:'concourse',title:'中央通路',en:'CENTRAL PASSAGE',x:-8,z:0,yaw:-Math.PI/2,pitch:.06,group:'general',kind:'passage',subtitle:'MARUNOUCHI ↔ YAESU',body:'丸の内側と八重洲側を結ぶ在来線改札内の中央通路。北・中央・南の通路を目印に散策できます。この試作では通路の寸法と接続を簡略化しています。'},
 exit('yaesu-north','八重洲北口',54,-30,'east'),
 exit('yaesu-central','八重洲中央口',54,0,'east'),
 exit('yaesu-south','八重洲南口',54,30,'east'),
 transfer('jr-east-north','新幹線 北のりかえ口',15,-40,0,'east'),
 transfer('jr-east-south','新幹線 南のりかえ口',15,40,Math.PI,'east'),
 transfer('tokaido-central','新幹線 中央のりかえ口',36,-10,0,'tokaido'),
 transfer('tokaido-south','新幹線 南のりかえ口',36,40,Math.PI,'tokaido')
];
export const WALK_AREAS = [
 {minX:-60,maxX:-38,minZ:-43,maxZ:43},
 {minX:46,maxX:64,minZ:-43,maxZ:43},
 ...[-30,0,30].map(z=>({minX:-43,maxX:52,minZ:z-6,maxZ:z+6})),
 {minX:-14,maxX:-2,minZ:-36,maxZ:36},
 {minX:6,maxX:24,minZ:-62,maxZ:-34},
 {minX:6,maxX:24,minZ:34,maxZ:62},
 {minX:28,maxX:44,minZ:-25,maxZ:-4},
 {minX:28,maxX:44,minZ:34,maxZ:62}
];
export const EXTENT={minX:-64,maxX:68,minZ:-66,maxZ:66};
// Tour routing follows the same walkable corridors used by manual movement.
export const NODES = [];
const xs=[-49,-8,15,36,54],zs=[-30,0,30];
for(let row=0;row<zs.length;row++)for(let col=0;col<xs.length;col++)NODES.push({id:`${row}:${col}`,x:xs[col],z:zs[row],links:[]});
for(let row=0;row<3;row++)for(let col=0;col<5;col++){const n=NODES.find(n=>n.id===`${row}:${col}`);for(const c of [col-1,col+1])if(c>=0&&c<5)n.links.push(`${row}:${c}`);if([0,1,4].includes(col))for(const r of [row-1,row+1])if(r>=0&&r<3)n.links.push(`${r}:${col}`)}
for(const zone of ZONES.filter(z=>z.kind==='transfer')){const anchor=zone.id==='jr-east-north'?'0:2':zone.id==='jr-east-south'?'2:2':zone.id==='tokaido-central'?'1:3':'2:3';NODES.push({id:zone.id,x:zone.x,z:zone.z,links:[anchor]});NODES.find(n=>n.id===anchor).links.push(zone.id)}
export function insideWalkArea(x,z){return WALK_AREAS.some(a=>x>=a.minX&&x<=a.maxX&&z>=a.minZ&&z<=a.maxZ)}
export function areaAt(x,z){if(z<-48&&x>=6&&x<=24||z>48&&x>=6&&x<=24)return 'east';if(x>=28&&x<=44&&(z<-17||z>48))return 'tokaido';return x<-40||x>48?'outside':'general'}
export function zoneLabel(zone){return zone.kind==='transfer'?`${zone.group==='east'?'北陸ほか':'東海道・山陽'}｜${zone.title}`:zone.title}
export function routePath(from,to,isAllowed=insideWalkArea){
 const visible=(a,b)=>{const steps=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)/.15));for(let i=0;i<=steps;i++)if(!isAllowed(a.x+(b.x-a.x)*i/steps,a.z+(b.z-a.z)*i/steps))return false;return true};
 const nearest=(point)=>NODES.filter(n=>visible(point,n)).sort((a,b)=>Math.hypot(a.x-point.x,a.z-point.z)-Math.hypot(b.x-point.x,b.z-point.z))[0];
 const start=nearest(from),goal=nearest(to);if(!start||!goal)return [];const cost=new Map([[start.id,0]]),previous=new Map(),pending=new Set(NODES.map(n=>n.id));
 while(pending.size){let id=[...pending].reduce((a,b)=>(cost.get(a)??Infinity)<(cost.get(b)??Infinity)?a:b);if(!Number.isFinite(cost.get(id)))break;pending.delete(id);if(id===goal.id)break;const node=NODES.find(n=>n.id===id);for(const neighborId of node.links){if(!pending.has(neighborId))continue;const next=NODES.find(n=>n.id===neighborId);if(!visible(node,next))continue;const value=cost.get(id)+Math.hypot(next.x-node.x,next.z-node.z);if(value<(cost.get(neighborId)??Infinity)){cost.set(neighborId,value);previous.set(neighborId,id)}}}
 if(!Number.isFinite(cost.get(goal.id)))return [];let id=goal.id;const path=[];while(id){const n=NODES.find(n=>n.id===id);path.unshift({x:n.x,z:n.z});if(id===start.id)break;id=previous.get(id)}return [...path,{x:to.x,z:to.z}].filter((p,i,a)=>!i||p.x!==a[i-1].x||p.z!==a[i-1].z);
}
