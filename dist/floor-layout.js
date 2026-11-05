import {ZONES as GROUND_ZONES,WALK_AREAS as GROUND_AREAS,NODES as GROUND_NODES} from './station-layout.js';
export const FLOORS=[
 {id:'2F',elevation:8,title:'地上ホーム',description:'在来線1〜10番線・新幹線14〜19／20〜23番線',defaultZone:'platform-chuo'},
 {id:'M2F',elevation:4,title:'中間階',description:'新幹線の連絡階と八重洲側の飲食フロア（エリア間は分離）',defaultZone:'m2-east-north'},
 {id:'1F',elevation:0,title:'地上改札・通路',description:'丸の内・八重洲、各新幹線のりかえ口',defaultZone:'dome'},
 {id:'B1F',elevation:-7,title:'地下通路・京葉連絡通路',description:'本駅舎の地下と、1F南側から下る京葉連絡通路は別ルート',defaultZone:'keiyo-passage'},
 {id:'B2F',elevation:-14,title:'京葉地下改札',description:'京葉地下丸の内口・京葉地下八重洲口',defaultZone:'keiyo-concourse'},
 {id:'B3F',elevation:-21,title:'京葉中間コンコース',description:'京葉線ホームへ下る中間階',defaultZone:'keiyo-intermediate'},
 {id:'B4F',elevation:-28,title:'京葉ホーム／総武地下コンコース',description:'南側の京葉ホームと丸の内側の総武地下コンコースは別エリア',defaultZone:'keiyo-platform-12'},
 {id:'B5F',elevation:-35,title:'総武・横須賀線ホーム',description:'総武快速線・横須賀線 地下1〜4番線',defaultZone:'sobu-platform-12'}
];
export const FLOOR_AREAS={
 '1F':GROUND_AREAS,
 '2F':[-34,-21,-8,5,18,32,43,56,67,78].map(x=>({minX:x-3.3,maxX:x+3.3,minZ:-42,maxZ:42})),
 'M2F':[{minX:6,maxX:24,minZ:-65,maxZ:-43},{minX:6,maxX:24,minZ:43,maxZ:65},{minX:27,maxX:45,minZ:-29,maxZ:-6},{minX:27,maxX:45,minZ:43,maxZ:65},{minX:47,maxX:62,minZ:-38,maxZ:-8}],
 'B1F':[{minX:-60,maxX:62,minZ:-34,maxZ:34},{minX:24,maxX:40,minZ:44,maxZ:278}],
 'B2F':[{minX:-24,maxX:58,minZ:280,maxZ:322}],
 'B3F':[{minX:0,maxX:32,minZ:286,maxZ:318}],
 'B4F':[{minX:-28,maxX:60,minZ:290.5,maxZ:297.5},{minX:-28,maxX:60,minZ:308.5,maxZ:315.5},{minX:-63,maxX:-33,minZ:-30,maxZ:30}],
 'B5F':[{minX:-59.3,maxX:-52.7,minZ:-38,maxZ:38},{minX:-45.3,maxX:-38.7,minZ:-38,maxZ:38}]
};
const spot=(id,title,floor,x,z,group='general',kind='passage',extra={})=>({id,title,floor,x,z,yaw:0,pitch:.06,group,kind,en:title,subtitle:`${floor} / TOKYO STATION`,body:`${title}の散策エリアです。階層区分はJR東日本の構内図を参照し、寸法・設備の配置は体験用に簡略化しています。`,...extra});
const platforms=[[-34,'chuo','中央線 1・2番線','general'],[-21,'local-34','京浜東北・山手線 3・4番線','general'],[-8,'local-56','山手・京浜東北線 5・6番線','general'],[5,'local-78','上野東京ライン 7・8番線','general'],[18,'local-910','東海道線 9・10番線','general'],[32,'east-2021','JR東日本新幹線 20・21番線','east'],[43,'east-2223','JR東日本新幹線 22・23番線','east'],[56,'tokaido-1415','東海道・山陽新幹線 14・15番線','tokaido'],[67,'tokaido-1617','東海道・山陽新幹線 16・17番線','tokaido'],[78,'tokaido-1819','東海道・山陽新幹線 18・19番線','tokaido']];
export const FLOOR_ZONES=[...GROUND_ZONES.map(z=>({...z,floor:'1F'})),spot('keiyo-start','京葉線への下り口','1F',30,32,'keiyo','passage',{yaw:Math.PI,body:'1Fの南側からB1Fの京葉線連絡通路へ下ります。動く歩道と京葉B2F・B3Fを経由して、B4Fのホームへ進みます。'}),
 ...platforms.map(([x,id,title,group])=>spot(`platform-${id}`,title,'2F',x,0,group,'platform',{body:`2Fの${title}。北陸を含むJR東日本の新幹線は20〜23番線、東海道・山陽新幹線は14〜19番線です。ホーム間は線路を横断せず、連絡階・1Fを経由します。`})),
 spot('m2-east-north','JR東日本新幹線 北側中間階','M2F',15,-47,'east'),spot('m2-east-south','JR東日本新幹線 南側中間階','M2F',15,47,'east'),spot('m2-tokaido-central','東海道・山陽 中央中間階','M2F',36,-10,'tokaido'),spot('m2-tokaido-south','東海道・山陽 南側中間階','M2F',36,47,'tokaido'),spot('m2-yaekita','八重洲北側 中間階','M2F',54,-28,'general','passage',{body:'八重洲北側の改札外にある飲食フロアをイメージした中間階。新幹線改札内の連絡階とは分離したエリアです。'}),
 spot('b1-concourse','地下中央通路','B1F',-8,0),spot('marunouchi-underground','丸の内地下中央口','B1F',-49,0),spot('yaesu-underground','八重洲地下中央口','B1F',54,0),
 spot('keiyo-passage-entry','京葉線連絡通路 入口','B1F',32,50,'keiyo','passage',{yaw:Math.PI}),spot('keiyo-passage','京葉線連絡通路・動く歩道','B1F',32,157,'keiyo','passage',{yaw:Math.PI,body:'1F南側から下り、南に離れた京葉線ホームへ向かうB1Fの長い連絡通路です。動く歩道を通って京葉B2Fへ進みます。本駅舎B1Fの地下中央通路とは別の連絡ルートです。距離と配置は短縮したモデルです。'}),spot('keiyo-passage-end','京葉地下コンコースへの下り口','B1F',32,268,'keiyo','passage',{yaw:Math.PI}),
 spot('keiyo-marunouchi','京葉地下丸の内口','B2F',-12,294,'keiyo','exit'),spot('keiyo-yaesu','京葉地下八重洲口','B2F',48,294,'keiyo','exit'),spot('keiyo-concourse','京葉地下改札コンコース','B2F',16,300,'keiyo'),
 spot('keiyo-intermediate','京葉線 中間コンコース','B3F',16,302,'keiyo','passage',{body:'京葉B2Fの改札コンコースとB4Fホームの間にあるB3Fです。上下の階段・エスカレーターを経由します。'}),
 spot('keiyo-platform-12','京葉線 地下1・2番線','B4F',10,294,'keiyo','platform',{yaw:Math.PI/2,body:'京葉線・武蔵野線系統の地下ホームです。京葉線ホームはB4Fで、総武・横須賀線のB5Fホームとは別の場所です。'}),spot('keiyo-platform-34','京葉線 地下3・4番線','B4F',10,312,'keiyo','platform',{yaw:Math.PI/2}),spot('sobu-concourse','総武地下コンコース','B4F',-49,0,'sobu','passage',{body:'丸の内側にある総武快速線・横須賀線のB4Fコンコースです。同じB4Fでも南側の京葉線ホームとは離れた別エリアで、同一階を歩いて直接移動する通路は作っていません。'}),
 spot('sobu-platform-12','総武・横須賀線 地下1・2番線','B5F',-56,0,'sobu','platform'),spot('sobu-platform-34','総武・横須賀線 地下3・4番線','B5F',-42,0,'sobu','platform')
];
export const LINE_GROUPS={keiyo:{label:'京葉線・武蔵野線',shortLabel:'京葉線',color:'#e797a1',area:'京葉線 改札内',platforms:'地下1〜4番線'},sobu:{label:'総武快速線・横須賀線',shortLabel:'総武・横須賀線',color:'#a5b7e7',area:'総武線 改札内',platforms:'地下1〜4番線'}};
const end=(floor,x,z)=>({floor,x,z});
const link=(id,a,b,title='階段・エスカレーター',kind='stairs')=>({id,a,b,title,kind});
export const CONNECTORS=[
 link('main-underground',end('1F',-8,0),end('B1F',-8,0)),
 link('keiyo-entrance',end('1F',30,32),end('B1F',32,50),'京葉線連絡通路へ'),
 link('keiyo-b1-b2',end('B1F',32,270),end('B2F',32,286),'京葉地下コンコースへ'),
 link('keiyo-b2-b3',end('B2F',16,308),end('B3F',16,300)),
 link('keiyo-b3-b4-12',end('B3F',10,294),end('B4F',10,294)),
 link('keiyo-b3-b4-34',end('B3F',10,312),end('B4F',10,312)),
 link('sobu-deep',end('B1F',-49,0),end('B4F',-49,0),'総武地下コンコース エレベーター','elevator'),
 link('sobu-b4-b5-12',end('B4F',-56,-8),end('B5F',-56,0)),link('sobu-b4-b5-34',end('B4F',-42,8),end('B5F',-42,0)),
 link('yaekita-upper',end('1F',54,-20),end('M2F',54,-20),'八重洲北側の中間階へ'),
 ...[[-34,-31],[-21,-20],[-8,-8],[5,5],[18,18]].map(([top,ground],i)=>link(`local-platform-${i}`,end('1F',ground,0),end('2F',top,0),'在来線ホーム エレベーター','elevator')),
 link('east-north-m2',end('1F',15,-51),end('M2F',15,-49)),link('east-south-m2',end('1F',15,51),end('M2F',15,49)),
 link('tokaido-central-m2',end('1F',36,-19),end('M2F',36,-15)),link('tokaido-south-m2',end('1F',36,51),end('M2F',36,49)),
 ...[-1,1].flatMap(side=>[32,43].map((x,i)=>link(`east-${side<0?'north':'south'}-platform-${i}`,end('M2F',12+i*7,side*59),end('2F',x,side*30),'JR東日本 新幹線ホームへ'))),
 ...[-1,1].flatMap(side=>[56,67,78].map((x,i)=>link(`tokaido-${side<0?'central':'south'}-platform-${i}`,end('M2F',31+i*5,side<0?-24:59),end('2F',x,side<0?0:30),'東海道・山陽 ホームへ')))
];
export const floorById=id=>FLOORS.find(f=>f.id===id);
export function insideFloor(x,z,floor='1F'){return (FLOOR_AREAS[floor]??[]).some(a=>x>=a.minX&&x<=a.maxX&&z>=a.minZ&&z<=a.maxZ)}
export const endpoints=floor=>CONNECTORS.flatMap(c=>c.a.floor===floor?[{...c.a,connector:c,to:c.b}]:c.b.floor===floor?[{...c.b,connector:c,to:c.a}]:[]);
export function nearestConnector(point,floor,radius=3.3){return endpoints(floor).map(p=>({...p,distance:Math.hypot(point.x-p.x,point.z-p.z)})).filter(p=>p.distance<radius).sort((a,b)=>a.distance-b.distance)}
export function walkwayVelocity(x,z,floor){if(floor!=='B1F'||![[76,142],[172,238]].some(([a,b])=>z>a&&z<b))return 0;return x>26&&x<30?.85:x>34&&x<38?-.85:0}
// Visibility graph with explicit vertical links. Equal floor labels never imply
// a connection (notably main/Keiyo B1F and Keiyo/Sobu B4F).
export function buildingRoute(from,to,isAllowed=(x,z,floor)=>insideFloor(x,z,floor)){
 const visible=(a,b)=>{if(a.floor!==b.floor)return false;const count=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)/.25));for(let i=0;i<=count;i++)if(!isAllowed(a.x+(b.x-a.x)*i/count,a.z+(b.z-a.z)*i/count,a.floor))return false;return true};
 const nodes=[{...from,id:'@start'},{...to,id:'@goal'},...FLOOR_ZONES.map(z=>({...z,id:`zone:${z.id}`})),...GROUND_NODES.map(n=>({...n,floor:'1F',id:`ground:${n.id}`}))];
 for(const connector of CONNECTORS){nodes.push({...connector.a,id:`${connector.id}:a`},{...connector.b,id:`${connector.id}:b`})}
 const cache=new Map(),dist=new Map([['@start',0]]),prev=new Map(),pending=new Set(nodes.map(n=>n.id));
 const sameFloor=new Map();for(const n of nodes){const list=sameFloor.get(n.floor)??[];list.push(n);sameFloor.set(n.floor,list)}
 while(pending.size){let id=[...pending].reduce((a,b)=>(dist.get(a)??Infinity)<(dist.get(b)??Infinity)?a:b);if(!Number.isFinite(dist.get(id)))break;pending.delete(id);if(id==='@goal')break;const a=nodes.find(n=>n.id===id);const nexts=[];
 for(const b of sameFloor.get(a.floor)){if(!pending.has(b.id))continue;const key=[a.id,b.id].sort().join('|');let open=cache.get(key);if(open===undefined){open=visible(a,b);cache.set(key,open)}if(open)nexts.push({b,cost:Math.hypot(a.x-b.x,a.z-b.z),kind:'walk'})}
 for(const c of CONNECTORS){const other=a.id===`${c.id}:a`?`${c.id}:b`:a.id===`${c.id}:b`?`${c.id}:a`:null;if(other&&pending.has(other)){const b=nodes.find(n=>n.id===other);if(isAllowed(b.x,b.z,b.floor))nexts.push({b,cost:20,kind:'transfer',connectorId:c.id})}}
 for(const edge of nexts){const value=dist.get(id)+edge.cost;if(value<(dist.get(edge.b.id)??Infinity)){dist.set(edge.b.id,value);prev.set(edge.b.id,{id,kind:edge.kind,connectorId:edge.connectorId})}}
 }
 if(!dist.has('@goal'))return [];const route=[];let id='@goal';while(id!=='@start'){const node=nodes.find(n=>n.id===id),step=prev.get(id);if(!step)return [];route.unshift({x:node.x,z:node.z,floor:node.floor,kind:step.kind,connectorId:step.connectorId});id=step.id}return route;
}
