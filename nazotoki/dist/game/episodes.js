import {createTicketEpisode} from './ticket.js?v=audit3';
import {createFarewellEpisode} from './farewell.js?v=audit3';
import {createPhotographEpisode} from './photograph.js?v=audit3';
import {createPromiseEpisode} from './promise.js?v=audit3';

// Each episode owns its progress and actors; the station remains shared.
export function createStoryEpisodes(api){
  let active='ticket',chooserOpen=false,previousFocus=null;
  const stories={};
  const root=document.createElement('div');root.id='story-picker';
  root.innerHTML='<div class="stories-scrim" hidden></div><section class="stories-panel" role="dialog" aria-modal="true" aria-labelledby="stories-title" tabindex="-1" hidden><header><div><small>東京駅で、四つの物語。</small><h2 id="stories-title">物語を選ぶ</h2></div><button type="button" class="stories-close" aria-label="物語の選択を閉じる">×</button></header><p>どの作品からでも遊べます。途中の記録は、それぞれ保存されます。</p><button type="button" class="story-card" data-story="photograph"><small>第3作 · 1人で遊ぶ · 写真の形と立ち位置の謎 · 6階層を探索</small><strong>写真に写らなかった君</strong><span>京葉線の長い通路から、総武・横須賀線のB5Fへ。今日の自分が写る一枚を探す。</span></button><button type="button" class="story-card" data-story="farewell"><small>第2作 · 1人で遊ぶ · 写真と言葉の謎 · 地下から地上ホームへ</small><strong>さよならを言わない待ち合わせ</strong><span>紬と一緒に、中間階を通って新幹線ホームへ。晴の「最後の宝探し」をたどる。</span></button><button type="button" class="story-card" data-story="ticket"><small>第1作 · 1〜4人 · やさしい謎 · 1FとB1Fの目印を巡る</small><strong>時を超えた一通</strong><span>古い切符がうつす案内をたどり、手紙を届ける。</span></button></section>';
  document.body.append(root);
  const panel=root.querySelector('section'),scrim=root.querySelector('.stories-scrim');
  const promiseCard=document.createElement('button');promiseCard.type='button';promiseCard.className='story-card';promiseCard.dataset.story='promise';
  promiseCard.innerHTML='<small>第4作 · 1人で遊ぶ · 手帳と約束の謎 · 1FとB1Fを探索</small><strong>あの日の約束を、もう一度</strong><span>写真の端にいた女性は、紬の祖母だった。手帳の思い出をたどり、長く会っていない友人との再会を手伝う。</span>';
  panel.append(promiseCard);
  for(const kind of ['ticket','farewell','photograph','promise'])panel.append(root.querySelector(`[data-story="${kind}"]`));
  const storyTitles={ticket:'時を超えた一通',farewell:'さよならを言わない待ち合わせ',photograph:'写真に写らなかった君',promise:'あの日の約束を、もう一度'};
  function closeChooser(){if(!chooserOpen)return;chooserOpen=false;panel.hidden=scrim.hidden=true;api.onModalChange(false);previousFocus?.isConnected&&previousFocus.focus();previousFocus=null;}
  function select(kind){closeChooser();if(kind!==active&&stories[active]?.suspend()===false)return false;active=kind;document.title=storyTitles[kind]+'｜東京駅の謎解き';const url=new URL(location.href);url.searchParams.set('episode',{ticket:'1',farewell:'2',photograph:'3',promise:'4'}[kind]);if(kind!=='ticket')url.searchParams.delete('room');history.replaceState(null,'',url.pathname+url.search+url.hash);return true;}
  const episodeApi={...api,beforeModal:()=>{closeChooser();api.beforeModal?.();}};
  stories.ticket=createTicketEpisode({...episodeApi,onSelect:()=>select('ticket')});
  stories.farewell=createFarewellEpisode({...episodeApi,onSelect:()=>select('farewell')});
  stories.photograph=createPhotographEpisode({...episodeApi,onSelect:()=>select('photograph')});
  stories.promise=createPromiseEpisode({...episodeApi,onSelect:()=>select('promise')});
  function choose(){Object.values(stories).forEach(story=>story.close());api.beforeModal?.();previousFocus=document.activeElement;chooserOpen=true;panel.hidden=scrim.hidden=false;api.onModalChange(true);panel.querySelector('[data-story]')?.focus();}
  const firstLaunch=document.getElementById('ticket-start');
  if(firstLaunch){firstLaunch.textContent='1作目 時を超えた一通';firstLaunch.classList.remove('story-first-launch');}
  const launches=[];let launchAnchor=firstLaunch;
  for(const [kind,label] of [['farewell','2作目 さよならを言わない待ち合わせ'],['photograph','3作目 写真に写らなかった君'],['promise','4作目 あの日の約束を、もう一度']]){const launch=document.createElement('button');launch.type='button';launch.id=kind+'-start';launch.className='primary story-later-launch';launch.textContent=label;launch.addEventListener('click',()=>stories[kind].openIntro());launchAnchor?.after(launch);launchAnchor=launch;launches.push(launch);}
  const nav=document.createElement('button');nav.type='button';nav.className='game-studio-nav';nav.id='story-select';nav.textContent='物語';nav.setAttribute('aria-label','物語を選ぶ');nav.addEventListener('click',choose);document.querySelector('.bottom-nav')?.append(nav);
  for(const card of root.querySelectorAll('[data-story]'))card.addEventListener('click',()=>{closeChooser();stories[card.dataset.story].openIntro();});
  root.querySelector('.stories-close').addEventListener('click',closeChooser);scrim.addEventListener('click',closeChooser);
  function keydown(event){if(!chooserOpen)return;if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();closeChooser();return;}if(event.key!=='Tab')return;const controls=[...panel.querySelectorAll('button')],first=controls[0],last=controls.at(-1);if(event.shiftKey&&(document.activeElement===first||document.activeElement===panel)){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
  document.addEventListener('keydown',keydown,true);
  const params=new URLSearchParams(location.search);if(!params.has('room')){if(params.get('episode')==='4')stories.promise.openIntro();else if(params.get('episode')==='3')stories.photograph.openIntro();else if(params.get('episode')==='2')stories.farewell.openIntro();else if(params.get('episode')==='1')stories.ticket.openIntro();}
  return {update(dt){Object.values(stories).forEach(story=>story.update(dt));},close(){closeChooser();Object.values(stories).forEach(story=>story.close());},dispose(){closeChooser();Object.values(stories).forEach(story=>story.dispose());document.removeEventListener('keydown',keydown,true);root.remove();launches.forEach(el=>el.remove());nav.remove();},get shoulderView(){return stories[active].shoulderView;}};
}
