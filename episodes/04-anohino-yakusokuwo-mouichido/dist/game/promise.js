import {createAvatarActor} from './avatar-layer.js?v=shoulder1';
import {createPhotographCamera} from './photograph-camera.js?v=audit3';
import {floorById} from '../floor-layout.js?v=game1';
import {createWheelSketch,createLetterWeave} from './promise-evidence.js?v=audit3';
import {EPISODE,SPOTS,PUZZLES,REVEAL,ENDING,initialProgress,sanitizeProgress,targetSpot,nearSpot,applyAction} from './promise-state.js?v=audit3';

const SAVE_KEY='tswg:promise:v1';
const make=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
const button=(text,fn,cls='pm-button')=>{const el=make('button',cls,text);el.type='button';el.addEventListener('click',fn);return el;};

// This episode owns its diary, progress and people. Station geometry is shared.
export function createPromiseEpisode(api){
  let progress=initialProgress(),hasSave=false,playing=false,disposed=false,dialog=null,returnFocus=null;
  let hintLevel=0,sceneLine=0,ordered=[],letterDraft=[],answerDraft='',storageWarning='',lastTick=0;
  const camera=createPhotographCamera({station:api.station});
  const actors=new Map(),loading=new Set(),failed=new Set();
  try{const raw=localStorage.getItem(SAVE_KEY);if(raw){progress=sanitizeProgress(JSON.parse(raw));hasSave=true;}}catch{storageWarning='この環境では記録を保存できません。画面を閉じると、続きから遊べない場合があります。';}
  const root=make('div','promise-game');root.id='promise-game';root.hidden=true;
  const hud=make('aside','pm-hud');hud.setAttribute('aria-label','第4作の進行');
  const hudFloor=make('span','pm-hud-floor'),hudGoal=make('strong','pm-hud-goal');
  const diaryButton=button('手帳',()=>open('menu'),'pm-phone');diaryButton.setAttribute('aria-controls','promise-dialog');diaryButton.setAttribute('aria-expanded','false');
  hud.append(make('small','pm-hud-label','第4作'),hudFloor,hudGoal,diaryButton);
  const prompt=button('祖母の手帳を開く',openCurrent,'pm-arrival');prompt.hidden=true;
  const scrim=make('div','pm-scrim');scrim.hidden=true;
  const panel=make('section','pm-panel');panel.id='promise-dialog';panel.tabIndex=-1;panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','promise-title');
  const grandmaLabel=make('div','pm-person-label','祖母'),friendLabel=make('div','pm-person-label','澄子');grandmaLabel.hidden=friendLabel.hidden=true;
  root.append(hud,prompt,grandmaLabel,friendLabel,scrim,panel);document.body.append(root);

  function persist(){hasSave=true;try{localStorage.setItem(SAVE_KEY,JSON.stringify(progress));storageWarning='';}catch{storageWarning='この環境では記録を保存できません。画面を閉じると、続きから遊べない場合があります。';}}
  function close(){if(!dialog)return;dialog=null;panel.hidden=scrim.hidden=true;panel.replaceChildren();api.onModalChange(false);diaryButton.setAttribute('aria-expanded','false');if(returnFocus?.isConnected&&!returnFocus.closest('[hidden]'))returnFocus.focus({preventScroll:true});returnFocus=null;refresh();}
  function open(type){if(disposed)return;api.beforeModal?.();root.hidden=false;if(!dialog){returnFocus=document.activeElement;api.onModalChange(true);}dialog={type};panel.hidden=scrim.hidden=false;diaryButton.setAttribute('aria-expanded','true');render();panel.scrollTop=0;(panel.querySelector('button,input')??panel).focus({preventScroll:true});refresh();}
  function heading(title,kicker='第4作 · あの日の約束を、もう一度'){
    const header=make('header','pm-heading'),words=make('div');words.append(make('p','pm-kicker',kicker));const h=make('h2','',title);h.id='promise-title';words.append(h);
    if(playing&&!['intro','menu','reset'].includes(dialog.type))words.append(button('手帳・ヒント・道案内',()=>open('menu'),'pm-menu-link'));
    header.append(words,button('閉じる',close,'pm-close'));panel.append(header);
  }
  function note(text,cls='pm-note',parent=panel){if(text)parent.append(make('p',cls,text));}
  function speech(text,speaker='紬',parent=panel){const card=make('div','pm-speech'+(speaker==='紬'?' is-tsumugi':''));card.append(make('small','',speaker),make('p','',text));parent.append(card);}
  function actions(...items){const row=make('div','pm-actions');row.append(...items);panel.append(row);}
  function warning(){if(storageWarning){const el=make('p','pm-feedback',storageWarning);el.setAttribute('role','status');panel.append(el);}}
  function photo(spotId,{people=false,backgroundWoman=false,caption='',description='',parent=panel}={}){
    const figure=make('figure','pm-photo'),src=camera.snapshot(spotId,'center',{people,backgroundWoman});
    if(src){const img=make('img');img.src=src;img.alt=description||caption;img.width=960;img.height=600;figure.append(img);}
    else note(description||'写真を表示できません。手帳の文章だけでも謎を解けます。','pm-photo-fallback',figure);
    figure.append(make('figcaption','',caption));parent.append(figure);
  }
  function evidence(puzzle,parent=panel){
    const pages=make('div','pm-evidence');
    for(const [index,entry] of (puzzle.evidence??[]).entries()){const page=make('article','pm-page');page.append(make('h3','',entry.label));if(puzzle.id==='a-place-drawn-in-circles'&&index===0)page.append(createWheelSketch());page.append(make('p','',entry.text));pages.append(page);}parent.append(pages);
  }
  function discovery(puzzle,parent=panel){
    if(!puzzle.discovery)return;const card=make('aside','pm-reason');card.append(make('small','','この謎で分かったこと'),make('p','',puzzle.discovery));parent.append(card);
  }
  function memoryTimeline(parent=panel){
    const figure=make('figure','pm-memory-timeline');figure.append(make('figcaption','','二人が会えなかった、五分のすれ違い'));
    const list=make('ol');
    for(const [time,who,text] of [['14:40','祖母','迷っている女の子を案内所へ。'],['15:00','澄子','銀の鈴で、祖母を待つ。'],['15:05','澄子','心配になり、改札の外へ探しに。'],['15:10','祖母','銀の鈴へ戻る。澄子はもう探しに出ていた。']]){
      const row=make('li');row.append(make('time','',time),make('strong','',who),make('span','',text));list.append(row);
    }
    figure.append(list);parent.append(figure);
  }
  function showScene(type,line=0){sceneLine=line;open(type);}
  function turnScene(previous=false){
    if(progress.scene){
      const result=applyAction(progress,{type:previous?'previous-scene':'advance-scene'});
      if(!result.correct){feedback(result.message);return;}
      progress=result.progress;persist();
      if(progress.scene){showScene(progress.scene,progress.sceneLine);panel.querySelector('.pm-primary')?.focus({preventScroll:true});}else open('notebook');
    }else{
      sceneLine+=previous?-1:1;render();panel.querySelector('.pm-primary')?.focus({preventScroll:true});
    }
  }
  function openCurrent(){
    if(!playing){openIntro();return;}
    if(progress.scene){showScene(progress.scene,progress.sceneLine);return;}
    if(progress.finished){open('notebook');return;}
    open(nearSpot(api.getPlayer(),targetSpot(progress))?(progress.stage<PUZZLES.length?'puzzle':'final'):'travel');
  }
  function begin(reset=false){
    if(api.onSelect?.()===false)return;
    if(reset)progress=initialProgress();playing=true;document.body.dataset.promisePlaying='true';root.hidden=false;close();
    const moving=reset||!api.isStarted?.();if(moving)api.jumpTo(targetSpot(progress).zoneId);
    ordered=[];letterDraft=[];answerDraft='';hintLevel=0;persist();if(progress.scene||progress.finished||!moving)openCurrent();else refresh();
  }
  function openIntro(){if(api.onSelect?.()===false)return;root.hidden=false;open('intro');}
  function directions(){open('travel');}
  function feedback(text){let el=panel.querySelector('.pm-feedback');if(!el){el=make('p','pm-feedback');el.setAttribute('role','status');panel.append(el);}el.textContent=text;el.scrollIntoView({block:'nearest'});}
  function submit(action){
    if(!playing)return;const result=applyAction(progress,action,api.getPlayer());if(!result.correct){feedback(result.message);return;}
    progress=result.progress;persist();hintLevel=0;ordered=[];letterDraft=[];answerDraft='';refresh();
    if(action.type==='solve')open('success');else if(action.type==='reveal')showScene(progress.scene,progress.sceneLine);else open('final');
  }
  function routeSummary(){
    const details=make('details','pm-details');details.append(make('summary','','この物語で歩く範囲'));
    note('B1Fの銀の鈴から動輪の広場へ。1Fのポストを訪ね、B1Fの今の景色を通って、もう一度銀の鈴へ。','pm-note',details);
    note('歩く道案内と、移動を省く補助を使えます。駅の現在の模型で、手帳に残る思い出をたどります。','pm-note',details);panel.append(details);
  }
  function renderPuzzle(puzzle){
    const weave=puzzle.id==='words-written-together';
    note(puzzle.message);if(!weave)evidence(puzzle);note(weave?'祖母から始めて、二人の文字を一文字ずつ交互につないでください。どんな返事になるでしょう。':puzzle.question,'pm-question');
    if(puzzle.kind==='choice'){
      const choices=make('div','pm-options');for(const option of puzzle.options)choices.append(button(option.label,()=>submit({type:'solve',answer:option.id}),'pm-option'));panel.append(choices);
    }else if(puzzle.kind==='order'){
      note('出来事を、先に起きたものから順に押してください。選んだ札をもう一度押すと外せます。','pm-note');
      const choices=make('div','pm-order-options');
      for(const option of puzzle.options){const index=ordered.indexOf(option.id),b=button((index>=0?`${index+1}. `:'')+option.label,()=>{ordered=index>=0?ordered.filter(id=>id!==option.id):[...ordered,option.id];render();panel.querySelector(`[data-event-id="${option.id}"]`)?.focus({preventScroll:true});},'pm-order-option');b.dataset.eventId=option.id;b.setAttribute('aria-pressed',String(index>=0));choices.append(b);}panel.append(choices);
      const sequence=make('ol','pm-sequence');sequence.setAttribute('aria-label','選んだ順番');sequence.setAttribute('aria-live','polite');for(const id of ordered)sequence.append(make('li','',puzzle.options.find(o=>o.id===id).label));panel.append(sequence);
      const check=button('この順番で、二人の一日をたどる',()=>submit({type:'solve',answer:ordered}),'pm-primary');check.disabled=ordered.length!==puzzle.options.length;actions(check,button('順番を元に戻す',()=>{ordered=[];render();panel.querySelector('.pm-order-option')?.focus({preventScroll:true});}));
    }else{
      if(weave){
        panel.append(createLetterWeave({initialSequence:letterDraft,onChange:sequence=>{letterDraft=[...sequence];},onAnswer:answer=>submit({type:'solve',answer})}));
        const details=make('details','pm-details');details.append(make('summary','','手帳の文字を文章で読む'));evidence(puzzle,details);panel.append(details);
      }
      const form=make('form','pm-answer-form'),label=make('label','','答えを入力'),input=make('input');input.id='promise-answer';input.name='promise-answer';input.autocomplete='off';input.maxLength=80;input.required=true;input.value=answerDraft;input.placeholder=progress.stage===4?'場所と時刻を続けて入力':'ひらがなでも答えられます';input.addEventListener('input',()=>{answerDraft=input.value;});label.append(input);
      const check=make('button','pm-primary','手帳の答えを確かめる');check.type='submit';form.append(label,check);form.addEventListener('submit',event=>{event.preventDefault();submit({type:'solve',answer:input.value});});panel.append(form);
    }
  }
  function render(){
    panel.replaceChildren();panel.dataset.view=dialog.type;const puzzle=PUZZLES[progress.stage],spot=targetSpot(progress);
    if(dialog.type==='intro'){
      heading(EPISODE.title,'第4作 · 紬とたどる、祖母の手帳');
      photo('silver-bell',{people:true,backgroundWoman:true,caption:'律から届いた、あの日の写真',description:'銀の鈴の前の律。写真の右奥に、小さなかばんを持った年配の女性が写っている。'});
      note('写真の隅に、知っている人がいた。','pm-lead');speech('この人……おばあちゃんだ。あの日、東京駅にいたの？');
      speech('昔の友達のことを、思い出してね。ここで待った日も、会えなかった日もあるの。','祖母');
      note('祖母のもとには、長く会っていない友人・澄子〈すみこ〉から絵はがきが届いていました。今日は二人で相談した再会の日。はがきには連絡先と今日の予定も添えられています。紬は古い手帳を借りて、二人の約束をたどります。');
      note('1人用 · 手帳と言葉の謎5問＋再会 · '+EPISODE.duration+' · 制限時間なし · 段階ヒント・自動保存あり\n第1〜3作のつながりが明らかになる物語です。各作を先に遊ぶと、出会いをより楽しめます。','pm-meta');routeSummary();
      if(hasSave)actions(button(progress.finished?'約束の手帳を読み返す':progress.scene?'読んでいた会話のつづきへ':'つづきから遊ぶ',()=>begin(false),'pm-primary'));
      actions(button(hasSave?'最初から遊ぶ':'紬と、祖母の手帳を開く',()=>hasSave?open('reset'):begin(true),'pm-primary'));warning();return;
    }
    if(dialog.type==='reset'){
      heading('あの日の約束を、はじめから');note('第4作の記録を最初に戻します。ほかの作品の記録は、それぞれ保存されています。');actions(button('最初からはじめる',()=>begin(true),'pm-primary'),button('続きはそのままにする',()=>open('intro')));return;
    }
    if(dialog.type==='menu'){
      heading('約束の手帳','紬と祖母の、今日の記録');
      note(progress.finished?'言葉も、親切も、次の誰かへ。':progress.scene?'まだ、二人の話のつづきがある。':progress.reunited?'再会のあとに、もう一枚のページ。':progress.invited?'今度は、同じ場所で。':progress.stage===PUZZLES.length?'昔の約束を、今日の約束に。':`思い出の謎 ${progress.stage+1} / ${PUZZLES.length}`,'pm-lead');
      if(!progress.finished)actions(button(progress.scene?'読んでいた会話のつづきへ':'いまの手帳を開く',openCurrent,'pm-primary'));
      actions(button('見つけた思い出',()=>open('notebook')),button('段階ヒント',()=>{hintLevel=0;open('hint');}),button('道案内',directions),button('構内地図',()=>{close();api.openMap?.();}));
      if(progress.finished)actions(button('手紙のページを読み返す',()=>showScene('reveal')),button('最後の会話を読み返す',()=>showScene('ending')));
      actions(button('物語の紹介へ',()=>open('intro')),button('駅を歩く',close));warning();return;
    }
    if(dialog.type==='travel'){
      heading(progress.stage===PUZZLES.length?'あの日の約束の場所へ':'手帳の思い出をたどる');note(`${spot.floor} · ${spot.title}`,'pm-destination');
      photo(spot.id,{caption:'今日、歩いて探す目印',description:`${spot.floor}の${spot.title}。手帳を読む場所。`});
      note(progress.stage===0?'銀の鈴のそばで、写真と祖母の手帳を見比べましょう。':progress.stage===2?'次は1Fのポスト。手帳には、昔の手紙を読み返すためにここへ来る、とあります。':progress.stage===3?'今のSQUARE ZEROで、澄子から新しく届いたはがきを開きます。昔の景色と今の景色を、分けて確かめましょう。':'目印の近くに着くと、手帳の続きを読めます。');
      actions(button('歩いて案内する',()=>{close();api.guideTo?.(spot.zoneId);},'pm-primary'),button('移動を省略して、この場所へ',()=>{close();api.jumpTo(spot.zoneId);}));
      if(nearSpot(api.getPlayer(),spot))actions(button('手帳の続きを開く',openCurrent,'pm-primary'));
      actions(button('自分で歩く',close),button('手帳のメニュー',()=>open('menu')));return;
    }
    if(dialog.type==='puzzle'){
      if(!puzzle){openCurrent();return;}heading(puzzle.title,`思い出の謎 ${progress.stage+1} / ${PUZZLES.length}`);
      if(!nearSpot(api.getPlayer(),spot)){note('目印のそばで、手帳の続きを読みましょう。');actions(button('道案内',directions,'pm-primary'));return;}
      renderPuzzle(puzzle);actions(button('ヒント',()=>{hintLevel=0;open('hint');}),button('駅を見回す',close));warning();return;
    }
    if(dialog.type==='success'){
      const solved=PUZZLES[progress.stage-1];heading('あの日の理由が、分かった',`思い出 ${progress.stage} / ${PUZZLES.length}`);if(progress.stage===2)memoryTimeline();note(solved.successText,'pm-discovery');speech(solved.reflection,'祖母');discovery(solved);
      note(`${spot.floor} · ${spot.title}`,'pm-destination');actions(button(progress.stage===PUZZLES.length?'今日の約束を結ぶ':'手帳の続きをたどる',openCurrent,'pm-primary'),button('歩く道案内',directions),button('駅を見回す',close));return;
    }
    if(dialog.type==='hint'){
      heading('手帳に残った、小さな手がかり');
      if(progress.scene){note('謎はすべて解けました。祖母と紬の会話は、読んでいたところから続けられます。');actions(button('会話のつづきへ',openCurrent,'pm-primary'));return;}
      if(progress.finished){note('再会と手紙のページは、手帳でいつでも読み返せます。');actions(button('思い出を読み返す',()=>open('notebook'),'pm-primary'));return;}
      const hints=puzzle?.hints??['謎の答えはそろいました。B1Fの銀の鈴へ向かいましょう。','祖母から澄子に連絡して、今日の待ち合わせを確かめます。','再会したら、祖母の手帳に挟まれた最後のページを開きましょう。'];
      for(let i=0;i<=Math.min(hintLevel,hints.length-1);i++){const card=make('div','pm-hint');card.append(make('small','',`ヒント ${i+1}`),make('p','',hints[i]));panel.append(card);}
      actions(button(hintLevel<hints.length-1?'もう少しヒントを見る':'手帳に戻る',()=>{if(hintLevel<hints.length-1){hintLevel++;render();panel.querySelector('.pm-primary')?.focus({preventScroll:true});}else openCurrent();},'pm-primary'),...(hintLevel<hints.length-1?[button('手帳に戻る',openCurrent)]:[]),button('道案内',directions));return;
    }
    if(dialog.type==='final'){
      if(!nearSpot(api.getPlayer(),spot)){open('travel');return;}
      if(!progress.invited){
        heading('今日の約束を、確かめる','銀の鈴の下で');speech('「銀の鈴で、15時」。場所も、時刻も、今度は二人で確かめよう。');
        speech('はがきに電話番号も添えてくれていたの。……かけてみようか。','祖母');note('祖母は、絵はがきに添えられた番号へ電話をかける。');
        actions(button('祖母と一緒に、待ち合わせを確かめる',()=>submit({type:'invite'}),'pm-primary'));
      }else if(!progress.reunited){
        heading('今度は、同じ場所で','澄子からの返事');speech('15時に、銀の鈴ね。私も今日は東京駅にいるの。そちらへ向かうから、そこで待っていて。','澄子');
        speech('今度は、探しに出なくても大丈夫だね。');note('少しのあいだ、紬と祖母は鈴のそばで待った。約束の時刻に、見覚えのある人が手を振った。');
        actions(button('やって来た澄子に、声をかける',()=>submit({type:'reunite'}),'pm-primary'));
      }else{
        heading('あの日の約束を、もう一度','二人が会えたあとで');speech('会えなかった日の話、ずっと気になっていたの。私も、あなたを探していたのよ。','澄子');speech('私も。……今日、話せてよかった。','祖母');
        note('二人は同じ思い出を、別の場所から覚えていた。話の続きを聞きながら、紬は手帳からはみ出した一枚に気づく。','pm-lead');
        actions(button('手帳に挟まれた、最後のページを開く',()=>submit({type:'reveal'}),'pm-primary'));
      }
      warning();return;
    }
    if(dialog.type==='reveal'||dialog.type==='ending'){
      if(!progress.revealed){openCurrent();return;}
      const isReveal=dialog.type==='reveal',lines=isReveal?REVEAL:ENDING,line=lines[Math.min(sceneLine,lines.length-1)];
      heading(isReveal?'手紙が、誰かの声になる':EPISODE.title,isReveal?'祖母の手帳、最後のページ':'言葉の、その先へ');
      const scene=make('div','pm-ending-scene');if(line.speaker)speech(line.text,line.speaker,scene);else note(line.text,'pm-lead',scene);panel.append(scene);note(`${sceneLine+1} / ${lines.length}`,'pm-scene-count');
      if(sceneLine<lines.length-1)actions(button('つづきを読む',()=>turnScene(),'pm-primary'));
      else if(isReveal)actions(button('二人と紬の、最後の会話へ',()=>progress.scene?turnScene():showScene('ending'),'pm-primary'));
      else{note('第4作 · おしまい','pm-finish');if(!progress.finished)actions(button('今日の約束を、手帳に残す',()=>turnScene(),'pm-primary'));else actions(button('約束の手帳を開く',()=>open('notebook'),'pm-primary'),button('駅を歩きつづける',close));}
      if(sceneLine>0)actions(button('ひとつ前の言葉',()=>turnScene(true)));warning();return;
    }
    if(dialog.type==='notebook'){
      heading('約束の手帳','謎を解くたび、誰かの理由が見えてくる');
      if(!progress.stage)note('祖母の手帳を開いて、最初の思い出からたどりましょう。');
      for(let i=0;i<progress.stage;i++){const solved=PUZZLES[i],entry=make('details','pm-notebook-entry');entry.append(make('summary','',`${i+1}. ${solved.title}`));evidence(solved,entry);if(i===1)memoryTimeline(entry);note(solved.successText,'pm-discovery',entry);speech(solved.reflection,'祖母',entry);discovery(solved,entry);panel.append(entry);}
      if(progress.invited)note('今日の約束：銀の鈴で15時。二人で場所と時刻を確かめた。','pm-discovery');
      if(progress.reunited)note('祖母と澄子は、銀の鈴の下で再会しました。','pm-discovery');
      if(progress.finished){actions(button('手紙のページを読み返す',()=>showScene('reveal'),'pm-primary'),button('最後の会話を読み返す',()=>showScene('ending')));}
      actions(button(progress.finished?'駅を歩く':progress.scene?'読んでいた会話のつづきへ':'いまの手帳へ',()=>progress.finished?close():openCurrent(),'pm-primary'),button('手帳のメニュー',()=>open('menu')));warning();return;
    }
  }
  function refresh(){
    root.hidden=!playing&&!dialog;hud.hidden=!playing||Boolean(dialog)||!api.isActive();
    if(!playing){prompt.hidden=true;return;}const p=api.getPlayer(),spot=targetSpot(progress);hudFloor.textContent=p.floor;
    hudGoal.textContent=progress.finished?'言葉を、次の誰かへ':progress.scene?'祖母の話のつづきへ':progress.reunited?'手帳の最後のページ':progress.invited?'銀の鈴で、再会を':progress.stage===PUZZLES.length?'今日の約束を確かめる':`${spot.title}で手帳を読む`;
    prompt.hidden=!api.isActive()||Boolean(dialog)||progress.finished||(!progress.scene&&!nearSpot(p,spot));prompt.textContent=progress.scene?'読んでいた会話のつづきへ':progress.reunited?'手帳の最後のページへ':progress.invited?'澄子を迎える':progress.stage===PUZZLES.length?'今日の約束を結ぶ':'祖母の手帳を開く';
    if(dialog)grandmaLabel.hidden=friendLabel.hidden=true;
  }
  async function loadActor(kind,color){
    if(actors.has(kind)||loading.has(kind)||failed.has(kind)||disposed)return;loading.add(kind);
    try{const actor=await createAvatarActor(color);if(disposed){actor.dispose();return;}actors.set(kind,actor);actor.object.name=kind==='self'?'紬':kind==='grandma'?'祖母':'澄子';actor.object.visible=false;if(kind==='self')actor.object.userData.localPlayer=true;api.station.scene.add(actor.object);}
    catch{failed.add(kind);if(!disposed)api.onNotice('人物の姿を表示できませんでした。手帳の謎と会話は、そのまま続けられます。');}finally{loading.delete(kind);}
  }
  function updateActors(dt){
    if(!playing){for(const actor of actors.values())actor.object.visible=false;grandmaLabel.hidden=friendLabel.hidden=true;return;}
    void loadActor('self','blue');const p=api.getPlayer(),self=actors.get('self');
    if(self){self.object.visible=true;self.object.position.set(p.x,p.y-1.65,p.z);self.object.rotation.y=(p.yaw??0)+Math.PI;self.setOpacity?.(api.getCameraOpacity?.()??1);self.setMotion(api.reducedMotion||!p.walking?'Idle':p.movementMode==='run'?'Run':'Walk');self.update(api.reducedMotion?0:dt);}
    const bell=SPOTS[0],near=nearSpot(p,bell,18),elevation=floorById(bell.floor).elevation;
    for(const [kind,color,dx,label] of [['grandma','green',2.4,grandmaLabel],['friend','yellow',4.6,friendLabel]]){
      const visible=near&&(kind==='grandma'||progress.reunited);if(visible)void loadActor(kind,color);const actor=actors.get(kind);label.hidden=true;
      if(actor){actor.object.visible=visible;actor.object.position.set(bell.x+dx,elevation,bell.z+1);actor.object.rotation.y=Math.atan2(p.x-bell.x-dx,p.z-bell.z-1);actor.setMotion('Idle');actor.update(api.reducedMotion?0:dt);
        if(visible&&!dialog){const point=api.project({x:bell.x+dx,y:elevation+2.15,z:bell.z+1});label.hidden=!point.visible;label.style.left=point.x+'px';label.style.top=point.y+'px';}}
    }
  }
  function keydown(event){
    if(!dialog)return;if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close();return;}if(event.key!=='Tab')return;
    const controls=[...panel.querySelectorAll('button:not([disabled]),input:not([disabled]),summary,a[href]')].filter(el=>!el.closest('[hidden]')&&(!el.closest('details:not([open])')||el.tagName==='SUMMARY')),first=controls[0],last=controls.at(-1);
    if(!first){event.preventDefault();panel.focus();}else if(!panel.contains(document.activeElement)){event.preventDefault();first.focus();}else if(event.shiftKey&&(document.activeElement===first||document.activeElement===panel)){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
  document.addEventListener('keydown',keydown,true);scrim.addEventListener('click',close);
  function suspend(){close();playing=false;delete document.body.dataset.promisePlaying;root.hidden=true;updateActors(0);}
  function dispose(){if(disposed)return;suspend();disposed=true;for(const actor of actors.values())actor.dispose();camera.dispose();document.removeEventListener('keydown',keydown,true);root.remove();}
  return {openIntro,close,suspend,dispose,update(dt){if(disposed)return;updateActors(dt);lastTick+=dt;if(lastTick>.15){lastTick=0;refresh();}},get shoulderView(){return playing;}};
}
