import * as THREE from '../vendor/three.module.js';
import {floorById} from '../floor-layout.js?v=game1';
import {EPISODE,SPOTS,CLUES,HINTS,initialProgress,sanitizeProgress,targetSpot,nearSpot,applyAction} from './ticket-state.js?v=audit3';
import {requestRoom as jsonFetch,roomSessionEnded,recoveredProgress} from './ticket-session.js?v=audit3';
import {AVATARS,avatarById,avatarIdFromColor} from './avatar-catalog.js?v=avatar1';
import {createAvatarActor,createAvatarPreview} from './avatar-layer.js?v=shoulder1';

const saveKey='tswg:time-letter:v1',teamKey='tswg:time-letter:room';
const make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
const button=(text,fn,cls='tg-secondary')=>{const e=make('button',cls,text);e.type='button';e.addEventListener('click',fn);return e;};
const paths={bell:'<path d="M7 10a5 5 0 0 1 10 0v5l2 3H5l2-3ZM10 21h4M12 3v2"/>',pillars:'<path d="M3 20V7h4v13m3 0V3h4v17m3 0V7h4v13M2 21h20"/>',postbox:'<path d="m3 10 9-7 9 7M5 9v12h14V9M8 13h8M8 17h8M10 5V3h4v2"/>',train:'<rect x="5" y="3" width="14" height="15" rx="3"/><path d="M5 10h14M8 21l2-3m6 3-2-3M8 14h2m4 0h2"/>',gate:'<path d="M3 21V8h5v13M16 21V8h5v13M8 12h8M4 4h16"/>',ticket:'<path d="M3 5h18v5a2 2 0 0 0 0 4v5H3v-5a2 2 0 0 0 0-4ZM8 5v14m4-10h5m-5 6h5"/>',letter:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>'};
export function ticketIcon(id){const span=make('span','tg-icon');span.setAttribute('aria-hidden','true');span.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${paths[id]??paths.ticket}</svg>`;return span;}

export function createTicketEpisode(api){
  let saved;try{saved=JSON.parse(localStorage.getItem(saveKey));}catch{}
  let selectedAvatar='red';try{selectedAvatar=avatarById(localStorage.getItem('tswg:avatar:v1')).id;}catch{}
  let avatarPreview=null,selfActor=null,selfAvatarId=null,selfRequest=0;
  let progress=sanitizeProgress(saved),playing=false,lensOn=false,dialog=null,previousFocus=null,sequence=[],hintLevel=0,disposed=false,busy=false,team=null,syncing=null,lastPoll=0,networkError='',teamRecovery=null,lastHud='',lastGhost='',lastMembers='',lastTick=0;
  const peers=new Map(),listeners=[];
  const root=make('div');root.id='ticket-game';document.body.append(root);
  const embedded=window.self!==window.top;if(embedded)document.body.dataset.ticketEmbedded='true';
  const hud=make('aside','tg-hud');hud.hidden=true;hud.setAttribute('aria-label','物語の進み具合');
  const eyebrow=make('p','tg-eyebrow','時を超えた一通 · 第1作'),objective=make('strong'),progressRow=make('div','tg-progress'),status=make('small','tg-room','1人で探索中'),memberList=make('div','tg-members');
  const actions=make('div','tg-actions');actions.append(button('手帳',()=>open('notebook')),button('道案内',()=>open('route')),button('ヒント',()=>{hintLevel=0;open('hint');}),button('仲間',()=>open('team')));
  hud.append(eyebrow,objective,progressRow,status,memberList,actions);root.append(hud);
  const traveler=button('',()=>open('avatar'),'tg-traveler');traveler.setAttribute('aria-label','自分の旅人を選ぶ');hud.insertBefore(traveler,progressRow);
  const compact=make('aside','tg-compact');compact.hidden=true;compact.setAttribute('aria-label','現在の階と目的地');
  const compactFloor=make('span','tg-compact-floor'),compactGoal=make('strong','tg-compact-goal'),infoToggle=button('情報',()=>open('info'),'tg-info-toggle');
  infoToggle.id='ticket-info';infoToggle.setAttribute('aria-label','ゲームの情報を開く');infoToggle.setAttribute('aria-expanded','false');infoToggle.setAttribute('aria-controls','ticket-dialog');compact.append(compactFloor,compactGoal,infoToggle);root.append(compact);
  const reader=make('div','tg-reader');root.append(reader);
  const lens=make('div','tg-lens');lens.hidden=true;lens.setAttribute('role','region');lens.setAttribute('aria-label','切符越しの昔の案内');
  const lensHead=make('div','tg-lens-head','TOKYO STATION  ·  時うつしの切符'),windowPane=make('div','tg-lens-window'),ghost=make('div','tg-ghost'),lensFoot=make('div','tg-lens-foot','この窓に、昔の言葉があらわれる。');windowPane.tabIndex=0;windowPane.setAttribute('aria-label','昔の案内。長い文章はスクロールできます。');windowPane.append(ghost);lens.append(lensHead,windowPane,lensFoot);reader.append(lens);
  const prompt=make('div','tg-prompt');prompt.hidden=true;prompt.setAttribute('role','status');root.append(prompt);
  const toolbar=make('div','tg-toolbar');toolbar.hidden=true;
  const read=button('昔の案内を読む',readClue,'tg-primary');read.hidden=true;read.id='ticket-read';
  const ticket=button('切符をかざす',()=>{lensOn=!lensOn;ticket.setAttribute('aria-pressed',String(lensOn));refresh();},'tg-primary tg-floating');ticket.id='ticket-toggle';ticket.prepend(ticketIcon('ticket'));ticket.setAttribute('aria-pressed','false');
  toolbar.append(read,ticket);reader.append(toolbar);
  const scrim=make('div','tg-scrim');scrim.hidden=true;const panel=make('section','tg-panel');panel.id='ticket-dialog';panel.hidden=true;panel.tabIndex=-1;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','tg-dialog-title');root.append(scrim,panel);
  const launch=button('物語をはじめる',()=>open('intro'),'primary');launch.id='ticket-start';launch.prepend(ticketIcon('ticket'));
  document.querySelector('#welcome #start')?.before(launch);
  const resume=button('物語に戻る',()=>{if(!playing)begin(false);else refresh();},'game-studio-nav');resume.id='ticket-resume';resume.prepend(ticketIcon('ticket'));document.querySelector('.bottom-nav')?.append(resume);
  const on=(node,type,handler,options)=>{node.addEventListener(type,handler,options);listeners.push(()=>node.removeEventListener(type,handler,options));};
  function persist(){if(team)return;try{localStorage.setItem(saveKey,JSON.stringify(progress));}catch{}}
  function feedback(message){if(!dialog){api.onNotice(message);return;}let p=panel.querySelector('.tg-feedback');if(!p){p=make('p','tg-feedback');p.setAttribute('role','status');panel.append(p);}p.textContent=message;}
  function close(){if(!dialog){if(lensOn){lensOn=false;refresh();}return;}avatarPreview?.dispose();avatarPreview=null;dialog=null;infoToggle.setAttribute('aria-expanded','false');panel.hidden=scrim.hidden=true;panel.replaceChildren();api.onModalChange(false);if(previousFocus?.isConnected)previousFocus.focus();previousFocus=null;refresh();}
  function open(type){if(api.onSelect?.()===false)return;api.beforeModal?.();if(!dialog){previousFocus=document.activeElement;api.onModalChange(true);}dialog=type;infoToggle.setAttribute('aria-expanded',String(type==='info'));scrim.hidden=panel.hidden=false;lens.hidden=true;sequence=[];renderDialog();setBusy(busy);panel.scrollTop=0;panel.querySelector('button,input')?.focus({preventScroll:true});}
  function header(title,kicker='東京駅のふしぎな切符'){const h=make('header','tg-panel-head'),text=make('div');text.append(make('p','tg-eyebrow',kicker));const titleEl=make('h2','tg-title',title);titleEl.id='tg-dialog-title';text.append(titleEl);const x=button(dialog==='info'?'閉じる':'×',close,'tg-close');x.setAttribute('aria-label',dialog==='info'?'ゲーム情報を閉じる':'閉じる');h.append(text,x);panel.append(h);}
  function note(text,cls='tg-note'){panel.append(make('p',cls,text));}
  function addActions(...items){const row=make('div','tg-actions');row.append(...items);panel.append(row);return row;}
  function portrait(id){const avatar=avatarById(id),icon=make('span','tg-avatar-portrait');icon.style.backgroundPosition=`${avatar.portrait*100/3}% center`;icon.setAttribute('aria-hidden','true');return icon;}
  function memberAvatar(member){return avatarById(member.avatarId??avatarIdFromColor(member.color));}
  function rememberAvatar(id){selectedAvatar=avatarById(id).id;try{localStorage.setItem('tswg:avatar:v1',selectedAvatar);}catch{}refresh();}
  function renderAvatarPicker(parent){
    const section=make('section','tg-avatar-picker');section.setAttribute('aria-label','旅人の姿を選ぶ');section.append(make('h3','','あなたの旅人'));
    const preview=make('div','tg-avatar-preview');section.append(preview);
    avatarPreview=createAvatarPreview(preview,selectedAvatar,{reducedMotion:api.reducedMotion});
    const grid=make('div','tg-avatar-grid'),selection=make('p','tg-avatar-selection');section.append(grid,selection);
    for(const avatar of AVATARS){
      const occupied=Boolean(team?.members?.some(member=>member.id!==team.selfId&&memberAvatar(member).id===avatar.id));
      const item=button('',async()=>{if(busy)return;busy=true;setBusy(true);try{if(team){await sync(undefined,avatar.id);}else rememberAvatar(avatar.id);avatarPreview?.setAvatar(selectedAvatar);drawSelection();}catch(error){feedback(error.message);}finally{busy=false;setBusy(false);drawSelection();}},'tg-avatar-choice');
      item.dataset.avatar=avatar.id;item.style.setProperty('--avatar-color',avatar.color);item.disabled=occupied;item.setAttribute('aria-label',avatar.name+(occupied?'（仲間が使用中）':''));item.append(portrait(avatar.id),make('span','',avatar.name),make('small','',occupied?'使用中':'選べます'));grid.append(item);
    }
    function drawSelection(){for(const item of grid.children){const active=item.dataset.avatar===selectedAvatar,occupied=Boolean(team?.members?.some(member=>member.id!==team.selfId&&memberAvatar(member).id===item.dataset.avatar));item.disabled=occupied;item.setAttribute('aria-pressed',String(active));item.querySelector('small').textContent=occupied?'使用中':active?'あなたの姿':'選べます';}selection.textContent=avatarById(selectedAvatar).name+'で、駅を歩きます。';}
    drawSelection();parent.append(section);
  }
  function begin(reset){if(busy){feedback('通信中です。少し待ってから、もう一度お試しください。');return;}if(api.onSelect?.()===false)return;if(team){feedback('1人で始め直すには、先に「仲間」から部屋を退出してください。');return;}if(reset)progress=initialProgress();playing=true;document.body.dataset.ticketPlaying='true';close();lensOn=false;api.jumpTo(targetSpot(progress).zoneId);persist();refresh();api.onNotice('まずは「切符をかざす」を押してみましょう。');}
  function renderDialog(){
    avatarPreview?.dispose();avatarPreview=null;
    panel.dataset.view=dialog??'';
    panel.replaceChildren();
    if(dialog==='info'){renderInfo();return;}
    if(dialog==='intro'){
      header(EPISODE.title,'第1作 · はじめての謎解き');
      const drawing=make('div','tg-invitation');drawing.append(ticketIcon('ticket'),make('span','','時うつしの切符'),ticketIcon('letter'));panel.append(drawing);
      note('宛先の消えた手紙と、古い切符を拾った。\n切符の窓から駅をのぞくと、昔の案内が浮かびあがる。','tg-lead');
      note('自分の人物の右肩越しに駅を歩き、三つの目印をたどって、手紙の宛先を見つけましょう。');
      const grid=make('div','tg-grid');for(const [n,t] of [['01','切符をかざして、発見する'],['02','同じ形を、見つける'],['03','印を並べて、手紙を届ける']]){const c=make('div','tg-card');c.append(make('small','tg-eyebrow',n),make('strong','',t));grid.append(c);}panel.append(grid);
      note('制限時間なし · 間違えても減点なし · ヒントあり');
      renderAvatarPicker(panel);
      if(progress.stage>0||progress.delivered)addActions(button(progress.delivered?'届いた手紙を読み返す':'つづきから遊ぶ',()=>progress.delivered?open('letter'):begin(false),'tg-primary'));
      addActions(button('最初から遊ぶ',()=>progress.stage>0||progress.delivered?open('reset'):begin(true),'tg-primary'),button('仲間と遊ぶ（1〜4人）',()=>open('team')));return;
    }
    if(dialog==='reset'){
      header('最初から、もう一度');note('第1作のソロの記録を最初に戻します。仲間の記録や、ほかの作品の記録は変わりません。');
      addActions(button('最初からはじめる',()=>begin(true),'tg-primary'),button('記録を残して戻る',()=>open('intro')));return;
    }
    if(dialog==='avatar'){
      header('あなたの旅人','四つの色、四つの旅。');renderAvatarPicker(panel);note('この人物の右肩越しに駅を歩きます。立ち止まる・歩く・走る動きにも対応しています。');addActions(button('この旅人で駅に戻る',close,'tg-primary'));return;
    }
    if(dialog==='notebook'){
      header('旅の手帳','見つけた言葉は、ここに。');
      for(let i=0;i<3;i++){const card=make('article','tg-card');card.append(ticketIcon(SPOTS[i].id),make('small','tg-eyebrow',`0${i+1} · ${SPOTS[i].floor}`));if(progress.stage>i){card.append(make('h3','',SPOTS[i].title),make('p','',CLUES[i].text));}else card.append(make('h3','',i===progress.stage?'次の発見を待っています':'まだ見つけていない案内'));panel.append(card);}
      if(progress.delivered)note('手紙は無事に届きました。見つけた案内を、いつでも読み返せます。');else if(progress.stage===3)note('三つの印がそろいました。ポストの前で手紙を届けましょう。');
      if(progress.delivered)addActions(button('届いた手紙を読む',()=>open('letter'),'tg-primary'));
      addActions(button('駅に戻る',close));return;
    }
    if(dialog==='route'){
      const spot=targetSpot(progress);header(progress.delivered?'手紙を届けた場所へ':'次の目印へ','迷ったら、ひと休み。');
      const card=make('div','tg-card');card.append(ticketIcon(spot.id),make('small','tg-eyebrow',spot.floor),make('h3','',spot.title));panel.append(card);note('歩いて向かうことも、目印の前から再開することもできます。');
      addActions(button('歩いて案内する',()=>{close();lensOn=false;api.guideTo?.(spot.zoneId);},'tg-primary'),button('目印の前へ移動する',()=>{close();lensOn=false;api.jumpTo(spot.zoneId);}));return;
    }
    if(dialog==='hint'){
      header('切符からの小さなヒント');
      if(progress.delivered){note('手紙は無事に届きました。手帳で発見を読み返したり、駅の散策を楽しめます。');addActions(button('手帳を読む',()=>open('notebook'),'tg-primary'),button('駅に戻る',close));return;}
      const hints=HINTS[progress.stage];for(let i=0;i<=hintLevel;i++){const card=make('div','tg-card');card.append(make('small','tg-eyebrow',`ヒント ${i+1}`),make('p','',hints[i]));panel.append(card);}
      addActions(button(hintLevel<2?'もう少しヒントを見る':'道案内を見る',()=>{if(hintLevel<2){hintLevel++;renderDialog();}else open('route');},'tg-primary'),button('考えてみる',close));return;
    }
    if(dialog==='choice'){
      header('小さな駅舎は、どれ？','02 · 絵を見くらべる');note(CLUES[1].text,'tg-lead');
      const image=make('div','tg-invitation');image.append(ticketIcon('postbox'));panel.append(image);note('切符に浮かんだ絵と、同じ形を選んでください。');
      const options=make('div','tg-options');for(const [id,title] of [['train','電車'],['gate','改札'],['postbox','駅舎型ポスト']]){const b=button(title,()=>void submit({type:'choice',answer:id}),'tg-option');b.prepend(ticketIcon(id));options.append(b);}panel.append(options);addActions(button('手帳を見る',()=>open('notebook')));return;
    }
    if(dialog==='order'){
      header('手紙のたどった道','03 · 印を順番に');note('見つけた目印を、出会った順に並べてください。\n手帳を見ながらで、だいじょうぶ。','tg-lead');
      const slots=make('div','tg-sequence');panel.append(slots);const options=make('div','tg-options');
      function draw(){slots.replaceChildren();for(let i=0;i<3;i++){const slot=make('div','tg-slot');slot.append(make('small','',String(i+1)));if(sequence[i])slot.append(ticketIcon(sequence[i]),make('span','',SPOTS.find(s=>s.id===sequence[i]).title));else slot.append(make('span','','？'));slots.append(slot);}for(const b of options.children)b.disabled=sequence.includes(b.dataset.stamp)||sequence.length===3;check.disabled=sequence.length!==3;}
      for(const id of ['postbox','bell','pillars']){const b=button(SPOTS.find(s=>s.id===id).title,()=>{sequence.push(id);draw();},'tg-option');b.dataset.stamp=id;b.prepend(ticketIcon(id));options.append(b);}panel.append(options);
      const check=button('この順番で届ける',()=>void submit({type:'order',answer:[...sequence]}),'tg-primary');addActions(check,button('並べ直す',()=>{sequence=[];draw();}),button('手帳を見返す',()=>{open('notebook');}));draw();return;
    }
    if(dialog==='discovery'){
      const i=Math.max(0,progress.stage-1);header(i===2?'手紙の宛先が戻りました':'新しい印を受け取りました','小さな発見');
      const stamp=make('div','tg-invitation');stamp.append(ticketIcon(SPOTS[i].id),make('strong','',SPOTS[i].title));panel.append(stamp);note(CLUES[i].text,'tg-lead');
      if(progress.stage===3)addActions(button('手紙を開く',()=>open('letter'),'tg-primary'));else{note('次の目印：'+targetSpot(progress).floor+' · '+targetSpot(progress).title);addActions(button('次の目印へ',()=>open('route'),'tg-primary'),button('自分で探す',close));}return;
    }
    if(dialog==='letter'){
      header('未来の駅を歩く、あなたへ','宛先の戻った手紙');note(CLUES[3].text,'tg-lead');note('忙しい毎日のなかで、\n小さな約束を見つけてくれた、あなたへ。\n\nいつかまた、銀の鈴の下で。');note(progress.delivered?'ここまで歩いてきたあなたに届いた一通。\n受け取った言葉を、次にこの駅を歩く人へと託しました。':'この手紙は、ここまで歩いてきたあなたに届いたのでした。\n受け取った言葉を、今度は次にこの駅を歩く人へ。\nポストに託して、小さな約束をつなぎましょう。');
      if(progress.delivered){note('あなたに届いた言葉は、旅の手帳に残っています。手紙は次の旅人へ託しました。');addActions(button('結末を読む',()=>open('ending'),'tg-primary'),button('駅に戻る',close));}
      else addActions(button('手紙を届ける',()=>void submit({type:'deliver'}),'tg-primary'),button('あとで届ける',close));return;
    }
    if(dialog==='ending'){
      header('手紙を、次の旅人へ','第1作 · おしまい');const end=make('div','tg-ending');end.append(ticketIcon('letter'),make('strong','','約束をつなぎました'),make('p','','また、この駅で。'));panel.append(end);note('鈴の音、三本の光、小さな赤レンガの駅舎。\nあなたに届いた一通は、次にこの駅を歩く人への便りになりました。','tg-lead');
      if(team)note('仲間と一緒に届けた手紙は、みんなの手帳に残りました。');
      addActions(button('駅を歩きつづける',close,'tg-primary'),button('手帳を読む',()=>open('notebook')));if(!team)addActions(button('もう一度遊ぶ',()=>open('reset')));return;
    }
    if(dialog==='team'){renderTeam();}
  }
  function refreshOpenDialog(){
    const active=document.activeElement,restore=panel.contains(active),text=active?.textContent,label=active?.getAttribute?.('aria-label'),scroll=panel.scrollTop;
    renderDialog();setBusy(busy);panel.scrollTop=scroll;
    if(restore){const match=[...panel.querySelectorAll('button')].find(item=>(label&&item.getAttribute('aria-label')===label)||(!label&&item.textContent===text));(match??panel.querySelector('.tg-close'))?.focus({preventScroll:true});}
  }
  function renderInfo(){
    header('ゲーム情報','時を超えた一通 · 第1作');
    const player=api.getPlayer(),location=api.getLocation?.(),target=targetSpot(progress),summary=make('div','tg-info-summary');
    summary.append(make('p','tg-info-location',`${player.floor} · ${location?.title??'東京駅'}`),make('p','tg-info-next',progress.delivered?'手紙を届けました':progress.stage===3?'宛先の戻った手紙を届けよう':`次の目印：${target.floor} · ${target.title}`),make('p','tg-info-mode',team?(networkError?'再接続を待っています':`${team.members?.filter(member=>member.online).length??1}人で協力中 · 合言葉 ${team.code}`):'1人で探索中'));panel.append(summary);
    const stamps=make('div','tg-info-stamps');for(let i=0;i<3;i++){const stamp=make('span','tg-stamp');stamp.classList.toggle('is-found',progress.stage>i);stamp.append(ticketIcon(SPOTS[i].id),make('small','',progress.stage>i?'✓':String(i+1)));stamp.setAttribute('aria-label',SPOTS[i].title+(progress.stage>i?'の印を発見済み':'の印は未発見'));stamps.append(stamp);}panel.append(stamps);
    const menu=make('div','tg-info-actions');menu.append(button('人物を選ぶ',()=>open('avatar')),button('手帳',()=>open('notebook')),button('道案内',()=>open('route')),button('ヒント',()=>{hintLevel=0;open('hint');}),button('仲間',()=>open('team')),button('構内地図',()=>{close();lensOn=false;api.openMap?.();}));panel.append(menu);
    const utilities=make('div','tg-info-utilities');utilities.append(button('設定',()=>{close();api.openSettings?.();}),button('操作の説明',()=>{close();api.openHelp?.();}));panel.append(utilities);
    if(team){const members=make('div','tg-info-members tg-members');for(const member of team.members??[]){const item=make('span','',member.name+(member.id===team.selfId?'（あなた）':''));item.prepend(portrait(memberAvatar(member).id));members.append(item);}panel.append(members);}
  }
  function renderTeam(){
    header('一緒に、駅を歩こう','1〜4人の協力プレイ');
    if(team){
      const invitation=make('div','tg-invitation');invitation.append(make('small','','合言葉'),make('strong','',team.code));panel.append(invitation);note('同じゲームを開き、この合言葉で参加できます。発見と手帳はみんなで共有されます。');
      const list=make('div','tg-members');for(const m of team.members??[]){const row=make('p','tg-avatar-member');row.append(portrait(memberAvatar(m).id),make('span','',`${m.id===team.selfId?'あなた · ':''}${m.name}${m.online?'':'（ひと休み中）'}`));list.append(row);}panel.append(list);renderAvatarPicker(panel);
      addActions(button('招待リンクをコピー',async()=>{const url=new URL(location.href);url.search='';url.searchParams.set('room',team.code);try{await navigator.clipboard.writeText(url.href);feedback('招待リンクをコピーしました。');}catch{const input=make('input');input.readOnly=true;input.value=url.href;panel.append(input);input.select();feedback('このリンクをコピーしてください。');}}),button('駅に戻る',close,'tg-primary'));
      addActions(button('部屋から退出する',()=>void leaveTeam(true)));return;
    }
    note('誰でも切符を使えます。誰かが見つけた案内は、全員の手帳に残ります。相談しながら進めましょう。','tg-lead');
    if(teamRecovery){note(teamRecovery.message,'tg-feedback');if(playing)addActions(button('このまま1人で続ける',close,'tg-primary'));}
    renderAvatarPicker(panel);
    const form=make('form');const nameLabel=make('label','tg-card','あなたの呼び名');const name=make('input');name.name='traveler';name.placeholder='旅人';name.maxLength=16;name.autocomplete='nickname';nameLabel.append(name);form.append(nameLabel);
    const create=button('新しい部屋をつくる',()=>void joinTeam('create',name.value),'tg-primary');form.append(create);
    const codeLabel=make('label','tg-card','合言葉で参加');const code=make('input');code.name='room';code.maxLength=6;code.placeholder='例：ABC234';code.autocomplete='off';code.autocapitalize='characters';code.value=teamRecovery?.code??new URLSearchParams(location.search).get('room')??'';codeLabel.append(code);form.append(codeLabel);
    const join=button('この部屋に参加する',()=>void joinTeam('join',name.value,code.value),'tg-secondary');form.append(join);form.addEventListener('submit',e=>e.preventDefault());panel.append(form);
    let previous;try{previous=JSON.parse(sessionStorage.getItem(teamKey));}catch{}if(previous?.code&&previous?.token)addActions(button('前の部屋に戻る',()=>void reconnect(previous)));
    note('同じURLを開いて、合言葉で参加できます。');
  }
  function acceptRoom(value,session){if(!value.room||session!==team)return;const wasDisconnected=Boolean(networkError),previous=progress,previousMembers=JSON.stringify(team.members?.map(m=>[m.id,m.name,m.online,m.avatarId]));team.selfId=value.selfId??team.selfId;team.members=value.members??team.members;const self=team.members.find(member=>member.id===team.selfId);if(self)rememberAvatar(memberAvatar(self).id);team.expiresAt=value.room.expiresAt;progress=sanitizeProgress({version:1,stage:Math.max(progress.stage,value.room.stage),delivered:progress.delivered||value.room.delivered});networkError='';refresh();if(playing&&(progress.stage>previous.stage||(!previous.delivered&&progress.delivered))){if(!busy)api.onNotice(progress.delivered?'仲間と一緒に、手紙を届けました。':'仲間の発見が手帳に届きました。');if(!busy&&dialog&&['choice','order','letter'].includes(dialog))open(progress.delivered?'ending':'discovery');else if(!busy&&dialog&&['route','notebook','hint','info'].includes(dialog))refreshOpenDialog();}if(!busy&&['team','avatar','info'].includes(dialog)&&(wasDisconnected||previousMembers!==JSON.stringify(team.members?.map(m=>[m.id,m.name,m.online,m.avatarId]))))refreshOpenDialog();}
  async function joinTeam(kind,name,code){if(busy)return;if(kind==='join'&&!/^[A-Z0-9]{6}$/.test(code.trim().toUpperCase())){feedback('6文字の合言葉を入力してください。');return;}busy=true;setBusy(true);try{const value=await jsonFetch(kind==='create'?'/api/rooms':`/api/rooms/${encodeURIComponent(code.trim().toUpperCase())}/join`,{name:name.trim()||'旅人',avatarId:selectedAvatar});teamRecovery=null;networkError='';team={code:value.room.code,token:value.token,selfId:value.selfId,members:[]};progress=initialProgress();acceptRoom(value,team);try{sessionStorage.setItem(teamKey,JSON.stringify({code:team.code,token:team.token,selfId:team.selfId}));}catch{}playing=true;document.body.dataset.ticketPlaying='true';close();api.jumpTo(targetSpot(progress).zoneId);open('team');}catch(e){feedback(e.message);}finally{busy=false;setBusy(false);}}
  async function reconnect(previous){
    if(busy)return;busy=true;setBusy(true);const solo=progress;
    try{
      team={...previous,members:[]};progress=initialProgress();await sync();
      if(!team)return;
      teamRecovery=null;playing=true;document.body.dataset.ticketPlaying='true';close();api.jumpTo(targetSpot(progress).zoneId);open('team');
    }catch(e){
      if(team){team=null;progress=solo;networkError='';clearPeers();refresh();feedback(e.message);}
      else{progress=recoveredProgress(progress,solo);persist();refresh();}
    }finally{busy=false;setBusy(false);}
  }
  function endRoomSession(session,error){
    if(team!==session)return;
    let local;try{local=JSON.parse(localStorage.getItem(saveKey));}catch{}
    team=null;syncing=null;networkError='';clearPeers();
    try{sessionStorage.removeItem(teamKey);}catch{}
    progress=recoveredProgress(progress,local);persist();
    teamRecovery={code:error.status===401?session.code:'',message:error.status===401?'部屋との接続が終了しました。見つけた案内は手帳に残しています。合言葉で入り直すか、1人で続けられます。':'部屋の期限が切れました。見つけた案内は手帳に残しています。新しい部屋をつくるか、1人で続けられます。'};
    lensOn=false;open('team');refresh();
  }
  async function leaveTeam(showIntro){
    if(busy){feedback('通信中です。少し待ってから部屋を退出してください。');return;}
    const previous=team,shared=progress;
    let local;try{local=JSON.parse(localStorage.getItem(saveKey));}catch{}
    team=null;syncing=null;networkError='';clearPeers();
    try{sessionStorage.removeItem(teamKey);}catch{}
    progress=recoveredProgress(shared,local);persist();
    if(previous)void jsonFetch(`/api/rooms/${previous.code}/leave`,{token:previous.token}).catch(()=>{});
    if(showIntro){close();playing=false;delete document.body.dataset.ticketPlaying;open('intro');}refresh();
  }
  async function sync(action,avatarId){if(!team)return null;if(syncing)await syncing;if(!team)return null;const session=team;const p=api.getPlayer();const task=jsonFetch(`/api/rooms/${session.code}/sync`,{token:session.token,position:{x:p.x,z:p.z,floor:p.floor,yaw:p.yaw??0},...(action?{action}:{}),...(avatarId?{avatarId}:{})}).then(value=>{acceptRoom(value,session);return value;}).catch(e=>{if(team===session){if(roomSessionEnded(e))endRoomSession(session,e);else{const changed=networkError!==e.message;if(e.code!=='avatar_taken')networkError=e.message;refresh();if(changed&&dialog==='info'&&!busy)refreshOpenDialog();}}throw e;});syncing=task;try{return await task;}finally{if(syncing===task)syncing=null;}}
  function setBusy(value){for(const b of panel.querySelectorAll('button')){if(value){if(b.dataset.wasDisabled===undefined)b.dataset.wasDisabled=String(b.disabled);b.disabled=true;}else if(b.dataset.wasDisabled!==undefined){b.disabled=b.dataset.wasDisabled==='true';delete b.dataset.wasDisabled;}}panel.setAttribute('aria-busy',String(value));if(!value&&dialog&&!panel.contains(document.activeElement))panel.querySelector('button:not([disabled]),input:not([disabled])')?.focus({preventScroll:true});}
  async function submit(action){if(busy)return;busy=true;setBusy(true);const requestTeam=team;try{let result;if(requestTeam){const value=await sync(action);if(team!==requestTeam)return;const outcome=value?.action;result={correct:outcome?.ok===true||outcome?.correct===true,message:outcome?.message??'同じ場所でもう一度試してみましょう。'};}else{result=applyAction(progress,action,api.getPlayer());progress=result.progress;persist();}
      if(result.correct){lensOn=false;chime(action.type==='deliver');open(progress.delivered?'ending':'discovery');}else feedback(result.message);
    }catch(e){feedback(e.message);}finally{busy=false;setBusy(false);if(dialog==='order'){const check=[...panel.querySelectorAll('button')].find(b=>b.textContent==='この順番で届ける');if(check)check.disabled=sequence.length!==3;}refresh();}}
  function chime(ending=false){if(document.querySelector('#sound')?.getAttribute('aria-pressed')!=='true')return;try{const context=new(window.AudioContext||window.webkitAudioContext)();const tones=ending?[523,659,784,1046]:[659,880];tones.forEach((f,i)=>{const o=context.createOscillator(),g=context.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(0,context.currentTime+i*.17);g.gain.linearRampToValueAtTime(.035,context.currentTime+i*.17+.02);g.gain.exponentialRampToValueAtTime(.001,context.currentTime+i*.17+.65);o.connect(g);g.connect(context.destination);o.start(context.currentTime+i*.17);o.stop(context.currentTime+i*.17+.7);});setTimeout(()=>context.close(),1600);}catch{}}
  function readClue(){if(!playing||!lensOn)return;const spot=targetSpot(progress);if(!nearSpot(api.getPlayer(),spot)||!isLooking(spot)){api.onNotice('目印の近くで、その方向を見ながら切符をかざしてみましょう。');return;}if(progress.delivered){open('letter');return;}if(progress.stage===0)void submit({type:'bell'});else open(progress.stage===1?'choice':progress.stage===2?'order':'letter');}
  function isLooking(spot){const p=api.getPlayer();return api.project({x:spot.modelX,y:p.y+.65,z:spot.modelZ}).visible;}
  function refresh(){
    hud.hidden=toolbar.hidden=compact.hidden=!playing;resume.hidden=false;root.dataset.playing=String(playing);if(!playing){lens.hidden=prompt.hidden=true;delete document.body.dataset.ticketLens;return;}
    const target=targetSpot(progress),current=api.getPlayer(),shortNames={bell:'銀の鈴',pillars:'SQUARE ZERO',postbox:'駅舎型ポスト'};compactFloor.textContent=current.floor;compactGoal.textContent=progress.delivered?'手紙を届けました':progress.stage===3?'手紙を届けよう':`${target.floor===current.floor?'':target.floor+'・'}${shortNames[target.id]}へ`;compactGoal.title=progress.delivered?'手紙を届けました':`${target.floor} · ${target.title}`;const signature=JSON.stringify([progress,selectedAvatar,team?.code,team?.members?.map(m=>[m.id,m.online,m.avatarId]),networkError]);
    if(signature!==lastHud){lastHud=signature;traveler.replaceChildren(portrait(selectedAvatar),make('span','',avatarById(selectedAvatar).name+' · 姿を選ぶ'));objective.textContent=progress.delivered?'手紙を届けました':progress.stage===3?'宛先の戻った手紙を届けよう':`${target.floor} · ${target.title}へ`;
      progressRow.replaceChildren();for(let i=0;i<3;i++){const stamp=make('span','tg-stamp');stamp.classList.toggle('is-found',progress.stage>i);stamp.append(ticketIcon(SPOTS[i].id),make('small','',progress.stage>i?'✓':String(i+1)));progressRow.append(stamp);}status.textContent=team?(networkError?'再接続を待っています':`合言葉 ${team.code} · ${team.members?.filter(m=>m.online).length??1}/4人`):'1人で探索中';}
    const membersSignature=JSON.stringify(team?.members?.map(m=>[m.id,m.name,m.online,m.avatarId]));if(lastMembers!==membersSignature){lastMembers=membersSignature;memberList.replaceChildren();for(const member of team?.members??[]){const m=make('span','',member.name+(member.id===team.selfId?'（あなた）':''));m.style.opacity=member.online?'1':'.5';m.prepend(portrait(memberAvatar(member).id));memberList.append(m);}}
    const active=api.isActive()&&!dialog;lens.hidden=!lensOn||!active;document.body.dataset.ticketLens=String(!lens.hidden);ticket.lastChild?.nodeType===3?ticket.lastChild.textContent=lensOn?'切符をしまう':'切符をかざす':null;ticket.setAttribute('aria-pressed',String(lensOn));
    const near=nearSpot(api.getPlayer(),target),visible=near&&isLooking(target);read.hidden=!lensOn||!visible||!active;read.textContent=progress.delivered?'届いた手紙を読む':progress.stage===3?'宛先の戻った手紙を開く':'昔の案内を読む';
    prompt.hidden=!active||!near||progress.delivered||lensOn;prompt.textContent=lensOn?(visible?'昔の言葉が浮かんでいます。案内を読んでみましょう。':'目印の方へ、ゆっくり向いてみましょう。'):'切符が淡く光っています。ここで使えそう。';
    const ghostSignature=`${progress.stage}:${near}:${visible}:${progress.delivered}`;if(lastGhost!==ghostSignature){lastGhost=ghostSignature;ghost.replaceChildren();if(visible){ghost.append(ticketIcon(progress.stage===0?'pillars':progress.stage===1?'postbox':progress.stage===2?'ticket':'letter'),make('p','',CLUES[progress.stage].text));}else ghost.append(make('small','','切符をかざして、目印を探そう。'));ghost.classList.toggle('is-visible',visible);lensFoot.textContent=visible?(progress.delivered?'「届いた手紙を読む」で、手紙を読み返せます。':progress.stage===3?'下のボタンで手紙を開きましょう。':'「昔の案内を読む」で、手帳に残しましょう。'):near?'切符の外をドラッグして、目印の方を見てみよう。':`${target.floor} · ${target.title}の近くで、見まわしてみよう。`;}
  }
  function updateSelfAvatar(dt){
    if(!playing){if(selfActor)selfActor.object.visible=false;return;}
    if(selfAvatarId!==selectedAvatar){
      selfAvatarId=selectedAvatar;selfActor?.dispose();selfActor=null;const request=++selfRequest;
      void createAvatarActor(selectedAvatar).then(actor=>{
        if(disposed||request!==selfRequest){actor.dispose();return;}
        selfActor=actor;const p=api.getPlayer();actor.object.position.set(p.x,p.y-1.65,p.z);actor.object.rotation.y=(p.yaw??0)+Math.PI;actor.object.visible=playing;actor.object.userData.localPlayer=true;api.station.scene.add(actor.object);
      }).catch(()=>{if(!disposed&&request===selfRequest){api.onNotice('人物の表示を準備できませんでした。少し待ってから、姿を選び直してください。');}});
    }
    if(!selfActor)return;
    const p=api.getPlayer();selfActor.object.visible=true;selfActor.object.position.set(p.x,p.y-1.65,p.z);selfActor.object.rotation.y=(p.yaw??0)+Math.PI;
    selfActor.setOpacity?.(api.getCameraOpacity?.()??1);
    selfActor.setMotion(api.reducedMotion||!p.walking?'Idle':p.movementMode==='run'?'Run':'Walk');selfActor.update(api.reducedMotion?0:dt);
  }
  function removePeer(item){item.disposed=true;item.actor?.dispose();item.group.removeFromParent();item.label.remove();}
  function clearPeers(){for(const item of peers.values())removePeer(item);peers.clear();}
  function updatePeers(dt){
    const wanted=new Set(),now=performance.now();
    for(const member of team?.members??[]){
      if(member.id===team.selfId||!member.online||!member.position)continue;
      wanted.add(member.id);const avatar=memberAvatar(member),p=member.position,floor=floorById(p.floor);if(!floor)continue;
      let item=peers.get(member.id);
      if(item&&item.avatarId!==avatar.id){removePeer(item);peers.delete(member.id);item=null;}
      if(!item){
        const group=new THREE.Group();group.name='協力プレイヤー / '+member.name;api.station.scene.add(group);
        const label=make('div','tg-peer',member.name);root.append(label);
        item={group,label,avatarId:avatar.id,initialized:false,disposed:false,actor:null,lastPacket:now,speed:0,target:{...p}};peers.set(member.id,item);
        const current=item;void createAvatarActor(avatar.id).then(actor=>{if(current.disposed||peers.get(member.id)!==current){actor.dispose();return;}current.actor=actor;current.group.add(actor.object);}).catch(()=>{if(!current.disposed)api.onNotice('仲間の姿を読み込めませんでした。画面を開き直すと再読み込みできます。');});
      }
      const destination=new THREE.Vector3(p.x,floor.elevation,p.z);
      if(!item.initialized||item.target.floor!==p.floor||item.group.position.distanceTo(destination)>20){item.group.position.copy(destination);item.group.rotation.y=(p.yaw??0)+Math.PI;item.initialized=true;item.speed=0;}
      else if(item.target.x!==p.x||item.target.z!==p.z){item.speed=Math.hypot(p.x-item.target.x,p.z-item.target.z)/Math.max(.25,(now-item.lastPacket)/1000);item.lastPacket=now;}
      item.target={...p};const remaining=item.group.position.distanceTo(destination);item.group.position.lerp(destination,Math.min(1,dt*4));
      const desired=(p.yaw??0)+Math.PI;item.group.rotation.y+=Math.atan2(Math.sin(desired-item.group.rotation.y),Math.cos(desired-item.group.rotation.y))*Math.min(1,dt*8);
      item.actor?.setMotion(remaining<.04?'Idle':item.speed>4.2?'Run':'Walk');item.actor?.update(dt);
      const player=api.getPlayer();item.group.visible=playing&&p.floor===player.floor;const projected=api.project({x:item.group.position.x,y:floor.elevation+2.15,z:item.group.position.z});
      item.label.textContent=member.name;item.label.hidden=!item.group.visible||!projected.visible||dialog!==null;item.label.style.left=projected.x+'px';item.label.style.top=projected.y+'px';
    }
    for(const [id,item]of peers)if(!wanted.has(id)){removePeer(item);peers.delete(id);}
  }
  on(scrim,'click',close);on(document,'keydown',event=>{if(!dialog)return;if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close();return;}if(event.key==='Tab'){const elements=[...panel.querySelectorAll('button:not([disabled]),input:not([disabled]),a[href]')].filter(e=>!e.closest('[hidden]'));const first=elements[0],last=elements.at(-1);if(!panel.contains(document.activeElement)){event.preventDefault();(first??panel).focus();return;}if(event.shiftKey&&(document.activeElement===first||document.activeElement===panel)){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}},true);
  function update(dt){if(disposed)return;avatarPreview?.update(dt);updateSelfAvatar(dt);updatePeers(dt);lastTick+=dt;if(lastTick>.12){lastTick=0;refresh();}if(team&&playing&&!document.hidden&&performance.now()-lastPoll>1500&&!syncing){lastPoll=performance.now();void sync().catch(()=>{});}}
  function dispose(){close();disposed=true;selfRequest++;selfActor?.dispose();selfActor=null;listeners.forEach(fn=>fn());clearPeers();root.remove();launch.remove();resume.remove();delete document.body.dataset.ticketLens;delete document.body.dataset.ticketPlaying;if(embedded)delete document.body.dataset.ticketEmbedded;}
  refresh();if(new URLSearchParams(location.search).has('room'))open('team');
  function suspend(){
    if(busy){api.onNotice('第1作の通信中です。少し待ってから物語を切り替えてください。');return false;}
    if(team){api.onNotice('ほかの物語へ進むには「仲間」から部屋を退出してください。第1作の部屋はそのまま続けられます。');return false;}
    close();playing=false;lensOn=false;if(selfActor)selfActor.object.visible=false;delete document.body.dataset.ticketPlaying;refresh();return true;
  }
  return {update,close,dispose,suspend,openIntro:()=>open('intro'),get playing(){return playing;},get shoulderView(){return playing;}};
}
