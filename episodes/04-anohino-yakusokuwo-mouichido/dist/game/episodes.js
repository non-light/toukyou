import {createPromiseEpisode} from './promise.js?v=audit3';
const EPISODE_NUMBER=4;
const EPISODE_TITLE="あの日の約束を、もう一度";
export function createStoryEpisodes(api){
  const initialQuery=new URLSearchParams(location.search);
  document.title=EPISODE_TITLE+'｜東京駅の謎解き';
  function select(){const url=new URL(location.href);url.searchParams.set('episode',String(EPISODE_NUMBER));if(EPISODE_NUMBER!==1)url.searchParams.delete('room');history.replaceState(null,'',url.pathname+url.search+url.hash);return true;}
  const episode=createPromiseEpisode({...api,onSelect:select});
  const launch=document.createElement('button');launch.type='button';launch.id='promise-start';launch.className='primary';launch.textContent=EPISODE_NUMBER+'作目 '+EPISODE_TITLE;launch.addEventListener('click',()=>episode.openIntro());document.querySelector('#welcome #start')?.before(launch);
  const nav=document.createElement('button');nav.type='button';nav.id='story-select';nav.className='game-studio-nav';nav.textContent='物語';nav.setAttribute('aria-label',EPISODE_TITLE+'を開く');nav.addEventListener('click',()=>episode.openIntro());document.querySelector('.bottom-nav')?.append(nav);
  if(initialQuery.has('episode')&&!(EPISODE_NUMBER===1&&initialQuery.has('room')))episode.openIntro();
  return {update(dt){episode.update(dt);},close(){episode.close();},dispose(){episode.dispose();launch?.remove();nav.remove();},get shoulderView(){return episode.shoulderView;}};
}
