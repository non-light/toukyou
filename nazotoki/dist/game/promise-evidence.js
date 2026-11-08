// Paper clues belong to the story UI. They do not read or modify the station.
const STRIPS=Object.freeze([
  Object.freeze({id:'grandma',name:'祖母',letters:Object.freeze(['ま','あ','う'])}),
  Object.freeze({id:'friend',name:'澄子',letters:Object.freeze(['た','お'])}),
]);
const byId=new Map(STRIPS.map(strip=>[strip.id,strip]));
const make=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
let sketchId=0;

// The sequence stores only the source of each letter. Its position in that
// source always follows from earlier picks, so letters cannot be reused.
export function weaveLetters(sequence=[],action={}){
  const result=[],counts={grandma:0,friend:0};
  if(Array.isArray(sequence))for(const source of sequence){
    const strip=byId.get(source);
    if(!strip||counts[source]>=strip.letters.length)break;
    result.push(source);counts[source]++;
  }
  if(!action||typeof action!=='object'||Array.isArray(action))return result;
  if(action.type==='reset')return [];
  if(action.type==='undo')return result.slice(0,-1);
  if(action.type==='take'){
    const strip=byId.get(action.source);
    if(strip&&counts[strip.id]<strip.letters.length&&
      (!Object.hasOwn(action,'index')||action.index===counts[strip.id]))result.push(strip.id);
  }
  return result;
}

function placements(sequence){
  const counts={grandma:0,friend:0};
  return sequence.map(source=>{const index=counts[source]++;return {source,index,letter:byId.get(source).letters[index]};});
}

export function createWheelSketch(){
  const figure=make('figure','pm-sketch'),ns='http://www.w3.org/2000/svg',id='promise-wheel-sketch-'+(++sketchId);
  const svg=(tag,attrs={},text)=>{const node=document.createElementNS(ns,tag);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));if(text!==undefined)node.textContent=text;return node;};
  const drawing=svg('svg',{viewBox:'0 0 360 180',role:'img','aria-labelledby':id+'-title '+id+'-description',focusable:'false'});
  drawing.append(svg('title',{id:id+'-title'},'手帳に描かれた、三つの輪'),svg('desc',{id:id+'-description'},'横に並んだ三つの大きな車輪。それぞれの丸の内側に放射状の線があり、一本の棒でつながっている。'));
  drawing.append(svg('path',{d:'M 19 148 Q 181 145 341 148',class:'pm-sketch-ground'}));
  for(const [index,cx] of [66,180,294].entries()){
    const wheel=svg('g',{transform:`rotate(${index===1?-2:1} ${cx} 87)`});
    wheel.append(svg('circle',{cx,cy:87,r:43}),svg('circle',{cx:cx+.8,cy:87.7,r:37.5,class:'pm-sketch-rim'}));
    for(let spoke=0;spoke<8;spoke++){
      const angle=spoke*Math.PI/4,dx=Math.cos(angle)*35,dy=Math.sin(angle)*35;
      wheel.append(svg('path',{d:`M ${cx+Math.cos(angle)*8} ${87+Math.sin(angle)*8} Q ${cx+dx*.54+1} ${87+dy*.54-1} ${cx+dx} ${87+dy}`,class:'pm-sketch-spoke'}));
    }
    wheel.append(svg('circle',{cx,cy:87,r:7}));drawing.append(wheel);
  }
  drawing.append(svg('path',{d:'M 61 100 Q 121 98 180 100 Q 240 102 299 100 L 299 108 Q 240 109 180 107 Q 120 105 61 108 Z',class:'pm-sketch-rod'}));
  for(const cx of [66,180,294])drawing.append(svg('circle',{cx,cy:104,r:3,class:'pm-sketch-pin'}));
  figure.append(drawing,make('figcaption','','手帳に残っていた、小さな絵'));return figure;
}

