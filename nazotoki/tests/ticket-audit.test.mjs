import test from 'node:test';
import assert from 'node:assert/strict';
import {createTicketEpisode} from '../dist/game/ticket.js';
import {sanitizeProgress} from '../dist/game/ticket-state.js';

// A small document fixture exercises the episode's real buttons and storage.
// WebGL previews intentionally take the supported unavailable-preview path.
class Element{
  constructor(tag,document){this.tagName=tag.toUpperCase();this.ownerDocument=document;this.children=[];this.dataset={};this.style={setProperty(){}};this.attributes=new Map();this.listeners=new Map();this.hidden=false;this.disabled=false;this.value='';this.className='';this._text='';this.classList={toggle:(name,on)=>{const classes=new Set(this.className.split(/\s+/).filter(Boolean));if(on)classes.add(name);else classes.delete(name);this.className=[...classes].join(' ');}};}
  get textContent(){return this._text+this.children.map(child=>child.textContent).join('');}
  set textContent(value){this._text=String(value);this.children=[];}
  get lastChild(){return this.children.at(-1);}
  get nodeType(){return 1;}
  get isConnected(){return this===this.ownerDocument.body||Boolean(this.parentElement?.isConnected);}
  append(...children){for(const child of children){child.remove();child.parentElement=this;this.children.push(child);}}
  prepend(child){child.remove();child.parentElement=this;this.children.unshift(child);}
  insertBefore(child,before){child.remove();child.parentElement=this;this.children.splice(this.children.indexOf(before),0,child);}
  before(child){this.parentElement?.insertBefore(child,this);}
  replaceChildren(...children){for(const child of this.children)child.parentElement=null;this.children=[];this._text='';this.append(...children);}
  remove(){if(this.parentElement){const parent=this.parentElement;parent.children=parent.children.filter(child=>child!==this);this.parentElement=null;}}
  setAttribute(key,value){this.attributes.set(key,String(value));}
  getAttribute(key){return this.attributes.get(key)??null;}
  addEventListener(type,handler){if(!this.listeners.has(type))this.listeners.set(type,[]);this.listeners.get(type).push(handler);}
  removeEventListener(type,handler){this.listeners.set(type,(this.listeners.get(type)??[]).filter(item=>item!==handler));}
  click(){assert.equal(this.disabled,false,'The player can activate this button');for(const handler of this.listeners.get('click')??[])handler({target:this});}
  focus(){this.ownerDocument.activeElement=this;}
  contains(element){return element===this||this.children.some(child=>child.contains(element));}
  closest(selector){return this.matches(selector)?this:this.parentElement?.closest(selector)??null;}
  matches(selector){
    if(selector.includes(':not([disabled])')&&this.disabled)return false;
    selector=selector.replace(':not([disabled])','');
    if(selector==='[hidden]')return this.hidden;
    if(selector.startsWith('.'))return this.className.split(/\s+/).includes(selector.slice(1));
    if(selector.startsWith('#'))return this.id===selector.slice(1);
    return this.tagName.toLowerCase()===selector;
  }
  querySelectorAll(selector){const choices=selector.split(',').map(item=>item.trim()),found=[];for(const child of this.children){if(choices.some(item=>child.matches(item)))found.push(child);found.push(...child.querySelectorAll(selector));}return found;}
  querySelector(selector){return this.querySelectorAll(selector)[0]??null;}
  getContext(){return null;}
}

function storage(entries=[]){const values=new Map(entries);return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)};}
const SAVE_KEY='tswg:time-letter:v1',TEAM_KEY='tswg:time-letter:room';
const settle=()=>new Promise(resolve=>setImmediate(resolve));

