import {createPhotographCamera} from './photograph-camera.js?v=audit3';
import {floorById} from '../floor-layout.js?v=game1';
import {createAvatarActor} from './avatar-layer.js?v=shoulder1';
import {EPISODE,SPOTS,PUZZLES,ENDING,initialProgress,sanitizeProgress,targetSpot,nearSpot,applyAction} from './farewell-state.js?v=audit3';

const SAVE_KEY='tswg:farewell:v1';
const make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
const button=(text,handler,cls='fw-button')=>{const e=make('button',cls,text);e.type='button';e.addEventListener('click',handler);return e;};
const photoDescriptions={
  'driving-wheels':'横に並んだ、大きな三つの金属の輪。輪どうしは一本の棒でつながっている。',
  'station-postbox':'赤いレンガ模様と、小さな駅舎の屋根。正面に二つの投函口がある。',
  'platform-tokaido-1415':'白い車体に青い帯。長い鼻を持つ東海道・山陽新幹線の車両が、地上のホームに停まっている。',
  'square-zero':'広い吹き抜けに、縦長の光る柱が三本並んでいる。',
  'silver-bell':'透明なケースの中で、大きな銀色の鈴がつり下がっている。',
};

export function createFarewellEpisode(api){
  let progress=initialProgress(),playing=false,disposed=false,dialog=null,returnFocus=null,hintLevel=0,sceneLine=0,storageWarning='',lastTick=0,selfActor=null,haruActor=null,actorRequest=0,haruRequest=0,actorsLoading=false,haruLoading=false,selfFailed=false,haruFailed=false;
  try{const saved=localStorage.getItem(SAVE_KEY);if(saved)progress=sanitizeProgress(JSON.parse(saved));}catch{storageWarning='この環境では進行を保存できません。画面を閉じると、続きから遊べない場合があります。';}
  let portraitCamera=null,answerDraft='',selectedCells=new Set();
  const root=make('div','farewell-game');root.id='farewell-game';root.hidden=true;document.body.append(root);
  const embedded=window.self!==window.top;if(embedded){root.classList.add('is-embedded');document.body.dataset.farewellEmbedded='true';}
  const hud=make('aside','fw-hud');hud.setAttribute('aria-label','第2作の進行');
  const hudLabel=make('small','fw-hud-label','第2作'),hudFloor=make('span','fw-hud-floor'),hudGoal=make('strong','fw-hud-goal');
  const phoneButton=button('スマホ',()=>openCurrent(),'fw-phone');phoneButton.setAttribute('aria-label','晴からのメッセージを開く');phoneButton.setAttribute('aria-expanded','false');phoneButton.setAttribute('aria-controls','farewell-dialog');hud.append(hudLabel,hudFloor,hudGoal,phoneButton);root.append(hud);
  const prompt=button('晴からのメッセージを読む',()=>openCurrent(),'fw-arrival');prompt.hidden=true;root.append(prompt);
  const haruLabel=make('div','fw-haru-label','晴');haruLabel.hidden=true;root.append(haruLabel);
  const scrim=make('div','fw-scrim');scrim.hidden=true;
  const panel=make('section','fw-panel');panel.id='farewell-dialog';panel.tabIndex=-1;panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','farewell-title');root.append(scrim,panel);
  function persist(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(progress));storageWarning='';}catch{storageWarning='この環境では進行を保存できません。画面を閉じると、続きから遊べない場合があります。';}}
  function close(){if(!dialog)return;dialog=null;panel.hidden=scrim.hidden=true;panel.replaceChildren();phoneButton.setAttribute('aria-expanded','false');api.onModalChange(false);if(returnFocus?.isConnected&&!returnFocus.closest('[hidden]'))returnFocus.focus({preventScroll:true});returnFocus=null;refresh();}
  function open(type,extra={}){if(disposed)return;api.beforeModal?.();root.hidden=false;if(!dialog){returnFocus=document.activeElement;api.onModalChange(true);}dialog={type,...extra};phoneButton.setAttribute('aria-expanded','true');panel.hidden=scrim.hidden=false;render();panel.scrollTop=0;(panel.querySelector('button,input')??panel).focus({preventScroll:true});refresh();}
  function heading(title,kicker='第2作 · さよならを言わない待ち合わせ'){const h=make('header','fw-heading'),words=make('div');words.append(make('p','fw-kicker',kicker));const titleEl=make('h2','',title);titleEl.id='farewell-title';words.append(titleEl);if(playing&&!['intro','menu','reset'].includes(dialog.type))words.append(button('手帳・ヒント・道案内',()=>open('menu'),'fw-menu-link'));const x=button('閉じる',close,'fw-close');x.setAttribute('aria-label','スマホを閉じる');h.append(words,x);panel.append(h);}
  function note(text,cls='fw-note',parent=panel){if(text)parent.append(make('p',cls,text));}
  function actions(...items){const row=make('div','fw-actions');row.append(...items);panel.append(row);return row;}
  function speech(speaker,text,parent=panel){if(!text)return;const card=make('div','fw-message '+(speaker==='紬'?'is-tsumugi':''));card.append(make('small','',speaker),make('p','',text));parent.append(card);}
  function warning(){if(storageWarning){const e=make('p','fw-warning',storageWarning);e.setAttribute('role','status');panel.append(e);}}
  function photo(spotId,{large=false,parent=panel}={}){
    const figure=make('figure','fw-photo'+(large?' is-large':''));
    let src=`./game/photos/${spotId}.jpg`;
    if(spotId==='platform-tokaido-1415'){
      if(!portraitCamera)portraitCamera=createPhotographCamera({station:api.station});
      src=portraitCamera.snapshot(spotId,'left');
    }
    const alt=photoDescriptions[spotId]??'晴が送った駅の風景';
    if(src){const img=make('img');img.src=src;img.alt=alt;img.loading='eager';img.addEventListener('error',()=>{img.hidden=true;figure.prepend(make('p','fw-photo-fallback',alt));},{once:true});figure.append(img);}
    else figure.append(make('p','fw-photo-fallback',alt));
    figure.append(make('figcaption','','晴が送った、駅の景色'));
    if(!large)figure.append(button('写真を大きく見る',()=>open('photo',{spotId,back:dialog?.type==='notebook'?'notebook':'current'}),'fw-photo-zoom'));
    parent.append(figure);return figure;
  }

  function openCurrent(){if(!playing){openIntro();return;}if(progress.met&&!progress.endingRead){openEnding();return;}if(progress.photographed){open('menu');return;}if(progress.met){if(nearSpot(api.getPlayer(),targetSpot(progress))){openEnding();}else open('travel');return;}if(progress.stage===PUZZLES.length){open(nearSpot(api.getPlayer(),targetSpot(progress))?'meeting':'travel');return;}if(progress.stage>0&&!nearSpot(api.getPlayer(),targetSpot(progress))){open('travel');return;}open('puzzle');}
  function begin(reset=false){if(api.onSelect?.()===false)return;if(reset){progress=initialProgress();answerDraft='';selectedCells=new Set();}playing=true;root.hidden=false;document.body.dataset.farewellPlaying='true';close();const moving=reset||!api.isStarted?.();if(moving)api.jumpTo(progress.stage>0?targetSpot(progress).zoneId:'marunouchi-central');persist();refresh();openCurrent();}
  function openEnding(replay=false){sceneLine=progress.endingRead&&replay?0:progress.endingLine;open('ending');}
  function moveEnding(delta){const next=sceneLine+delta;if(!progress.endingRead){const result=applyAction(progress,{type:'read-ending',line:next});if(!result.correct){api.onNotice(result.message);return;}progress=result.progress;persist();}sceneLine=next;render();panel.querySelector('.fw-primary')?.focus({preventScroll:true});}
  function openIntro(){if(api.onSelect?.()===false)return;root.hidden=false;open('intro');}
  function destination(){return targetSpot(progress);}
  function directions(){if(progress.stage===0){open('hint');return;}open('travel');}
  function puzzleView(index,{readonly=false,parent=panel}={}){
    const puzzle=PUZZLES[index];
    if(!puzzle)return;
    photo(puzzle.photoId,{parent});
    speech('晴',puzzle.message,parent);note(puzzle.question,'fw-question',parent);
    if(puzzle.lines){const lines=make('div','fw-word-lines');for(const line of puzzle.lines)lines.append(make('p','',line));parent.append(lines);}
    if(puzzle.grid){const board=make('div','fw-letter-grid');board.setAttribute('aria-label','写真に添えられた文字盤。行ごとに左から右、上から下の順。');for(const row of puzzle.grid)for(const char of row){const cell=make('span','fw-grid-cell',char);board.append(cell);}parent.append(board);}
    if(readonly){speech('紬',puzzle.tsumugi,parent);speech('晴',puzzle.haru,parent);note(puzzle.successText,'fw-discovery',parent);}
  }
  function render(){
    panel.replaceChildren();panel.dataset.view=dialog.type;
    if(dialog.type==='intro'){
      heading(EPISODE.title,'第2作 · 写真とメッセージの宝探し');
      note('紬〈つむぎ〉は、人の相談にはよく乗る。自分の寂しさには、「別に平気」と笑ってしまう。','fw-lead');
      note('幼なじみの晴〈はる〉が、東京を離れる日。届いたのは、いつもの待ち合わせの謎。けれど今日は、「最後の宝探し」だった。');
      speech('晴','出発まで、少し付き合って。最後の宝探し。いつものやつ。');
      speech('紬','はいはい。迷子になっても知らないからね。');
      note('写真を見比べ、短い言葉を読み解きながら、紬として駅を歩きます。\n1人用 · 謎5問 · 20〜30分 · 制限時間なし · 段階ヒントあり\n歩く範囲：1F・B1F・M2F・2F。中間階を通って、新幹線ホームまで。少し長い宝探しです。','fw-meta');
      if(progress.met&&!progress.endingRead)actions(button('会話のつづきから遊ぶ',()=>begin(false),'fw-primary'));
      else if(progress.photographed)actions(button('約束と写真を読み返す',()=>{if(!playing)begin(false);if(playing)openEnding(true);},'fw-primary'));
      else if(progress.met)actions(button('最後の写真を残す',()=>{begin(false);if(playing)openCurrent();},'fw-primary'));
      else if(progress.stage>0)actions(button('つづきから遊ぶ',()=>begin(false),'fw-primary'));
      actions(button(progress.stage>0||progress.met?'最初から遊ぶ':'最後の宝探しをはじめる',()=>progress.stage>0||progress.met?open('reset'):begin(true),'fw-primary'));
      warning();return;
    }
    if(dialog.type==='reset'){
      heading('最初から、もう一度');note('第2作の進行を最初に戻します。紬と晴の宝探しを、はじめから遊べます。');actions(button('最初からはじめる',()=>begin(true),'fw-primary'),button('続きはそのままにする',()=>open('intro')));return;
    }
    if(dialog.type==='menu'){
      heading('晴との待ち合わせ','紬のスマホ');
      note(progress.photographed?'約束は、一緒の写真にも残った。':progress.met?'最後に、二人の写真を残そう。':`宝探し ${Math.min(progress.stage+1,PUZZLES.length)} / ${PUZZLES.length}`,'fw-lead');
      if(!progress.photographed||!progress.endingRead)actions(button(progress.met&&!progress.endingRead?'会話のつづきを読む':progress.met?'最後の撮影を続ける':progress.stage===PUZZLES.length?'晴のいる場所へ':'今のメッセージを読む',openCurrent,'fw-primary'));
      actions(button('思い出の手帳',()=>open('notebook')),button('ヒント',()=>{hintLevel=0;open('hint');}),button('道案内',directions),button('構内地図',()=>{close();api.openMap?.();}));
      if(progress.photographed)actions(button(progress.endingRead?'約束を読み返す':'会話のつづきを読む',()=>openEnding(true),'fw-primary'),button('二人の写真を見る',()=>open('portrait')));
      actions(button('物語のはじめに戻る',()=>open('intro')),button('駅を歩く',close));warning();return;
    }
    if(dialog.type==='photo'){
      heading('晴が切り取った景色','写真を拡大');photo(dialog.spotId,{large:true});const details=make('details','fw-details');details.append(make('summary','','写真の見た目を文章で読む'),make('p','',photoDescriptions[dialog.spotId]));panel.append(details);actions(button('元の画面へ',()=>dialog.back==='notebook'?open('notebook'):openCurrent(),'fw-primary'));return;
    }
    if(dialog.type==='travel'){
      if(progress.stage===0){hintLevel=0;open('hint');return;}
      const spot=destination();heading(progress.met&&!progress.photographed?'二人の写真を残す場所へ':progress.photographed?'また歩ける、あの場所':progress.stage===PUZZLES.length?'晴の待つ場所へ':'次の写真の場所へ');
      note(`${spot.floor} · ${spot.title}`,'fw-destination');photo(spot.id);
      if(spot.id==='platform-tokaido-1415')note('たどる階：1F → M2Fの中間階 → 2Fホーム。改札の向こうへ上がり、白い車体と青い帯を見つけましょう。','fw-route-note');
      else if(progress.stage===4)note('ホームからM2F・1Fを経て、B1Fの待ち合わせへ戻ります。階の違いも、二人の宝探しの道しるべです。','fw-route-note');
      if(progress.stage<PUZZLES.length){note('答えに出てきた場所へ向かおう。到着したら、晴の次のメッセージを読めます。');}
      else if(progress.met){note('最後に、銀の鈴の前で二人の写真を残しましょう。');}
      else{speech('晴','ここで、待ってる。急がなくていいから。');speech('紬','会いに行ったら、見送ることになる。……でも、行かないままにはしたくない。');}
      actions(button('歩いて案内する',()=>{close();api.guideTo?.(spot.zoneId);},'fw-primary'),button('移動を省略して、この場所へ',()=>{close();api.jumpTo(spot.zoneId);}));
      if(nearSpot(api.getPlayer(),spot))actions(button(progress.met?'撮影のつづきへ':progress.stage===PUZZLES.length?'晴に声をかける':'届いたメッセージを読む',openCurrent,'fw-primary'));
      actions(button('自分で探す',close),button('思い出の手帳',()=>open('notebook')),button('メニュー',()=>open('menu')));return;
    }
    if(dialog.type==='hint'){
      heading('少しだけ、手がかり','考える時間も、二人の時間');
      if(progress.met&&!progress.photographed){note('晴とは会えました。最後は銀の鈴で、二人の写真を残しましょう。');actions(button('撮影のつづきへ',openCurrent,'fw-primary'),button('道案内',directions));return;}
      if(progress.photographed){note('晴とは、ちゃんと会えました。思い出の手帳で、道のりを読み返せます。');actions(button('思い出の手帳',()=>open('notebook'),'fw-primary'),button('駅に戻る',close));return;}
      if(progress.stage===PUZZLES.length){note('最後の答えは「ぎんのすず」。B1Fの銀の鈴へ向かいましょう。');actions(button('道案内を見る',directions,'fw-primary'),button('駅に戻る',close));return;}
      const hints=PUZZLES[progress.stage].hints;
      for(let i=0;i<=Math.min(hintLevel,hints.length-1);i++){const card=make('div','fw-hint');card.append(make('small','',`ヒント ${i+1}`),make('p','',hints[i]));panel.append(card);}
      actions(button(hintLevel<hints.length-1?'もう少しヒントを見る':'メッセージに戻る',()=>{if(hintLevel<hints.length-1){hintLevel++;render();panel.querySelector('.fw-primary')?.focus({preventScroll:true});}else openCurrent();},'fw-primary'),...(hintLevel<hints.length-1?[button('メッセージへ戻る',openCurrent)]:[]),button('駅を見る',close));
      if(hintLevel===hints.length-1&&progress.stage>0)actions(button('今いるべき場所への道案内',directions));return;
    }
    if(dialog.type==='puzzle'){
      const puzzle=PUZZLES[progress.stage];if(!puzzle){openCurrent();return;}
      heading(puzzle.title,`晴からのメッセージ · ${progress.stage+1} / ${PUZZLES.length}`);puzzleView(progress.stage);
      if(progress.stage>0&&!nearSpot(api.getPlayer(),destination())){note('このメッセージは、写真の場所に着いてから解きましょう。');actions(button('道案内を見る',directions,'fw-primary'));return;}
      if(progress.stage===0){const options=make('div','fw-options');for(const option of puzzle.options??SPOTS.map(s=>({id:s.id,title:s.title}))){const b=button(option.title??option.label,()=>submit({type:'answer',answer:option.id}),'fw-option');options.append(b);}panel.append(options);}
      else{
        const grid=panel.querySelector('.fw-letter-grid');
        if(grid){const chars=puzzle.grid.flat();grid.replaceChildren();chars.forEach((char,index)=>{const cell=button(char,()=>{if(selectedCells.has(index))selectedCells.delete(index);else selectedCells.add(index);cell.classList.toggle('is-crossed',selectedCells.has(index));cell.setAttribute('aria-pressed',String(selectedCells.has(index)));remaining.textContent='残った文字：'+chars.filter((_,i)=>!selectedCells.has(i)).join('');},'fw-grid-cell');cell.classList.toggle('is-crossed',selectedCells.has(index));cell.setAttribute('aria-pressed',String(selectedCells.has(index)));cell.setAttribute('aria-label',`${Math.floor(index/3)+1}行${index%3+1}列 ${char}を消す`);grid.append(cell);});const remaining=make('p','fw-remaining',selectedCells.size?'残った文字：'+chars.filter((_,i)=>!selectedCells.has(i)).join(''):'消す文字を押してください。');remaining.setAttribute('aria-live','polite');grid.after(remaining);actions(button('残った文字で答える',()=>submit({type:'answer',answer:chars.filter((_,i)=>!selectedCells.has(i)).join('')}),'fw-primary'),button('文字盤を元に戻す',()=>{selectedCells=new Set();open('puzzle');}));}
        const form=make('form','fw-answer-form'),label=make('label','','答えを入力'),input=make('input');input.name='farewell-answer';input.autocomplete='off';input.maxLength=80;input.required=true;input.value=answerDraft;input.addEventListener('input',()=>{answerDraft=input.value;});input.placeholder='ひらがなでも答えられます';label.append(input);const check=make('button','fw-primary','この場所で合ってる？');check.type='submit';form.append(label,check);form.addEventListener('submit',event=>{event.preventDefault();submit({type:'answer',answer:input.value});});panel.append(form);
      }
      const details=make('details','fw-details');details.append(make('summary','','写真の見た目を文章で読む'),make('p','',photoDescriptions[puzzle.photoId]));panel.append(details);
      actions(button('ヒント',()=>{hintLevel=0;open('hint');}),button('思い出の手帳',()=>open('notebook')),button('駅を見る',close),button('メニュー',()=>open('menu')));warning();return;
    }
    if(dialog.type==='success'){
      const puzzle=PUZZLES[progress.stage-1];heading('次の場所が、わかった','宝探しのつづき');
      speech('晴',puzzle.haru);speech('紬',puzzle.tsumugi);note(puzzle.successText,'fw-discovery');
      const spot=destination();note(`${spot.floor} · ${spot.title}`,'fw-destination');
      actions(button(progress.stage===PUZZLES.length?'晴に会いに行く':'写真の場所へ向かう',directions,'fw-primary'),button('自分で歩いてみる',close),button('思い出の手帳',()=>open('notebook')));return;
    }
    if(dialog.type==='notebook'){
      heading('写真の向こうに、二人','思い出の手帳');
      if(progress.stage===0)note('まだ解いた謎はありません。晴から届いた最初の写真を、開いてみよう。');
      for(let i=0;i<Math.min(progress.stage,PUZZLES.length);i++){const entry=make('details','fw-notebook-entry'),summary=make('summary','',`${i+1}. ${PUZZLES[i].title}`);entry.append(summary);const content=make('div','fw-notebook-content');puzzleView(i,{readonly:true,parent:content});entry.append(content);panel.append(entry);}
      if(progress.met){note('「いつかまた、銀の鈴の下で。」','fw-discovery');actions(button(progress.endingRead?'約束を読み返す':'会話のつづきを読む',()=>openEnding(true),'fw-primary'));}
      actions(button(progress.photographed?'駅を歩く':progress.met?'撮影のつづきへ':'今のメッセージへ',()=>progress.photographed?close():openCurrent(),'fw-primary'),button('メニュー',()=>open('menu')));return;
    }
    if(dialog.type==='meeting'){
      heading('見つけた','銀の鈴の下で');
      photo('silver-bell');speech('晴','お、正解。紬なら、来てくれると思った。');
      speech('紬','……ちょっと、ずるい。こんなの、解いちゃうじゃん。');
      actions(button('いつもの冗談をやめて、話す',()=>submit({type:'meet'}),'fw-primary'),button('少しだけ駅を見る',close));return;
    }
    if(dialog.type==='ending'){
      const line=ENDING[Math.min(sceneLine,ENDING.length-1)];heading('さよならを言わない待ち合わせ','銀の鈴の下で');
      const scene=make('div','fw-ending-scene');scene.append(make('div','fw-ending-symbol'));if(line.speaker)speech(line.speaker,line.text,scene);else note(line.text,'fw-lead',scene);panel.append(scene);
      const dots=make('p','fw-scene-count',`${sceneLine+1} / ${ENDING.length}`);dots.setAttribute('aria-label',`会話 ${sceneLine+1}、全${ENDING.length}`);panel.append(dots);
      if(sceneLine<ENDING.length-1)actions(button('つづきを読む',()=>moveEnding(1),'fw-primary'));
      else if(progress.photographed){actions(button('二人の写真を見る',()=>open('portrait'),'fw-primary'),button('駅を歩きつづける',close),button('思い出の手帳',()=>open('notebook')));}
      else{note('帰り際、カメラを持った青年が、二人に声をかけました。');actions(button('二人の写真を撮ってもらう',()=>submit({type:'photograph'}),'fw-primary'));}
      if(sceneLine>0)actions(button('ひとつ前の言葉',()=>moveEnding(-1)));return;
    }
    if(dialog.type==='portrait'){
      heading('一緒に写っている写真','待ち合わせの、そのあと');
      speech('青年','よかったら、お二人で撮りましょうか。');
      speech('紬','いいんですか？ ……晴、もう少しこっち。');
      speech('晴','うん。お願いします。');
      if(!portraitCamera)portraitCamera=createPhotographCamera({station:api.station});
      const src=portraitCamera.snapshot('silver-bell','center',{people:'friends'});
      if(src){const figure=make('figure','fw-photo'),img=make('img');img.src=src;img.alt='銀の鈴の前に、紬と晴が並んで写った写真。';figure.append(img,make('figcaption','','一緒に写った、出発の日の二人'));panel.append(figure);}
      speech('紬','あなたも、一緒に写ります？');
      speech('青年','俺は撮る側だから。……お二人、いい顔してました。');
      note('青年はカメラを返すと、小さく会釈して、人の流れへ戻っていった。');
      note('第2作 · おしまい','fw-finish');
      actions(button('写真を胸に、駅を歩きつづける',close,'fw-primary'),button(progress.endingRead?'約束を読み返す':'会話のつづきを読む',()=>openEnding(true)));return;
    }
  }
  function submit(action){if(!playing)return;const result=applyAction(progress,action,api.getPlayer());if(!result.correct){let feedback=panel.querySelector('.fw-feedback');if(!feedback){feedback=make('p','fw-feedback');feedback.setAttribute('role','status');panel.append(feedback);}feedback.textContent=result.message;return;}progress=result.progress;if(action.type==='answer'){answerDraft='';selectedCells=new Set();}hintLevel=0;persist();if(action.type==='photograph')open('portrait');else if(progress.met){sceneLine=0;open('ending');}else open('success');refresh();}
  function refresh(){
    root.hidden=!playing&&!dialog;hud.hidden=!playing||Boolean(dialog)||!api.isActive();phoneButton.setAttribute('aria-expanded',String(Boolean(dialog)));
    if(!playing){prompt.hidden=haruLabel.hidden=true;return;}
    const p=api.getPlayer(),spot=destination();hudFloor.textContent=p.floor;
    hudGoal.textContent=progress.met&&!progress.endingRead?'会話のつづきを読む':progress.photographed?'また会う約束':progress.met?'最後に、二人の写真を':progress.stage===0?'晴の写真を読み解く':`${spot.title}へ`;
    const active=api.isActive()&&!dialog,near=nearSpot(p,spot);prompt.hidden=!active||(progress.photographed&&progress.endingRead)||progress.stage===0||(!near&&!(progress.met&&!progress.endingRead));
    prompt.textContent=progress.met&&!progress.endingRead?'会話のつづきを読む':progress.met?'撮影のつづきへ':progress.stage===PUZZLES.length?'晴に声をかける':'晴からのメッセージを読む';
    if(dialog)haruLabel.hidden=true;
  }
  async function loadSelf(){if(actorsLoading||selfActor||selfFailed||disposed)return;actorsLoading=true;const request=++actorRequest;try{const actor=await createAvatarActor('blue');if(disposed||request!==actorRequest){actor.dispose();return;}selfActor=actor;actor.object.userData.localPlayer=true;actor.object.name='紬';actor.object.visible=playing;api.station.scene.add(actor.object);}catch{selfFailed=true;if(!disposed)api.onNotice('紬の姿を読み込めませんでした。物語と駅の操作は続けられます。');}finally{actorsLoading=false;}}
  async function loadHaru(){if(haruLoading||haruActor||haruFailed||disposed)return;haruLoading=true;const request=++haruRequest;try{const actor=await createAvatarActor('green');if(disposed||request!==haruRequest){actor.dispose();return;}haruActor=actor;actor.object.name='晴';actor.object.visible=false;api.station.scene.add(actor.object);}catch{haruFailed=true;if(!disposed)api.onNotice('晴の姿を読み込めませんでした。スマホから会話を続けられます。');}finally{haruLoading=false;}}
  function updateActors(dt){
    if(!playing){if(selfActor)selfActor.object.visible=false;if(haruActor)haruActor.object.visible=false;haruLabel.hidden=true;return;}
    void loadSelf();const p=api.getPlayer();
    if(selfActor){selfActor.object.visible=true;selfActor.object.position.set(p.x,p.y-1.65,p.z);selfActor.object.rotation.y=(p.yaw??0)+Math.PI;selfActor.setOpacity?.(api.getCameraOpacity?.()??1);selfActor.setMotion(api.reducedMotion||!p.walking?'Idle':p.movementMode==='run'?'Run':'Walk');selfActor.update(api.reducedMotion?0:dt);}
    const bell=SPOTS.at(-1),haruVisible=progress.stage===PUZZLES.length&&nearSpot(p,bell,14);
    if(haruVisible)void loadHaru();
    if(haruActor){const floor=floorById(bell.floor);haruActor.object.visible=haruVisible;haruActor.object.position.set(bell.x+2.4,floor.elevation,bell.z+1);haruActor.object.rotation.y=Math.atan2(p.x-(bell.x+2.4),p.z-(bell.z+1));haruActor.setMotion('Idle');haruActor.update(api.reducedMotion?0:dt);const projected=api.project({x:bell.x+2.4,y:floor.elevation+2.15,z:bell.z+1});haruLabel.hidden=!haruVisible||!projected.visible||Boolean(dialog);haruLabel.style.left=projected.x+'px';haruLabel.style.top=projected.y+'px';}
  }
  const onKey=event=>{if(!dialog)return;if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close();return;}if(event.key==='Tab'){const controls=[...panel.querySelectorAll('button:not([disabled]),input:not([disabled]),summary,a[href]')].filter(e=>!e.closest('[hidden]')&&(!e.closest('details:not([open])')||e.tagName==='SUMMARY'));if(!controls.length){event.preventDefault();panel.focus();return;}const first=controls[0],last=controls.at(-1);if(!panel.contains(document.activeElement)){event.preventDefault();first.focus();return;}if(event.shiftKey&&(document.activeElement===first||document.activeElement===panel)){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}};
  document.addEventListener('keydown',onKey,true);scrim.addEventListener('click',close);
  function suspend(){close();playing=false;delete document.body.dataset.farewellPlaying;root.hidden=true;updateActors(0);}
  function update(dt){if(disposed)return;updateActors(dt);lastTick+=dt;if(lastTick>.15){lastTick=0;refresh();}}
  function dispose(){if(disposed)return;suspend();disposed=true;actorRequest++;haruRequest++;selfActor?.dispose();haruActor?.dispose();portraitCamera?.dispose();delete document.body.dataset.farewellEmbedded;document.removeEventListener('keydown',onKey,true);root.remove();}
  return {update,close,dispose,openIntro,suspend,get playing(){return playing;},get shoulderView(){return playing;}};
}
