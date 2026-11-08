import {GAME_CONTENT} from './content.js?v=game1';
import {createGameState} from './state.js?v=game1';
import {createCharacterLayer} from './characters.js?v=game1';
import {createStoryEpisodes} from './episodes.js?v=audit3';

const clone=value=>JSON.parse(JSON.stringify(value));
const make=(tag,className,text)=>{const element=document.createElement(tag);if(className)element.className=className;if(text!==undefined)element.textContent=text;return element;};
const button=(text,handler,className='game-button')=>{const element=make('button',className,text);element.type='button';if(handler)element.addEventListener('click',handler);return element;};
const uid=prefix=>prefix+'-'+Math.random().toString(36).slice(2,10);
const lines=text=>String(text).split(/\r?\n/).map(line=>line.trim()).filter(Boolean);

export function createGameAddon(api){
  let storage=null;try{storage=window.localStorage;}catch{}
  const state=createGameState({content:GAME_CONTENT,zones:api.zones,storage,key:'tswg:content:v1'});
  const layer=createCharacterLayer({station:api.station,zones:api.zones,isAllowed:api.isAllowed,reducedMotion:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false});
  const zones=new Map(api.zones.map(zone=>[zone.id,zone]));
  let modal=null,tab='characters',editingCharacter=null,editingPuzzle=null,previousFocus=null,undoContent=null,lastCharacterJSON='',disposed=false,markers=[];
  const root=make('div','game-addon');root.id='game-addon';
  const world=make('div','game-interactions');world.id='game-interactions';
  const scrim=make('div','game-modal-scrim');scrim.hidden=true;
  const panel=make('section','game-modal');panel.id='game-modal';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','game-modal-title');panel.tabIndex=-1;
  root.append(world,scrim,panel);document.body.append(root);
  const episode=createStoryEpisodes({...api,beforeModal:()=>close()});
  const studioButton=button('制作',()=>openStudio(),'game-studio-nav');studioButton.id='game-open-studio';studioButton.setAttribute('aria-label','ゲーム制作画面を開く');
  const pencil=document.createElementNS('http://www.w3.org/2000/svg','svg');pencil.setAttribute('viewBox','0 0 24 24');pencil.setAttribute('aria-hidden','true');const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d','m4 16 12-12 4 4L8 20H4Zm10-10 4 4M4 20h16');pencil.append(path);studioButton.prepend(pencil);document.querySelector('.bottom-nav')?.append(studioButton);

  const placeName=id=>{const zone=zones.get(id);return zone?`${zone.floor} · ${zone.title}`:'場所を選んでください';};
  const getSolved=()=>new Set(state.progress.solved??[]);
  const characterName=id=>state.content.characters.find(character=>character.id===id)?.name??'登場人物';
  function focusPanel(){panel.querySelector('input,textarea,select,button,[href]')?.focus();}
  function show(next){
    episode.close();
    if(!modal){previousFocus=document.activeElement;api.onModalChange(true);}
    modal=next;scrim.hidden=false;panel.hidden=false;world.hidden=true;studioButton.setAttribute('aria-expanded','true');renderModal();focusPanel();
  }
  function close(){if(!modal)return;modal=null;panel.hidden=true;scrim.hidden=true;world.hidden=false;panel.replaceChildren();api.onModalChange(false);studioButton.setAttribute('aria-expanded','false');if(previousFocus?.isConnected)previousFocus.focus();previousFocus=null;}
  function openStudio(){show({type:'studio'});}
  function heading(title,eyebrow){
    const header=make('header','game-modal-heading'),text=make('div'),small=make('span','game-eyebrow',eyebrow),h2=make('h2','',title);h2.id='game-modal-title';text.append(small,h2);const closeButton=button('×',close,'game-close');closeButton.setAttribute('aria-label','ゲーム画面を閉じる');header.append(text,closeButton);panel.append(header);
  }
  function notice(text,error=false){let output=panel.querySelector('#game-feedback');if(!output){output=make('p','game-feedback');output.id='game-feedback';output.setAttribute('role','status');panel.append(output);}output.textContent=text;output.classList.toggle('is-error',error);}
  function rememberChange(action,message){
    const before=clone(state.content);
    try{action();undoContent=before;if(modal?.type==='studio')renderModal();if(message)notice(message);return true;}catch(error){notice(error.message||'入力内容を確認してください。',true);return false;}
  }
  function renderModal(){panel.replaceChildren();if(modal?.type==='studio')renderStudio();else if(modal?.type==='character')renderCharacter();else if(modal?.type==='puzzle')renderPuzzle();}
  function field(form,labelText,name,{value='',type='text',required=false,multiline=false,help='',maxLength=2000}={}){
    const label=make('label','game-field'),caption=make('span','',labelText),input=make(multiline?'textarea':'input');input.name=name;input.id='game-field-'+name;input.value=value??'';input.required=required;input.maxLength=maxLength;if(!multiline)input.type=type;else input.rows=name==='dialogue'||name==='question'?4:2;label.append(caption,input);if(help)label.append(make('small','',help));form.append(label);return input;
  }
  function selectField(form,labelText,name,options,value='',{multiple=false,help=''}={}){
    const label=make('label','game-field'),caption=make('span','',labelText),select=make('select');select.name=name;select.id='game-field-'+name;select.multiple=multiple;if(multiple)select.size=Math.min(4,Math.max(2,options.length));
    for(const option of options){const element=make('option','',option.title);element.value=option.id;element.selected=multiple?Array.isArray(value)&&value.includes(option.id):value===option.id;select.append(element);}label.append(caption,select);if(help)label.append(make('small','',help));form.append(label);return select;
  }
  function zoneOptions(){return api.zones.map(zone=>({id:zone.id,title:`${zone.floor} · ${zone.title}`}));}
  function listActions(parent,entity,kind){
    const actions=make('div','game-row-actions');actions.append(button('編集',()=>{if(kind==='character'){editingCharacter=entity.id;tab='characters';}else{editingPuzzle=entity.id;tab='puzzles';}renderModal();panel.querySelector('.game-editor')?.scrollIntoView({block:'start',behavior:'smooth'});panel.querySelector('.game-editor input')?.focus();}));
    actions.append(button(kind==='character'?'会話を確認':'謎を試す',()=>show({type:kind,id:entity.id,line:0})));
    actions.append(button('この場所へ',()=>{close();api.jumpTo(entity.zoneId);}));
    actions.append(button('削除',()=>rememberChange(()=>{if(kind==='character'){editingCharacter=null;state.removeCharacter(entity.id);}else{editingPuzzle=null;state.removePuzzle(entity.id);}},'削除しました。「ひとつ戻す」で元に戻せます。'),'game-button game-button-subtle'));
    parent.append(actions);
  }
  function renderStudio(){
    heading('東京駅のゲーム制作','GAME STUDIO');
    const intro=make('div','game-original-note');intro.append(make('strong','','オリジナルの散策版とは別の制作版です。'),make('p','','この端末に保存されます。書き出したファイルで、ほかの端末や次の制作へ引き継げます。'));
    if(api.originalUrl){const link=make('a','','保存済みのオリジナルを開く ↗');link.href=api.originalUrl;link.target='_blank';link.rel='noopener';intro.append(link);}panel.append(intro);
    const stats=make('p','game-studio-stats',`${state.content.characters.length} 人の登場人物　/　${state.content.puzzles.length} 問の謎　/　${state.progress.solved.length} 問をクリア`);stats.id='game-content-count';panel.append(stats);
    const titleForm=make('form','game-title-form'),titleLabel=make('label','game-field');titleLabel.append(make('span','','作品の題名'));const titleInput=make('input');titleInput.name='projectTitle';titleInput.id='game-project-title';titleInput.value=state.content.title;titleInput.maxLength=100;titleInput.required=true;titleLabel.append(titleInput);const titleSave=button('題名を保存');titleSave.type='submit';titleForm.append(titleLabel,titleSave);titleForm.addEventListener('submit',event=>{event.preventDefault();rememberChange(()=>state.replaceContent({...clone(state.content),title:titleInput.value}),'題名を保存しました。');});panel.append(titleForm);
    const toolbar=make('div','game-toolbar');toolbar.append(button('書き出す',exportContent),button('読み込む（置き換え）',()=>fileInput.click()),button('ひとつ戻す',()=>{if(!undoContent)return;const value=undoContent;undoContent=null;try{state.replaceContent(value);renderModal();notice('直前の内容に戻しました。');}catch(error){notice(error.message,true);}}));toolbar.lastElementChild.disabled=!undoContent;
    const fileInput=make('input');fileInput.type='file';fileInput.accept='.json,application/json';fileInput.hidden=true;fileInput.id='game-import-file';fileInput.addEventListener('change',async()=>{const file=fileInput.files?.[0];if(!file)return;if(file.size>2*1024*1024){notice('読み込めるファイルは2MBまでです。',true);return;}try{const value=JSON.parse(await file.text());rememberChange(()=>{editingCharacter=editingPuzzle=null;state.replaceContent(value);},'制作内容を読み込みました。');}catch(error){notice(error instanceof SyntaxError?'JSONファイルを読み込めませんでした。書き出したファイルを選んでください。':error.message,true);}finally{fileInput.value='';}});toolbar.append(fileInput);panel.append(toolbar);
    if(state.warning)panel.append(make('p','game-storage-warning',state.warning));
    const tabs=make('div','game-studio-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','制作する内容');
    for(const [id,title] of [['characters','登場人物'],['puzzles','謎解き']]){const item=button(title,()=>{tab=id;renderModal();panel.querySelector(`[data-game-studio-tab="${id}"]`)?.focus();});item.dataset.gameStudioTab=id;item.id='game-studio-tab-'+id;item.setAttribute('role','tab');item.setAttribute('aria-selected',String(tab===id));item.tabIndex=tab===id?0:-1;item.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();tab=event.key==='Home'?'characters':event.key==='End'?'puzzles':tab==='characters'?'puzzles':'characters';renderModal();panel.querySelector(`[data-game-studio-tab="${tab}"]`)?.focus();});tabs.append(item);}panel.append(tabs);
    const pane=make('section','game-studio-pane');pane.setAttribute('role','tabpanel');pane.setAttribute('aria-labelledby','game-studio-tab-'+tab);panel.append(pane);
    if(tab==='characters')renderCharacters(pane);else renderPuzzles(pane);
    const footer=make('div','game-studio-footer');footer.append(make('p','','登場場所を選んで追加すると、その場所の近くに人物や謎のマークが現れます。'),button('遊んだ進捗だけをリセット',()=>{state.resetProgress();notice('クリア状況をリセットしました。人物と謎の内容は残っています。');},'game-button game-button-subtle'));panel.append(footer);
  }
  function renderCharacters(pane){
    const list=make('div','game-item-list');list.id='game-character-list';
    if(!state.content.characters.length)list.append(make('p','game-empty','登場人物はまだいません。名前・台詞・登場場所を決めて、最初の一人を追加しましょう。'));
    for(const character of state.content.characters){const row=make('article','game-content-row');row.dataset.characterId=character.id;const heading=make('h3','',character.name);row.append(heading,make('p','',placeName(character.zoneId)),make('small','',`${character.dialogue.length} つの台詞${character.puzzleId?' · 謎と連動':''}`));listActions(row,character,'character');list.append(row);}pane.append(list);
    const character=state.content.characters.find(value=>value.id===editingCharacter),form=make('form','game-editor');form.id='game-character-form';form.append(make('h3','',character?'登場人物を編集':'登場人物を追加'));
    const name=field(form,'名前','characterName',{value:character?.name,required:true,maxLength:100});
    const place=selectField(form,'登場場所','characterZone',zoneOptions(),character?.zoneId??api.zones[0]?.id);
    const dialogue=field(form,'台詞','dialogue',{value:character?.dialogue.join('\n')??'',required:true,multiline:true,help:'一行ごとに、次の台詞へ進みます。'});
    const color=field(form,'服の色','characterColor',{value:character?.color??'#7b9570',type:'color'});
    const puzzle=selectField(form,'関連する謎','characterPuzzle',[{id:'',title:'なし'},...state.content.puzzles.map(value=>({id:value.id,title:value.title}))],character?.puzzleId??'');
    const actions=make('div','game-form-actions'),submit=button(character?'変更を保存':'登場人物を追加',null,'game-button game-button-primary');submit.type='submit';actions.append(submit);if(character)actions.append(button('編集をやめる',()=>{editingCharacter=null;renderModal();}));form.append(actions);
    form.addEventListener('submit',event=>{event.preventDefault();const previous=editingCharacter;editingCharacter=null;if(!rememberChange(()=>state.upsertCharacter({id:character?.id??uid('character'),name:name.value,zoneId:place.value,dialogue:lines(dialogue.value),color:color.value,puzzleId:puzzle.value||null}),'登場人物を保存しました。散策画面で近くまで歩くと話しかけられます。'))editingCharacter=previous;});pane.append(form);
  }
  function renderPuzzles(pane){
    const list=make('div','game-item-list');list.id='game-puzzle-list';const solved=getSolved();
    if(!state.content.puzzles.length)list.append(make('p','game-empty','謎はまだありません。問題と正解、出題する場所を決めて追加できます。'));
    for(const puzzle of state.content.puzzles){const row=make('article','game-content-row');row.dataset.puzzleId=puzzle.id;row.append(make('h3','',puzzle.title),make('p','',placeName(puzzle.zoneId)),make('small','',solved.has(puzzle.id)?'クリア済み':puzzle.requires.length?'前提の謎あり':'いつでも挑戦できます'));listActions(row,puzzle,'puzzle');list.append(row);}pane.append(list);
    const puzzle=state.content.puzzles.find(value=>value.id===editingPuzzle),form=make('form','game-editor');form.id='game-puzzle-form';form.append(make('h3','',puzzle?'謎を編集':'謎を追加'));
    const title=field(form,'謎の題名','puzzleTitle',{value:puzzle?.title,required:true,maxLength:100});
    const place=selectField(form,'出題する場所','puzzleZone',zoneOptions(),puzzle?.zoneId??api.zones[0]?.id);
    const question=field(form,'問題','question',{value:puzzle?.question,required:true,multiline:true});
    const answers=field(form,'正解','answers',{value:puzzle?.answers.join('\n')??'',required:true,multiline:true,help:'別の表記も正解にするときは、一行にひとつずつ書きます。'});
    const hint=field(form,'ヒント（任意）','hint',{value:puzzle?.hint,multiline:true});
    const success=field(form,'正解したときのメッセージ','successText',{value:puzzle?.successText??'正解です！',multiline:true});
    const requirements=state.content.puzzles.filter(value=>value.id!==puzzle?.id).map(value=>({id:value.id,title:value.title}));
    const requires=selectField(form,'先に解く謎（任意）','requires',requirements,puzzle?.requires??[],{multiple:true,help:'選んだ謎をクリアすると、この謎に挑戦できるようになります。'});requires.disabled=!requirements.length;
    const actions=make('div','game-form-actions'),submit=button(puzzle?'変更を保存':'謎を追加',null,'game-button game-button-primary');submit.type='submit';actions.append(submit);if(puzzle)actions.append(button('編集をやめる',()=>{editingPuzzle=null;renderModal();}));form.append(actions);
    form.addEventListener('submit',event=>{event.preventDefault();const previous=editingPuzzle;editingPuzzle=null;if(!rememberChange(()=>state.upsertPuzzle({id:puzzle?.id??uid('puzzle'),title:title.value,zoneId:place.value,question:question.value,answers:lines(answers.value),hint:hint.value,successText:success.value,requires:[...requires.selectedOptions].map(option=>option.value)}),'謎を保存しました。散策画面の出題場所で挑戦できます。'))editingPuzzle=previous;});pane.append(form);
  }
  function exportContent(){const blob=new Blob([JSON.stringify(state.content,null,2)+'\n'],{type:'application/json'}),url=URL.createObjectURL(blob),anchor=make('a');anchor.href=url;anchor.download='tokyo-station-game-content.json';document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);notice('制作内容を書き出しました。');}
  function renderCharacter(){
    const character=state.content.characters.find(value=>value.id===modal.id);if(!character){close();return;}heading(character.name,'CHARACTER');panel.append(make('p','game-place-note',placeName(character.zoneId)));
    modal.line=Math.min(modal.line??0,Math.max(0,character.dialogue.length-1));const speech=make('p','game-dialogue',character.dialogue[modal.line]??'');speech.id='game-character-dialogue';panel.append(speech,make('p','game-dialogue-count',`${modal.line+1} / ${character.dialogue.length}`));
    const actions=make('div','game-form-actions');if(modal.line<character.dialogue.length-1)actions.append(button('次の台詞',()=>{modal.line++;renderModal();focusPanel();},'game-button game-button-primary'));else if(character.puzzleId)actions.append(button('謎に挑戦する',()=>show({type:'puzzle',id:character.puzzleId}),'game-button game-button-primary'));else actions.append(button('またあとで',close,'game-button game-button-primary'));panel.append(actions);
  }
  function renderPuzzle(){
    const puzzle=state.content.puzzles.find(value=>value.id===modal.id);if(!puzzle){close();return;}heading(puzzle.title,'MYSTERY');panel.append(make('p','game-place-note',placeName(puzzle.zoneId)),make('p','game-question',puzzle.question));
    const solved=getSolved().has(puzzle.id);if(solved){const status=make('p','game-solved','クリア済み');panel.append(status,make('p','game-success-message',puzzle.successText||'正解です！'),button('散策に戻る',close,'game-button game-button-primary'));return;}
    if(!state.canPlayPuzzle(puzzle.id)){const needed=puzzle.requires.filter(id=>!getSolved().has(id)).map(id=>state.content.puzzles.find(value=>value.id===id)?.title??id);panel.append(make('p','game-locked','先に「'+needed.join('」「')+'」をクリアすると挑戦できます。'),button('散策に戻る',close));return;}
    const form=make('form','game-answer-form'),answer=field(form,'答え','playerAnswer',{required:true,maxLength:200});answer.autocomplete='off';const submit=button('答える',null,'game-button game-button-primary');submit.type='submit';form.append(submit);form.addEventListener('submit',event=>{event.preventDefault();const result=state.answerPuzzle(puzzle.id,answer.value);if(result.correct||result.alreadySolved){renderModal();focusPanel();}else{notice(result.message||'もう一度考えてみましょう。',!result.locked);panel.querySelector('[name="playerAnswer"]')?.focus();}});panel.append(form);
    if(puzzle.hint){const details=make('details','game-hint');details.append(make('summary','','ヒントを見る'),make('p','',puzzle.hint));panel.append(details);}
  }
  function rebuildWorld(){
    const signature=JSON.stringify(state.content.characters);if(signature!==lastCharacterJSON){layer.setCharacters(state.content.characters);lastCharacterJSON=signature;}
    world.replaceChildren();markers=[];
    for(const character of state.content.characters){const item=layer.items.find(value=>value.id===character.id);if(!item)continue;const marker=button(character.name+'に話しかける',()=>show({type:'character',id:character.id,line:0}),'game-world-marker game-character-marker');marker.dataset.gameCharacter=character.id;world.append(marker);markers.push({kind:'character',entity:character,item,element:marker});}
    for(const puzzle of state.content.puzzles){const zone=zones.get(puzzle.zoneId);if(!zone)continue;const marker=button((getSolved().has(puzzle.id)?'✓ ':'？ ')+puzzle.title,()=>show({type:'puzzle',id:puzzle.id}),'game-world-marker game-puzzle-marker');marker.dataset.gamePuzzle=puzzle.id;world.append(marker);markers.push({kind:'puzzle',entity:puzzle,item:{x:zone.x,z:zone.z,floor:zone.floor},element:marker});}
  }
  const unsubscribe=state.subscribe(()=>{rebuildWorld();if(modal?.type==='studio')renderModal();else if(modal?.type==='puzzle')renderModal();});
  const onKeyDown=event=>{if(!modal)return;if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();return;}if(event.key!=='Tab')return;const controls=[...panel.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],summary')].filter(element=>!element.hidden&&!element.closest('[hidden]'));if(!controls.length){event.preventDefault();panel.focus();return;}const first=controls[0],last=controls.at(-1);if(event.shiftKey&&(document.activeElement===first||document.activeElement===panel)){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}};
  document.addEventListener('keydown',onKeyDown,true);scrim.addEventListener('click',close);rebuildWorld();
  function update(dt){
    if(disposed)return;episode.update(dt);layer.update(dt);const active=api.isActive()&&!modal;world.hidden=!active;if(!active)return;const player=api.getPlayer();
    for(const marker of markers){const p=marker.item,dx=player.x-p.x,dz=player.z-p.z,distance=Math.hypot(dx,dz);if(p.floor!==player.floor||distance>12){marker.element.hidden=true;continue;}const projected=marker.kind==='puzzle'&&distance<1.5?{x:innerWidth/2,y:innerHeight*.53,visible:true}:api.project({x:p.x,y:marker.kind==='character'?p.headY:player.y+1.1,z:p.z});marker.element.hidden=!projected.visible;if(!projected.visible)continue;marker.element.style.left=projected.x+'px';marker.element.style.top=(projected.y+(marker.kind==='puzzle'?30:0))+'px';}
  }
  function dispose(){if(disposed)return;close();episode.dispose();disposed=true;unsubscribe?.();document.removeEventListener('keydown',onKeyDown,true);layer.dispose();studioButton.remove();root.remove();}
  return {update,close:()=>{episode.close();close();},dispose,get shoulderView(){return episode.shoulderView;}};
}