function fixture(t,solo,{shared={version:1,stage:3,delivered:true},looking=false}={}){
  const document={activeElement:null,hidden:false,createElement(tag){return new Element(tag,this);},createElementNS(_namespace,tag){return this.createElement(tag);},addEventListener(){},removeEventListener(){}};
  document.body=document.createElement('body');const welcome=document.createElement('div');welcome.id='welcome';const start=document.createElement('button');start.id='start';welcome.append(start);const nav=document.createElement('nav');nav.className='bottom-nav';document.body.append(welcome,nav);
  document.querySelector=selector=>selector==='#welcome #start'?start:document.body.querySelector(selector);
  const localStorage=storage([[SAVE_KEY,JSON.stringify(solo)]]),sessionStorage=storage(),window={};window.self=window.top=window;
  const previous=new Map();for(const [key,value] of Object.entries({document,localStorage,sessionStorage,window,location:new URL('https://game.test/play.html')})){previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});}
  const requests=[];
  t.mock.method(console,'error',()=>{});
  t.mock.method(globalThis,'fetch',async(path,options)=>{
    requests.push({path,body:JSON.parse(options.body)});
    if(path.endsWith('/leave'))return Response.json({left:true});
    assert.equal(path,'/api/rooms/ABC234/join');
    return Response.json({room:{code:'ABC234',...shared},selfId:'self',token:'a'.repeat(64),members:[{id:'self',name:'旅人',avatarId:'red',online:true}]});
  });
  let position={floor:'B1F',x:0,z:0,y:1.65,yaw:0};
  const api={getPlayer:()=>position,isActive:()=>true,project:()=>({visible:looking}),jumpTo(){},onNotice(){},onModalChange(){},onSelect:()=>true,reducedMotion:true};
  let episode=createTicketEpisode(api);
  t.after(()=>{episode.dispose();for(const [key,descriptor] of previous){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}});
  const button=(label)=>{const result=document.body.querySelectorAll('button').find(element=>element.textContent===label);assert.ok(result,`The episode shows the ${label} button`);return result;};
  return {get episode(){return episode;},reload(){episode.dispose();episode=createTicketEpisode(api);},document,localStorage,sessionStorage,requests,button,setPosition:value=>{position={...position,...value};}};
}

for(const [label,solo,shared,expected] of [
  ['a newly completed shared story',{version:1,stage:1,delivered:false},{version:1,stage:3,delivered:true},{version:1,stage:3,delivered:true}],
  ['an earlier solo completion',{version:1,stage:3,delivered:true},{version:1,stage:1,delivered:false},{version:1,stage:3,delivered:true}],
  ['unfinished shared discoveries',{version:1,stage:1,delivered:false},{version:1,stage:2,delivered:false},{version:1,stage:2,delivered:false}],
])test(`leaving a room preserves ${label} after reload and clears its reconnection session`,async t=>{
  const ui=fixture(t,solo,{shared});
  ui.episode.openIntro();ui.button('仲間と遊ぶ（1〜4人）').click();
  const code=ui.document.body.querySelectorAll('input').find(input=>input.name==='room');code.value='ABC234';
  ui.button('この部屋に参加する').click();await settle();
  assert.ok(ui.sessionStorage.getItem(TEAM_KEY));
  ui.button('部屋から退出する').click();await settle();
  assert.equal(ui.sessionStorage.getItem(TEAM_KEY),null);
  assert.deepEqual(sanitizeProgress(JSON.parse(ui.localStorage.getItem(SAVE_KEY))),expected);
  assert.deepEqual(ui.requests.at(-1),{path:'/api/rooms/ABC234/leave',body:{token:'a'.repeat(64)}});
  ui.reload();ui.episode.openIntro();
  assert.ok(ui.button(expected.delivered?'届いた手紙を読み返す':'つづきから遊ぶ'));
});

test('the raised ticket switches between approach and turn guidance when walking into and out of range',t=>{
  const ui=fixture(t,{version:1,stage:0,delivered:false});
  ui.document.body.querySelector('#ticket-resume').click();
  const toggle=ui.document.body.querySelector('#ticket-toggle'),footer=ui.document.body.querySelector('.tg-lens-foot');
  toggle.click();const far=footer.textContent;assert.match(far,/銀の鈴/);
  ui.setPosition({x:34,z:10});toggle.click();toggle.click();
  assert.match(footer.textContent,/ドラッグ/);assert.notEqual(footer.textContent,far);
  assert.equal(ui.document.body.querySelector('#ticket-read').hidden,true,'Turning toward the landmark is still required');
  ui.setPosition({x:0,z:0});toggle.click();toggle.click();assert.equal(footer.textContent,far);
});
