import {createAvatarActor} from './avatar-layer.js?v=shoulder1';
import {createPhotographCamera} from './photograph-camera.js?v=audit3';
import {EPISODE,SPOTS,PUZZLES,ENDING,initialProgress,sanitizeProgress,targetSpot,nearSpot,applyAction} from './photograph-state.js?v=audit3';

const SAVE_KEY='tswg:photograph:v1';
const make=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
const button=(text,fn,cls='ph-button')=>{const el=make('button',cls,text);el.type='button';el.addEventListener('click',fn);return el;};
const views=[{id:'left',title:'左から'},{id:'center',title:'正面から'},{id:'right',title:'右から'}];

// Story-only actors, photographs and progress. The shared station is read-only.
export function createPhotographEpisode(api){
  let progress=initialProgress(),playing=false,disposed=false,dialog=null,returnFocus=null;
  let migrationNotice=false;
  let hintLevel=0,selectedView='center',sceneLine=0,storageWarning='',lastTick=0;
  let selfActor=null,actorLoading=false,actorFailed=false,actorRequest=0;
  const camera=createPhotographCamera({station:api.station});
  try{const raw=localStorage.getItem(SAVE_KEY);if(raw){const saved=JSON.parse(raw);migrationNotice=saved?.version===1&&!saved.sent;progress=sanitizeProgress(saved);}}catch{storageWarning='この環境では記録を保存できません。画面を閉じると続きから遊べない場合があります。';}
  const root=make('div','photograph-game');root.id='photograph-game';root.hidden=true;
  if(window.self!==window.top){root.classList.add('is-embedded');document.body.dataset.photographEmbedded='true';}
  const hud=make('aside','ph-hud');hud.setAttribute('aria-label','第3作の進行');
  const hudGoal=make('strong','ph-hud-goal'),hudFloor=make('span','ph-hud-floor');
  const albumButton=button('写真帳',openCurrent,'ph-phone');albumButton.setAttribute('aria-controls','photograph-dialog');albumButton.setAttribute('aria-expanded','false');
  hud.append(make('small','ph-hud-label','第3作'),hudFloor,hudGoal,albumButton);
  const prompt=button('写真を見比べる',openCurrent,'ph-arrival');prompt.hidden=true;
  const scrim=make('div','ph-scrim');scrim.hidden=true;
  const panel=make('section','ph-panel');panel.id='photograph-dialog';panel.tabIndex=-1;panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','photograph-title');
  root.append(hud,prompt,scrim,panel);document.body.append(root);

  function persist(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(progress));storageWarning='';}catch{storageWarning='この環境では記録を保存できません。画面を閉じると続きから遊べない場合があります。';}}
  function close(){if(!dialog)return;dialog=null;panel.hidden=scrim.hidden=true;panel.replaceChildren();api.onModalChange(false);albumButton.setAttribute('aria-expanded','false');if(returnFocus?.isConnected&&!returnFocus.closest('[hidden]'))returnFocus.focus({preventScroll:true});returnFocus=null;refresh();}
  function open(type,extra={}){if(disposed)return;api.beforeModal?.();root.hidden=false;if(!dialog){returnFocus=document.activeElement;api.onModalChange(true);}dialog={type,...extra};panel.hidden=scrim.hidden=false;albumButton.setAttribute('aria-expanded','true');render();panel.scrollTop=0;(panel.querySelector('button')??panel).focus({preventScroll:true});refresh();}
  function heading(title,kicker='第3作 · 写真に写らなかった君'){
    const header=make('header','ph-heading'),words=make('div');words.append(make('p','ph-kicker',kicker));const h=make('h2','',title);h.id='photograph-title';words.append(h);
    if(playing&&!['intro','menu','reset'].includes(dialog.type))words.append(button('写真帳・ヒント・道案内',()=>open('menu'),'ph-menu-link'));
    header.append(words,button('閉じる',close,'ph-close'));panel.append(header);
  }
  function note(text,cls='ph-note',parent=panel){if(text)parent.append(make('p',cls,text));}
  function speech(text,speaker='律',parent=panel){const el=make('div','ph-speech'+(speaker==='律'?' is-ritsu':''));el.append(make('small','',speaker),make('p','',text));parent.append(el);}
  function actions(...buttons){const row=make('div','ph-actions');row.append(...buttons);panel.append(row);}
  function warning(){if(storageWarning){const el=make('p','ph-feedback',storageWarning);el.setAttribute('role','status');panel.append(el);}}
  function photo(spotId,view,{old=false,people=false,caption='',description='',parent=panel}={}){
    const figure=make('figure','ph-photo'+(old?' is-old':''));
    const src=camera.snapshot(spotId,view,{old,people,backgroundWoman:spotId==='silver-bell'&&!old});
    if(src){const img=make('img');img.src=src;img.alt=description||'駅の目印を写した写真';img.width=720;img.height=480;figure.append(img);}
    else note('写真を表示できません。下の「写真を文章で読む」でも解けます。','ph-photo-fallback',figure);
    figure.append(make('figcaption','',caption|| (old?'昔のアルバムから、風景の切り抜き':'いま、ファインダーに見える景色')));parent.append(figure);return figure;
  }
  function description(text,parent=panel){const details=make('details','ph-details');details.append(make('summary','','写真を文章で読む'),make('p','',text));parent.append(details);}
  function openCurrent(){if(!playing){openIntro();return;}if(progress.sent){if(!progress.endingRead)openEnding();else open('notebook');return;}if(progress.stage===PUZZLES.length){open(nearSpot(api.getPlayer(),targetSpot(progress))?'final':'travel');return;}open(!progress.located?'locate':nearSpot(api.getPlayer(),targetSpot(progress))?'frame':'travel');}
  function begin(reset=false){if(api.onSelect?.()===false)return;if(reset){progress=initialProgress();migrationNotice=false;}playing=true;root.hidden=false;document.body.dataset.photographPlaying='true';close();if(reset||!api.isStarted?.())api.jumpTo(reset||progress.stage===0?'keiyo-intermediate':targetSpot(progress).zoneId);selectedView='center';persist();refresh();openCurrent();}
  function openEnding(replay=false){sceneLine=progress.endingRead&&replay?0:progress.endingLine;open('ending');}
  function moveEnding(delta){const next=sceneLine+delta;if(!progress.endingRead){const result=applyAction(progress,{type:'read-ending',line:next});if(!result.correct){api.onNotice(result.message);return;}progress=result.progress;persist();}sceneLine=next;render();panel.querySelector('.ph-primary')?.focus({preventScroll:true});}
  function openIntro(){if(api.onSelect?.()===false)return;root.hidden=false;open('intro');}
  function directions(){if(!progress.located&&progress.stage<PUZZLES.length){hintLevel=0;open('hint');return;}open('travel');}
  function feedback(text){let el=panel.querySelector('.ph-feedback');if(!el){el=make('p','ph-feedback');el.setAttribute('role','status');panel.append(el);}el.textContent=text;el.scrollIntoView({block:'nearest'});}
  function submit(action){if(!playing)return;const result=applyAction(progress,action,api.getPlayer());if(!result.correct){feedback(result.message);return;}progress=result.progress;persist();hintLevel=0;refresh();if(action.type==='locate')open('travel');else if(action.type==='frame'){selectedView='center';open('success');}else if(action.type==='send'){sceneLine=0;open('ending');}else open('final');}
  function routeSummary(){
    const details=make('details','ph-details ph-route');details.open=dialog?.type==='intro';
    details.append(make('summary','','この物語で歩く範囲'));
    note('京葉線の地下から駅の真ん中へ。深いホームを訪ね、最後は待ち合わせの場所へ。','ph-note',details);
    const list=make('ol','ph-route-list');
    for(const [index,place] of SPOTS.entries()){
      const item=make('li','',`${place.floor} · ${playing&&(index<progress.stage||(index===progress.stage&&progress.located)||progress.sent)?place.title:index===SPOTS.length-1?'最後の一枚':`写真${index+1}の場所`}`);
      if(playing&&index<progress.stage)item.classList.add('is-visited');
      list.append(item);
    }
    details.append(list);note('京葉線のB3F・B2F・動く歩道を通り、総武線へは別の地下連絡から進みます。歩く道案内と、移動を省く補助が使えます。','ph-note',details);panel.append(details);
  }
  function render(){
    panel.replaceChildren();panel.dataset.view=dialog.type;
    const puzzle=PUZZLES[progress.stage],spot=targetSpot(progress);
    if(dialog.type==='intro'){
      heading(EPISODE.title,'第3作 · 写真の形と、撮る人の物語');
      note('「俺は撮る側だから」','ph-lead');
      note('写真を撮るのは好き。でも、自分が写るのは苦手。青年・律〈りつ〉は、古いアルバムの小さな切り抜きを持って東京駅に来ました。');
      speech('兄貴に、写真を送ろうと思って。昔と同じ場所なら、何か書けるかと思ったんだけど。');
      note('列車の奥行き、屋根の形、柱の間隔。写真を頼りに、京葉線の長い通路と総武・横須賀線の深いホームをたどります。\n1人用 · 空間の謎5問＋最後の一枚 · 30〜40分 · 制限時間なし · 段階ヒントあり','ph-meta');
      if(migrationNotice)note('探索ルートが広がりました。途中だった第3作は、新しいルートのはじめから遊べます。完成した写真と結末の記録は引き継ぎます。','ph-meta');
      routeSummary();
      if(progress.stage>0||progress.located||progress.sent)actions(button(progress.sent&&!progress.endingRead?'最後の会話を続ける':progress.sent?'できあがった写真帳を開く':'つづきから遊ぶ',()=>begin(false),'ph-primary'));
      actions(button(progress.stage>0||progress.located?'最初から遊ぶ':'律と写真の場所を探す',()=>progress.stage>0||progress.located?open('reset'):begin(true),'ph-primary'));
      warning();return;
    }
    if(dialog.type==='reset'){
      heading('アルバムを、はじめから');note('第3作の記録を最初に戻します。');actions(button('最初からはじめる',()=>begin(true),'ph-primary'),button('続きはそのままにする',()=>open('intro')));return;
    }
    if(dialog.type==='menu'){
      heading('律の写真帳');note(progress.sent?'今の自分も、写真の中に。':progress.stage===PUZZLES.length?'最後の一枚 · 銀の鈴へ':`風景の切り抜き ${progress.stage+1} / ${PUZZLES.length}`,'ph-lead');
      routeSummary();
      if(!progress.sent||!progress.endingRead)actions(button(progress.sent?'最後の会話を続ける':'いまの写真を開く',openCurrent,'ph-primary'));
      actions(button('これまでの写真',()=>open('notebook')),button('ヒント',()=>{hintLevel=0;open('hint');}),button('道案内',directions),button('構内地図',()=>{close();api.openMap?.();}));
      if(progress.sent&&progress.endingRead)actions(button('最後の会話を読み返す',()=>openEnding(true)));
      actions(button('物語の紹介へ',()=>open('intro')),button('駅を歩く',close));warning();return;
    }
    if(dialog.type==='locate'){
      heading(puzzle.title,`風景の切り抜き ${progress.stage+1} / ${PUZZLES.length}`);
      photo(puzzle.spotId,puzzle.correctView,{old:true,description:puzzle.photoDescription});speech(puzzle.message);note('この形がある場所は、どこでしょう。写真の看板は読めなくても、形だけで探せます。','ph-question');
      const list=make('div','ph-options');for(const place of SPOTS)list.append(button(place.title,()=>submit({type:'locate',answer:place.id}),'ph-option'));panel.append(list);
      description(puzzle.photoDescription);actions(button('ヒント',()=>{hintLevel=0;open('hint');}),button('駅を見回す',close));warning();return;
    }
    if(dialog.type==='travel'){
      heading(progress.stage===PUZZLES.length?'最後は、銀の鈴の前で':'写真の場所へ');note(`${spot.floor} · ${spot.title}`,'ph-destination');
      if(progress.stage===PUZZLES.length){photo('silver-bell','center',{old:true,people:true,caption:'アルバムの最後に残っていた、兄と律',description:'銀の鈴の前に並んだ幼い兄弟。二人とも、写真の中にいる。'});speech('これだけは、兄貴も俺も写ってる。……誰に撮ってもらったんだっけ。');}
      else{photo(puzzle.spotId,puzzle.correctView,{old:true,description:puzzle.photoDescription});note('場所が分かりました。着いたら、昔の写真と同じ構図になる撮影位置を探しましょう。');}
      if(progress.stage<PUZZLES.length)note(['京葉線のB3Fから、地下ホームのB4Fへ。','京葉線のB3F・B2F・B1Fの動く歩道を抜け、1Fの丸の内側へ。','丸の内側からB1Fへ。地下南口のほうへ歩きます。','本駅舎のB1Fから、総武線のB4F連絡階を経てB5Fへ。京葉線側のB4Fとは別の場所です。','総武線のB4F連絡階を経て、本駅舎のB1Fへ戻ります。'][progress.stage],'ph-route-note');
      actions(button('歩いて案内する',()=>{close();api.guideTo?.(spot.zoneId);},'ph-primary'),button('移動を省略して、この場所へ',()=>{close();api.jumpTo(spot.zoneId);}),button('自分で歩く',close));
      if(nearSpot(api.getPlayer(),spot))actions(button(progress.stage===PUZZLES.length?'最後の一枚を撮る':'撮影位置を探す',openCurrent,'ph-primary'));return;
    }
    if(dialog.type==='frame'){
      heading(puzzle.title,'同じ景色になる、立ち位置');
      if(!nearSpot(api.getPlayer(),spot)){note('写真の目印の近くに戻って、撮影位置を探しましょう。');actions(button('道案内',directions,'ph-primary'));return;}
      speech(puzzle.question);note('撮影位置を切り替え、昔の写真と輪郭や前後関係を見比べてください。写真の中で移動します。','ph-note');
      const compare=make('div','ph-compare');
      photo(puzzle.spotId,puzzle.correctView,{old:true,description:puzzle.photoDescription,caption:'昔の写真',parent:compare});
      photo(puzzle.spotId,selectedView,{description:`今の景色、${views.find(v=>v.id===selectedView).title}。`,caption:'今の景色',parent:compare});panel.append(compare);
      const row=make('div','ph-views');for(const view of views){const b=button(view.title,()=>{selectedView=view.id;render();panel.querySelector(`[data-camera-view="${view.id}"]`)?.focus({preventScroll:true});},'ph-view-option');b.dataset.cameraView=view.id;b.setAttribute('aria-pressed',String(selectedView===view.id));row.append(b);}panel.append(row);
      actions(button('この構図でシャッターを切る',()=>submit({type:'frame',view:selectedView}),'ph-primary'));
      description(puzzle.photoDescription+'\n撮影位置は、目印に向かって左・正面・右の三つです。');
      actions(button('ヒント',()=>{hintLevel=0;open('hint');}),button('駅を見る',close));return;
    }
    if(dialog.type==='success'){
      const solved=PUZZLES[progress.stage-1];heading('同じ景色を、見つけた');photo(solved.spotId,solved.correctView,{description:solved.photoDescription,caption:'律が今日撮った写真'});
      note(solved.successText,'ph-discovery');speech(solved.reflection);
      if(progress.stage===PUZZLES.length){note('アルバムの最後には、切り抜いていない一枚が残っていました。');actions(button('最後の写真を見る',()=>open('travel'),'ph-primary'));}
      else actions(button('次の切り抜きを見る',openCurrent,'ph-primary'));
      actions(button('少し駅を歩く',close));return;
    }
    if(dialog.type==='hint'){
      heading('写真の、どこを見る？');
      if(progress.sent){note('写真と短い便りは、兄へ送りました。写真帳で風景と最後の一枚を読み返せます。');actions(button(progress.endingRead?'写真帳を開く':'最後の会話を続ける',openCurrent,'ph-primary'),button('駅を歩く',close));return;}
      const hints=progress.stage===PUZZLES.length?['最後の撮影場所は、B1Fの銀の鈴です。','同じ場所の写真は、もう撮れます。今、兄に見せたいものを考えてみましょう。','カメラを誰かに渡して、律自身が写真に入りましょう。']:puzzle.hints;
      for(let i=0;i<=Math.min(hintLevel,hints.length-1);i++){const el=make('div','ph-hint');el.append(make('small','',`ヒント ${i+1}`),make('p','',hints[i]));panel.append(el);}
      actions(button(hintLevel<hints.length-1?'もう少しヒントを見る':'写真へ戻る',()=>{if(hintLevel<hints.length-1){hintLevel++;render();panel.querySelector('.ph-primary')?.focus({preventScroll:true});}else openCurrent();},'ph-primary'),...(hintLevel<hints.length-1?[button('写真へ戻る',openCurrent)]:[]),button('駅を見回す',close));return;
    }
    if(dialog.type==='final'){
      heading('写真に入る、ということ','銀の鈴の前で');
      if(!nearSpot(api.getPlayer(),spot)){note('銀の鈴の前で、最後の写真を撮りましょう。');actions(button('銀の鈴へ',directions,'ph-primary'));return;}
      if(!progress.handed){
        photo('silver-bell','center',{old:true,people:true,caption:'昔は、二人ともここにいた',description:'銀の鈴の前に立つ幼い兄弟。二人が写った記念写真。'});
        speech('同じ景色は撮れた。でも、これだけ送ったら、俺がここで何してるのか、分からないよな。');
        speech('……兄貴。見せたいの、駅だけじゃなかった。');
        note('カメラを持ったままの律が、顔を上げます。通りかかった人に、一枚だけお願いしてみることにしました。');
        actions(button('「すみません、写真をお願いできますか」',()=>submit({type:'hand-camera'}),'ph-primary'),button('少し考えながら歩く',close));
      }else if(!progress.photographed){
        photo('silver-bell','center',{people:true,caption:'カメラを渡して、フレームの中へ',description:'銀の鈴を背景に、少し照れた律が一人立っている。'});
        speech('俺は撮る側だから。……って、いつも言ってたけど。今日は、こっちで。');
        speech('はい。少しだけ肩の力を抜いてください。','通りかかった人');
        actions(button('カメラを見て、写真に入る',()=>submit({type:'photograph'}),'ph-primary'));
      }else{
        photo('silver-bell','center',{people:true,caption:'今日の律。東京駅にて。',description:'銀の鈴の前で、律がカメラに顔を向けている。今日の自分が写った一枚。'});
        speech('兄貴。久しぶり。今日は、東京駅に来ています。こっちで、こんなふうに暮らしてるよ。');
        note('何度も書いて消した長い説明より、短い言葉を添えます。','ph-lead');
        actions(button('この写真と、短い便りを兄へ送る',()=>submit({type:'send'}),'ph-primary'));
      }
      warning();return;
    }
    if(dialog.type==='ending'){
      heading(EPISODE.title,'写真に写った、今日の君');
      const line=ENDING[Math.min(sceneLine,ENDING.length-1)];
      if(sceneLine===0||sceneLine===ENDING.length-1)photo('silver-bell','center',{people:true,caption:'今の自分も、写真の中に。',description:'銀の鈴の前の律。自分も入って、誰かに撮ってもらった写真。'});
      if(line.speaker)speech(line.text,line.speaker);else note(line.text,'ph-lead');
      note(`${sceneLine+1} / ${ENDING.length}`,'ph-scene-count');
      if(sceneLine<ENDING.length-1)actions(button('つづきを読む',()=>moveEnding(1),'ph-primary'));
      else{note('第3作 · おしまい','ph-finish');actions(button('写真帳を開く',()=>open('notebook'),'ph-primary'),button('駅を歩きつづける',close));}
      if(sceneLine>0)actions(button('ひとつ前の言葉',()=>moveEnding(-1)));return;
    }
    if(dialog.type==='notebook'){
      heading('写真に写らなかった君','律の写真帳');
      if(progress.stage===0)note('アルバムの切り抜きを手がかりに、同じ景色を探しています。');
      for(let i=0;i<progress.stage;i++){const item=PUZZLES[i],entry=make('details','ph-notebook-entry');entry.append(make('summary','',`${i+1}. ${item.title} — ${SPOTS[i].title}`));photo(item.spotId,item.correctView,{description:item.photoDescription,caption:'今日撮った風景',parent:entry});speech(item.reflection,'律',entry);panel.append(entry);}
      if(progress.photographed)photo('silver-bell','center',{people:true,caption:'今日の律。東京駅にて。',description:'銀の鈴の前で、律自身が写った写真。'});
      if(progress.sent){note('「こっちで、こんなふうに暮らしてるよ。」','ph-discovery');actions(button(progress.endingRead?'最後の会話を読み返す':'最後の会話を続ける',()=>openEnding(true),'ph-primary'));}
      actions(button(progress.sent?'駅を歩く':'いまの写真へ',()=>progress.sent?close():openCurrent(),'ph-primary'),button('写真帳のメニュー',()=>open('menu')));return;
    }
  }
  function refresh(){
    root.hidden=!playing&&!dialog;hud.hidden=!playing||Boolean(dialog)||!api.isActive();
    if(!playing){prompt.hidden=true;return;}
    const p=api.getPlayer();hudFloor.textContent=p.floor;
    hudGoal.textContent=progress.sent?(progress.endingRead?'今日の自分も、写真の中に':'最後の会話を続ける'):progress.photographed?'写真と便りを兄へ送る':progress.handed?'カメラを見て、写真に入る':progress.stage===PUZZLES.length?'銀の鈴で、最後の一枚':progress.located?`${targetSpot(progress).title}で構図を合わせる`:'写真の形から、場所を探す';
    prompt.hidden=!api.isActive()||Boolean(dialog)||(progress.sent&&progress.endingRead)||!(progress.located||progress.stage===PUZZLES.length)||(!progress.sent&&!nearSpot(p,targetSpot(progress)));
    prompt.textContent=progress.sent?'最後の会話を続ける':progress.photographed?'写真と便りを兄へ送る':progress.handed?'カメラを見て、写真に入る':progress.stage===PUZZLES.length?'最後の一枚を撮る':'昔の写真と、見比べる';
  }
  async function loadActor(){if(actorLoading||selfActor||actorFailed||disposed)return;actorLoading=true;const request=++actorRequest;try{const actor=await createAvatarActor('yellow');if(disposed||request!==actorRequest){actor.dispose();return;}selfActor=actor;actor.object.userData.localPlayer=true;actor.object.name='律';actor.object.visible=playing;api.station.scene.add(actor.object);}catch{actorFailed=true;if(!disposed)api.onNotice('律の姿を表示できませんでした。写真の謎と駅の操作は続けられます。');}finally{actorLoading=false;}}
  function updateActor(dt){if(!playing){if(selfActor)selfActor.object.visible=false;return;}void loadActor();if(!selfActor)return;const p=api.getPlayer();selfActor.object.visible=true;selfActor.object.position.set(p.x,p.y-1.65,p.z);selfActor.object.rotation.y=(p.yaw??0)+Math.PI;selfActor.setOpacity?.(api.getCameraOpacity?.()??1);selfActor.setMotion(api.reducedMotion||!p.walking?'Idle':p.movementMode==='run'?'Run':'Walk');selfActor.update(api.reducedMotion?0:dt);}
  function keydown(event){if(!dialog)return;if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close();return;}if(event.key!=='Tab')return;const controls=[...panel.querySelectorAll('button:not([disabled]),summary,a[href]')].filter(el=>!el.closest('[hidden]')&&(!el.closest('details:not([open])')||el.tagName==='SUMMARY'));const first=controls[0],last=controls.at(-1);if(!first){event.preventDefault();panel.focus();}else if(!panel.contains(document.activeElement)){event.preventDefault();first.focus();}else if(event.shiftKey&&(document.activeElement===first||document.activeElement===panel)){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
  document.addEventListener('keydown',keydown,true);scrim.addEventListener('click',close);
  function suspend(){close();playing=false;delete document.body.dataset.photographPlaying;root.hidden=true;updateActor(0);}
  function dispose(){if(disposed)return;suspend();disposed=true;actorRequest++;selfActor?.dispose();camera.dispose();delete document.body.dataset.photographEmbedded;document.removeEventListener('keydown',keydown,true);root.remove();}
  return {openIntro,close,suspend,dispose,update(dt){if(disposed)return;updateActor(dt);lastTick+=dt;if(lastTick>.15){lastTick=0;refresh();}},get shoulderView(){return playing;}};
}
