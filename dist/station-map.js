import {GROUPS as BASE_GROUPS} from './station-layout.js?v=6';
import {FLOOR_AREAS,FLOOR_ZONES,FLOORS,LINE_GROUPS,CONNECTORS} from './floor-layout.js?v=6';
import {GATES,resolveLocation} from './station-guide-data.js?v=6';

const NS='http://www.w3.org/2000/svg',GROUPS={...BASE_GROUPS,...LINE_GROUPS};
const COLORS={public:'#dedfd0',general:'#b9caaa',east:'#b5d3dd',tokaido:'#e7c89f',keiyo:'#e5bdc7',sobu:'#c5bddd'};
const floorInfo=id=>FLOORS.find(f=>f.id===id);
const inside=(p,a)=>p.x>=a.minX&&p.x<=a.maxX&&p.z>=a.minZ&&p.z<=a.maxZ;
const iso=(x,z,y)=>[x+.42*z,.42*z-9*y];
function el(name,attrs={},text){const node=document.createElementNS(NS,name);for(const [k,v]of Object.entries(attrs))node.setAttribute(k,String(v));if(text!==undefined)node.textContent=text;return node;}
function boundsFor(areas){return {x:Math.min(...areas.map(a=>a.minX)),y:Math.min(...areas.map(a=>a.minZ)),w:Math.max(...areas.map(a=>a.maxX))-Math.min(...areas.map(a=>a.minX)),h:Math.max(...areas.map(a=>a.maxZ))-Math.min(...areas.map(a=>a.minZ))};}
function islandFor(floor,p){const areas=FLOOR_AREAS[floor]??[];const found=areas.find(a=>inside(p,a));if(!found)return areas;
 if(floor==='B1F')return [found];
 if(floor==='B4F')return p.z>250?areas.filter(a=>a.minZ>250):areas.filter(a=>a.maxZ<100);
 if(floor==='M2F')return [found];return areas;}
const plans=new Map();
function patchesFor(id){if(plans.has(id))return plans.get(id);const areas=FLOOR_AREAS[id]??[],gates=GATES.filter(g=>g.floor===id);
 const xs=[...new Set([...areas.flatMap(a=>[a.minX,a.maxX]),...gates.filter(g=>g.axis==='x').map(g=>g.x),-49,-40,48,54,-12,6,24,28,44])].sort((a,b)=>a-b);
 const zs=[...new Set([...areas.flatMap(a=>[a.minZ,a.maxZ]),...gates.filter(g=>g.axis==='z').map(g=>g.z),-48,48,-17])].sort((a,b)=>a-b);
 const patches=[],active=new Map();
 for(let j=0;j<zs.length-1;j++){const row=[],next=new Map();for(let i=0;i<xs.length-1;i++){const p={x:(xs[i]+xs[i+1])/2,z:(zs[j]+zs[j+1])/2,floor:id};if(!areas.some(a=>inside(p,a)))continue;const loc=resolveLocation(p),color=loc.paid?COLORS[loc.group]??COLORS.general:COLORS.public,last=row.at(-1);if(last&&last.x1===xs[i]&&last.color===color)last.x1=xs[i+1];else row.push({x0:xs[i],x1:xs[i+1],z0:zs[j],z1:zs[j+1],color});}
 for(const r of row){const key=`${r.x0}:${r.x1}:${r.color}`,old=active.get(key);if(old&&old.z1===r.z0){old.z1=r.z1;next.set(key,old);}else{patches.push(r);next.set(key,r);}}active.clear();for(const [k,v]of next)active.set(k,v);}
 plans.set(id,patches);return patches;}

