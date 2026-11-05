import {FLOOR_AREAS,FLOOR_ZONES} from './floor-layout.js';

// Representative, stationary visual models. Five-car consists are shortened to
// fit this schematic; neither a dedicated platform assignment nor a timetable.
const definitions=[
 ['platform-chuo','中央線（快速）','E233系','commuter','#ed7a22','#ed7a22'],
 ['platform-local-34','京浜東北線','E233系','commuter','#43a8d2','#43a8d2'],
 ['platform-local-56','山手線','E235系','yamanote','#8fbd3e','#8fbd3e'],
 ['platform-local-78','上野東京ライン','E233系','commuter','#198552','#ef913b'],
 ['platform-local-910','東海道線','E233系','commuter','#198552','#ef913b'],
 ['platform-east-2021','東北・北海道新幹線','E5系','e5','#158e76','#df6c97'],
 ['platform-east-2223','北陸新幹線','E7系','e7','#459ac7','#bd8b59'],
 ['platform-tokaido-1415','東海道・山陽新幹線','N700系','n700','#2467b2','#2467b2'],
 ['platform-tokaido-1617','東海道・山陽新幹線','N700系','n700','#2467b2','#2467b2'],
 ['platform-tokaido-1819','東海道・山陽新幹線','N700系','n700','#2467b2','#2467b2'],
 ['keiyo-platform-12','京葉線','E233系','commuter','#b33259','#b33259'],
 ['keiyo-platform-34','武蔵野線','E231系','commuter','#e57932','#754935'],
 ['sobu-platform-12','総武快速線・横須賀線','E235系','commuter','#376ca8','#e6dbc0'],
 ['sobu-platform-34','総武快速線・横須賀線','E235系','commuter','#376ca8','#e6dbc0']
];
export const TRAIN_SERVICES=definitions.map(([zoneId,label,model,style,color,accentColor])=>{
 const zone=FLOOR_ZONES.find(z=>z.id===zoneId),area=FLOOR_AREAS[zone.floor].find(a=>zone.x>=a.minX&&zone.x<=a.maxX&&zone.z>=a.minZ&&zone.z<=a.maxZ),ew=zone.floor==='B4F';
 const viewX=ew?area.minX+1.4:zone.x,viewZ=ew?zone.z:area.minZ+1.4;
 const targetX=ew?(area.minX+area.maxX)/2-31:area.minX-2.1,targetZ=ew?area.minZ-2.1:(area.minZ+area.maxZ)/2-31;
 const viewYaw=Math.atan2(viewX-targetX,viewZ-targetZ);
 return {id:`train-${zoneId}`,zoneId,label,model,platformLabel:zone.title.match(/(?:地下)?\d+・\d+番線/)?.[0]??zone.title,floor:zone.floor,group:zone.group,style,color,accentColor,bodyColor:['e5','e7','n700'].includes(style)?'#eef1e9':'#c3cbcc',cars:5,side:'min',orientation:zone.floor==='B4F'?'ew':'ns',viewX,viewZ,viewYaw,note:'停車する代表車両の概略模型です。5両に短縮しており、乗車・発着は行いません。専用番線や実際の運用を示すものではありません。'};
});