export function createLetterWeave({onAnswer=()=>{},initialSequence=[],onChange=()=>{}}={}){
  let sequence=weaveLetters(initialSequence);
  const root=make('section','pm-weave');root.setAttribute('aria-label','二人の文字をつなぐ');
  root.append(make('p','pm-weave-instructions','どちらの人の文字を置くか選んでください。それぞれの列は、左から一文字ずつ取ります。'));
  const strips=make('div','pm-weave-strips'),rows=new Map();
  for(const strip of STRIPS){
    const row=make('div','pm-weave-strip'),heading=make('div','pm-weave-source');
    const name=make('strong','',strip.name),position=make('span','pm-weave-position');heading.append(name,position);
    const letters=make('div','pm-weave-letters');letters.setAttribute('aria-label',strip.name+'の文字');
    const cells=strip.letters.map((letter,index)=>{const cell=make('span','pm-weave-letter',letter);cell.dataset.letterPosition=String(index+1);letters.append(cell);return cell;});
    const take=make('button','pm-weave-take');take.type='button';take.addEventListener('click',()=>change({type:'take',source:strip.id,index:placements(sequence).filter(item=>item.source===strip.id).length},strip.id));
    row.append(heading,letters,take);strips.append(row);rows.set(strip.id,{position,cells,take});
  }
  root.append(strips);
  const result=make('div','pm-weave-result');result.append(make('p','pm-weave-result-label','つないだ五文字'));
  const output=make('ol','pm-weave-slots');output.setAttribute('aria-label','置いた文字の順番');
  const slots=Array.from({length:5},()=>{const slot=make('li','pm-weave-slot');output.append(slot);return slot;});result.append(output);
  const status=make('p','pm-weave-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.setAttribute('aria-atomic','true');result.append(status);root.append(result);
  const actions=make('div','pm-weave-actions');
  const undo=make('button','pm-weave-undo','一文字戻す');undo.type='button';undo.addEventListener('click',()=>change({type:'undo'},'undo'));
  const reset=make('button','pm-weave-reset','最初から並べる');reset.type='button';reset.addEventListener('click',()=>change({type:'reset'},'reset'));
  const answer=make('button','pm-weave-answer','この言葉で答える');answer.type='button';answer.addEventListener('click',()=>{if(sequence.length===5)onAnswer(placements(sequence).map(item=>item.letter).join(''));});
  actions.append(undo,reset,answer);root.append(actions);

  function change(action,source){
    const next=weaveLetters(sequence,action);
    if(next.length===sequence.length&&next.every((id,index)=>id===sequence[index]))return;
    sequence=next;refresh();onChange([...sequence]);
    // If the focused button has become unavailable, move to another usable
    // control without selecting or placing a letter for the player.
    const control=rows.get(source)?.take??(source==='undo'?undo:reset);
    if(control.disabled)([...rows.values()].map(row=>row.take).find(control=>!control.disabled)??answer).focus({preventScroll:true});
  }
  function refresh(){
    const placed=placements(sequence);
    for(const strip of STRIPS){
      const row=rows.get(strip.id),used=placed.filter(item=>item.source===strip.id).length,next=strip.letters[used];
      row.position.textContent=`${used} / ${strip.letters.length}文字を使用`;
      for(const [index,cell] of row.cells.entries()){
        cell.classList.toggle('is-used',index<used);cell.classList.toggle('is-next',index===used);
        cell.setAttribute('aria-label',`${index+1}文字目 ${strip.letters[index]}${index<used?' 使用済み':index===used?' 次の文字':''}`);
      }
      row.take.disabled=used===strip.letters.length;
      row.take.textContent=next?`${strip.name}の「${next}」を置く`:`${strip.name}の文字は、すべて置きました`;
    }
    for(const [index,slot] of slots.entries()){
      const item=placed[index];slot.textContent=item?.letter??'·';slot.classList.toggle('is-filled',Boolean(item));slot.setAttribute('aria-label',`${index+1}文字目 ${item?item.letter+' '+byId.get(item.source).name+'の文字':'まだ空いています'}`);
    }
    status.textContent=placed.length===5?`五文字が並びました。「${placed.map(item=>item.letter).join('')}」`:`${placed.length} / 5文字。${placed.length?placed.map(item=>item.letter).join(''):'まだ文字は置いていません。'}`;
    undo.disabled=reset.disabled=placed.length===0;answer.disabled=placed.length!==5;
  }
  refresh();return root;
}