export function buildMap(svg,{mini=false,onJump=()=>{},onSelectGate=()=>{}}={}){
 let currentFloor='1F',viewFloor='1F',point={x:-52,z:33},yaw=0,group='all',selectedGate=null,selectedSpot=null;
 let view=null,base=null,userView=false,lastMiniKey='',player=null,scene=null,markers=[],drag=null,suppressClick=false;
 svg.classList.add('station-map');svg.style.background='#f2f0e7';svg.style.touchAction=mini?'auto':'none';svg.setAttribute('preserveAspectRatio','xMidYMid meet');
 svg.setAttribute('aria-label',mini?'現在階の地図。赤い丸が現在地、赤い扇形が見ている方向':'東京駅の構内マップ。改札と散策地点を選べます');
 const dimensions=()=>({w:svg.clientWidth|| (mini?190:740),h:svg.clientHeight||(mini?140:450)});
 function units(){const d=dimensions();return Math.max(view.w/d.w,view.h/d.h);}
 function fit(box,padding=mini?12:25){const d=dimensions(),s=Math.max(box.w/Math.max(1,d.w-padding*2),box.h/Math.max(1,d.h-padding*2),.1);return {x:box.x+box.w/2-d.w*s/2,y:box.y+box.h/2-d.h*s/2,w:d.w*s,h:d.h*s};}
 function overviewBounds(){const points=FLOORS.flatMap(f=>(FLOOR_AREAS[f.id]??[]).flatMap(a=>[[a.minX,a.minZ],[a.maxX,a.maxZ],[a.minX,a.maxZ],[a.maxX,a.minZ]].map(([x,z])=>iso(x,z,f.elevation))));return {x:Math.min(...points.map(p=>p[0])),y:Math.min(...points.map(p=>p[1])),w:Math.max(...points.map(p=>p[0]))-Math.min(...points.map(p=>p[0])),h:Math.max(...points.map(p=>p[1]))-Math.min(...points.map(p=>p[1]))};}
 function fitFloor(focus=null){let box;if(viewFloor==='overview')box=overviewBounds();else{let areas=FLOOR_AREAS[viewFloor]??FLOOR_AREAS['1F'];if(focus)areas=islandFor(viewFloor,focus);if(mini)areas=islandFor(viewFloor,point);box=boundsFor(areas);
 if(mini&&viewFloor==='B1F'&&point.z>40)box={x:point.x-28,y:Math.max(42,Math.min(190,point.z-44)),w:56,h:88};}
 base=fit(box);view={...base};userView=false;}
 function project(x,z,floor=viewFloor){return viewFloor==='overview'?iso(x,z,floorInfo(floor).elevation):[x,z];}
 function label(parent,text,x,y,{size=11,color='#3b5148',anchor='start',bold=false}={}){const t=el('text',{x,y,fill:color,'font-size':size*units(),'text-anchor':anchor,'font-family':'system-ui,sans-serif','font-weight':bold?650:450,'paint-order':'stroke',stroke:'#f2f0e7','stroke-width':3*units(),'stroke-linejoin':'round','pointer-events':'none'},text);t.style.fontSize=`${size*units()}px`;t.style.fill=color;t.style.stroke='#f2f0e7';t.style.strokeWidth=`${3*units()}px`;parent.append(t);return t;}
 function addMarker(item,kind,index){const isLandmark=item.kind==='landmark',p=project(isLandmark?item.modelX:item.x,isLandmark?item.modelZ:item.z,item.floor),s=units(),isGate=kind==='gate',selected=isGate?selectedGate===item.id:selectedSpot===item.id,color=item.color??GROUPS[item.group]?.color??'#56744f';
 const node=el('g',{'data-map-group':item.group??'general',role:mini?'presentation':'button',tabindex:mini?-1:0,'aria-label':`${item.floor} ${item.title}`,transform:`translate(${p[0]} ${p[1]})`});
 node.setAttribute(isGate?'data-map-gate':'data-map-zone',item.id);if(isLandmark)node.setAttribute('data-map-landmark',item.id);node.style.cursor=mini?'default':'pointer';node.append(el('title',{},`${item.title} · ${item.floor}${item.destination?' · '+item.destination:''}`));
 if(!mini)node.append(el('circle',{r:11*s,fill:'transparent'}));
 if(isGate){const r=(mini?3.4:6.6)*s;node.append(el('rect',{x:-r,y:-r,width:r*2,height:r*2,rx:1.2*s,fill:color,stroke:'#fffdf5','stroke-width':1.2*s}));for(const dx of[-2.5,0,2.5])node.append(el('path',{d:`M${dx*s} ${-3*s}v${6*s}`,stroke:'#fffdf5','stroke-width':1.1*s}));}
 else if(isLandmark){const r=(mini?3.7:9)*s;node.append(el('path',{d:`M0 ${-r}L${r} 0L0 ${r}L${-r} 0Z`,fill:selected?'#a77e35':'#f1db94',stroke:'#9a7c42','stroke-width':1.1*s}));if(!mini){const glyph=el('text',{y:3*s,'text-anchor':'middle','font-size':9*s,'font-family':'system-ui,sans-serif',fill:selected?'#fffdf7':'#725b2e'},{bell:'鈴',wheel:'輪',square:'0',post:'〒'}[item.icon]??'◆');glyph.style.fontSize=`${9*s}px`;node.append(glyph);}}
 else{const r=(mini?2.2:6)*s;node.append(el('circle',{r,fill:selected?'#536e4c':'#fffdf4',stroke:'#72846a','stroke-width':1.05*s}));if(!mini){const number=el('text',{y:2.8*s,'text-anchor':'middle','font-size':8*s,'font-family':'system-ui,sans-serif',fill:selected?'#ffffff':'#4d6549'},String(index+1));number.style.fontSize=`${8*s}px`;number.style.fill=selected?'#ffffff':'#4d6549';node.append(number);}}
 if(selected)node.append(el('rect',{x:-10*s,y:-10*s,width:20*s,height:20*s,rx:3*s,fill:'none',stroke:'#304d42','stroke-width':1.6*s}));
 const title=label(node,item.title.length>25?item.title.slice(0,24)+'…':item.title,10*s,-10*s,{size:mini?9:11,bold:true});const pinned=isLandmark&&!mini&&viewFloor!=='overview';title.style.display=selected||pinned?'':'none';
 if(!mini){const activate=()=>{if(suppressClick)return;if(isGate){api.selectGate(item.id);onSelectGate(item.id);}else{api.selectSpot(item.id);onJump(item.id);}};node.addEventListener('click',e=>{e.stopPropagation();activate();});node.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate();}});node.addEventListener('pointerenter',()=>title.style.display='');node.addEventListener('pointerleave',()=>{if(!selected&&!pinned)title.style.display='none';});node.addEventListener('focus',()=>title.style.display='');node.addEventListener('blur',()=>{if(!selected&&!pinned)title.style.display='none';});}
 scene.append(node);markers.push(node);}
 function drawPlayer(){if(!player)return;const visible=viewFloor==='overview'||viewFloor===currentFloor;player.style.display=visible?'':'none';if(!visible)return;const p=project(point.x,point.z,currentFloor);let angle=-yaw;if(viewFloor==='overview'){const dx=-Math.sin(yaw),dz=-Math.cos(yaw);angle=Math.atan2(dx+.42*dz,-.42*dz);}player.setAttribute('transform',`translate(${p[0]} ${p[1]}) rotate(${angle*180/Math.PI})`);}
 function playerNode(){const s=units();player=el('g',{class:'map-player','aria-label':'現在地と見ている方向','pointer-events':'none'});const r=25*s,angle=.53;player.append(el('path',{d:`M0 0 L${-Math.sin(angle)*r} ${-Math.cos(angle)*r} A${r} ${r} 0 0 1 ${Math.sin(angle)*r} ${-Math.cos(angle)*r} Z`,fill:'#df263d',opacity:'.25'}),el('circle',{r:10*s,fill:'#df263d',opacity:'.15'}),el('circle',{r:6.6*s,fill:'#fffdf7',stroke:'#f2f0e7','stroke-width':.8*s}),el('circle',{r:4.8*s,fill:'#d9253b'}));scene.append(player);drawPlayer();}
 function applyFilter(){for(const marker of markers)marker.style.opacity=group==='all'||marker.dataset.mapGroup==='general'||marker.dataset.mapGroup===group?'1':'.23';}
 function updateLabels(){const loc=resolveLocation({...point,floor:currentFloor});const status=svg.querySelector('[data-map-current-label]');if(status)status.textContent=viewFloor===currentFloor||viewFloor==='overview'?`● 現在地 ${currentFloor} ${loc.title??''}`:`現在地は ${currentFloor} · この階には表示されません`;const viewTitle=viewFloor==='overview'?'立体マップ':`${viewFloor} · ${floorInfo(viewFloor).title}`;
 if(mini){const area=document.getElementById('mini-area-label'),floor=document.getElementById('mini-floor-label');if(area)area.textContent=loc.title??loc.areaLabel;if(floor)floor.textContent=currentFloor;}
 else{for(const id of['mainmap-area-label','map-area-label']){const node=document.getElementById(id);if(node)node.textContent=viewFloor==='overview'?`立体マップ · 現在地 ${currentFloor} ${loc.title??''}`:viewFloor===currentFloor?`${viewTitle} · 現在地 ${loc.title??''}`:`${viewTitle} を閲覧中 · 現在地 ${currentFloor}`;}}}
 function draw(){if(!view)fitFloor();svg.replaceChildren();markers=[];svg.setAttribute('viewBox',`${view.x} ${view.y} ${view.w} ${view.h}`);svg.dataset.viewFloor=viewFloor;scene=el('g',{'data-map-scene':''});svg.append(scene);const s=units();
 const drawFloor=id=>{const f=floorInfo(id),projectHere=(x,z)=>project(x,z,id);for(const a of patchesFor(id)){const pts=[[a.x0,a.z0],[a.x1,a.z0],[a.x1,a.z1],[a.x0,a.z1]].map(([x,z])=>projectHere(x,z));scene.append(el('polygon',{points:pts.map(p=>p.join(',')).join(' '),fill:a.color,stroke:'#7b8b702b','stroke-width':.65*s}));}
 for(const a of FLOOR_AREAS[id]){const pts=[[a.minX,a.minZ],[a.maxX,a.minZ],[a.maxX,a.maxZ],[a.minX,a.maxZ]].map(([x,z])=>projectHere(x,z));scene.append(el('polygon',{points:pts.map(p=>p.join(',')).join(' '),fill:'none',stroke:'#7b8971','stroke-width':.8*s}));}
 if(viewFloor==='overview'){const b=boundsFor(FLOOR_AREAS[id]),p=projectHere(b.x,b.y);label(scene,id,p[0]-6*s,p[1]-5*s,{size:10,bold:true});}};
 if(viewFloor==='overview'){for(const f of [...FLOORS].reverse())drawFloor(f.id);for(const c of CONNECTORS){const a=project(c.a.x,c.a.z,c.a.floor),b=project(c.b.x,c.b.z,c.b.floor);scene.append(el('path',{d:`M${a.join(' ')}L${b.join(' ')}`,stroke:'#bf9a48','stroke-width':2.6*s,opacity:'.75','stroke-linecap':'round'}));}}
 else{drawFloor(viewFloor);for(const c of CONNECTORS){const endpoint=c.a.floor===viewFloor?c.a:c.b.floor===viewFloor?c.b:null;if(!endpoint)continue;const other=endpoint===c.a?c.b:c.a,p=project(endpoint.x,endpoint.z),r=(mini?3:5)*s;scene.append(el('rect',{x:p[0]-r,y:p[1]-r,width:r*2,height:r*2,fill:'#dcc075',stroke:'#ac914d','stroke-width':.7*s}));for(let i=-2;i<=2;i++)scene.append(el('path',{d:`M${p[0]-r} ${p[1]+i*r/3}h${r*2}`,stroke:'#9f874e','stroke-width':.5*s}));if(!mini)label(scene,other.floor,p[0]+7*s,p[1]-5*s,{size:9,color:'#826c36'});}}
 FLOOR_ZONES.forEach((spot,i)=>{if(viewFloor==='overview'||spot.floor===viewFloor)addMarker(spot,'spot',i);});for(const gate of GATES)if(viewFloor==='overview'||gate.floor===viewFloor)addMarker(gate,'gate',0);
 playerNode();label(svg,viewFloor==='overview'?'北 N ↖':'N ↑',view.x+view.w-12*s,view.y+17*s,{anchor:'end',size:10});
 if(!mini){const loc=resolveLocation({...point,floor:currentFloor});const currentLabel=label(svg,viewFloor===currentFloor||viewFloor==='overview'?`● 現在地 ${currentFloor} ${loc.title??''}`:`現在地は ${currentFloor} · この階には表示されません`,view.x+12*s,view.y+view.h-12*s,{size:10,color:'#a02a37',bold:true});currentLabel.setAttribute('data-map-current-label','');}
 applyFilter();updateLabels();}
 function miniKey(){if(currentFloor==='B1F'&&point.z>40)return `${currentFloor}:keiyo:${Math.floor(point.z/18)}`;const list=islandFor(currentFloor,point);return `${currentFloor}:${list.map(a=>`${a.minX},${a.minZ}`).join(';')}`;}
 function select(item,kind){if(!item)return;selectedGate=kind==='gate'?item.id:null;selectedSpot=kind==='spot'?item.id:null;if(!mini){viewFloor=item.floor;fitFloor(item);const b=boundsFor(islandFor(item.floor,item));if(b.w>135||b.h>135){base=fit({x:item.x-45,y:item.z-42,w:90,h:84});view={...base};}}draw();}
 const api={
 update(x,z,heading,id=currentFloor){if(!floorInfo(id)||![x,z,heading].every(Number.isFinite))return;point={x,z};yaw=heading;currentFloor=id;if(mini){viewFloor=id;const key=miniKey();if(key!==lastMiniKey){lastMiniKey=key;fitFloor();draw();}else{drawPlayer();updateLabels();}}else{drawPlayer();updateLabels();}},
 filter(id){group=id;applyFilter();},
 setFloor(id){api.setViewFloor(id);},
 setViewFloor(id){if(mini)return;if(id!=='overview'&&!floorInfo(id))return;viewFloor=id;selectedGate=selectedSpot=null;fitFloor();draw();},
 getViewFloor(){return viewFloor;},selectGate(id){select(GATES.find(g=>g.id===id),'gate');},selectSpot(id){select(FLOOR_ZONES.find(z=>z.id===id),'spot');},
 zoom(factor){if(mini||!Number.isFinite(factor)||factor<=0)return;const ratio=Math.max(.13,Math.min(2,view.w/base.w/factor)),w=base.w*ratio,h=base.h*ratio;view={x:view.x+view.w/2-w/2,y:view.y+view.h/2-h/2,w,h};userView=true;draw();},
 resetView(){fitFloor();draw();}
 };
 if(!mini){svg.addEventListener('wheel',e=>{e.preventDefault();api.zoom(Math.exp(-e.deltaY*.0015));},{passive:false});svg.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('[data-map-gate],[data-map-zone]'))return;drag={x:e.clientX,y:e.clientY,view:{...view}};suppressClick=false;svg.setPointerCapture(e.pointerId);});svg.addEventListener('pointermove',e=>{if(!drag)return;const d=dimensions(),s=Math.max(drag.view.w/d.w,drag.view.h/d.h),dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>3)suppressClick=true;view={...drag.view,x:drag.view.x-dx*s,y:drag.view.y-dy*s};userView=true;draw();});const end=()=>{drag=null;setTimeout(()=>suppressClick=false,0);};for(const type of['pointerup','pointercancel','lostpointercapture'])svg.addEventListener(type,end);}
 if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>{if(!userView)fitFloor();draw();}).observe(svg);
 fitFloor();draw();return api;
}
