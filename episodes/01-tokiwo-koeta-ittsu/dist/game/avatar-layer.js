import * as THREE from '../vendor/three.module.js';
import {GLTFLoader} from '../vendor/avatar/GLTFLoader.js';
import {avatarById} from './avatar-catalog.js?v=avatar1';

// Only the templates own geometry and materials. Every player has a separate
// node hierarchy and AnimationMixer, so one player's walk cannot move another.
const templates=new Map();

export function parseAvatarBuffer(buffer){
  return new GLTFLoader().parseAsync(buffer,'');
}

export function loadAvatarTemplate(id){
  const avatar=avatarById(id);
  if(!templates.has(avatar.id)){
    const url=new URL('./avatars/'+avatar.file,import.meta.url).href;
    const promise=new GLTFLoader().loadAsync(url).catch(error=>{
      if(templates.get(avatar.id)===promise)templates.delete(avatar.id);
      throw error;
    });
    templates.set(avatar.id,promise);
  }
  return templates.get(avatar.id);
}

export function createAvatarFromTemplate(template,id){
  if(!template?.scene?.isObject3D)throw new Error('人物の3Dデータを読み込めませんでした。');
  const avatar=avatarById(id),object=new THREE.Group();
  object.name='旅人 / '+avatar.name;
  object.userData={gameAvatar:true,avatarId:avatar.id};
  const model=template.scene.clone(true);
  model.traverse(node=>{if(node.isMesh){node.castShadow=true;node.receiveShadow=true;}});
  object.add(model);
  const mixer=new THREE.AnimationMixer(model),clips=new Map((template.animations??[]).map(clip=>[clip.name,clip]));
  let current=null,currentName=null,disposed=false,opacity=1;
  const materialCopies=new Map(),ownedMaterials=new Set();
  function setOpacity(value){
    if(disposed)return;
    const factor=typeof value==='number'&&!Number.isNaN(value)?THREE.MathUtils.clamp(value,0,1):1;
    opacity=factor;
    // Keep ordinary actors on their shared materials. Only the camera-near
    // actor receives private copies, and each shared source is cloned once.
    if(factor<1&&materialCopies.size===0){
      const copyMaterial=source=>{
        if(!materialCopies.has(source)){
          const copy=source.clone();
          materialCopies.set(source,{copy,opacity:source.opacity,transparent:source.transparent,depthWrite:source.depthWrite});
          ownedMaterials.add(copy);
        }
        return materialCopies.get(source).copy;
      };
      model.traverse(node=>{
        if(!node.isMesh)return;
        node.material=Array.isArray(node.material)?node.material.map(copyMaterial):copyMaterial(node.material);
      });
    }
    for(const original of materialCopies.values()){
      const material=original.copy,transparent=original.transparent||factor<1;
      if(material.transparent!==transparent){material.transparent=transparent;material.needsUpdate=true;}
      material.opacity=original.opacity*factor;
      material.depthWrite=factor<1?false:original.depthWrite;
    }
  }
  function setMotion(name,fade=.18){
    if(disposed)return;
    const requested=typeof name==='string'?name.toLowerCase():'idle';
    const key=requested==='run'?'Run':requested==='walk'?'Walk':'Idle';
    const clip=clips.get(key)??clips.get('Idle');
    if(!clip||clip.name===currentName)return;
    const next=mixer.clipAction(clip),duration=Number.isFinite(fade)?Math.max(0,fade):.18;
    next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
    if(current&&duration>0){current.fadeOut(duration);next.fadeIn(duration);}
    else current?.stop();
    current=next;currentName=clip.name;
  }
  setMotion('Idle',0);
  return {
    object,
    get motion(){return currentName;},
    get opacity(){return opacity;},
    setMotion,
    setOpacity,
    update(dt=0){if(!disposed&&Number.isFinite(dt)&&dt>=0)mixer.update(Math.min(dt,.1));},
    dispose(){
      if(disposed)return;
      disposed=true;mixer.stopAllAction();mixer.uncacheRoot(model);object.removeFromParent();
      ownedMaterials.forEach(material=>material.dispose());ownedMaterials.clear();materialCopies.clear();
      // Geometry/materials are shared by the cached template and other actors.
    },
  };
}

export async function createAvatarActor(id){
  return createAvatarFromTemplate(await loadAvatarTemplate(id),id);
}

// A separate preview canvas never touches the station scene or its colliders.
// The episode's frame loop calls update; there is no additional animation loop.
export function createAvatarPreview(container,id,{reducedMotion=false}={}){
  const doc=container.ownerDocument??document;
  const status=doc.createElement('p');status.className='avatar-preview-status';
  status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  status.textContent='人物を読み込んでいます…';container.append(status);
  let renderer=null,actor=null,disposed=false,generation=0,resizeObserver=null,resizeListener=null;
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1.6,1.6,1.1,-1.1,.1,30);
  camera.position.set(2.5,1.45,5);camera.lookAt(0,.94,0);
  const sky=new THREE.HemisphereLight('#fff8e7','#6a7972',2.6),key=new THREE.DirectionalLight('#fff1d1',2.5);
  key.position.set(2.5,4,4);scene.add(sky,key);
  const ground=new THREE.Mesh(new THREE.CircleGeometry(.43,32),new THREE.MeshBasicMaterial({color:'#546653',transparent:true,opacity:.14,depthWrite:false}));
  ground.rotation.x=-Math.PI/2;ground.position.y=.004;scene.add(ground);
  function resize(){
    if(!renderer||disposed)return;
    const rect=container.getBoundingClientRect(),width=Math.max(1,Math.round(rect.width||320)),height=Math.max(1,Math.round(rect.height||230));
    const halfHeight=1.1;
    camera.left=-halfHeight*width/height;camera.right=halfHeight*width/height;
    camera.top=halfHeight;camera.bottom=-halfHeight;camera.updateProjectionMatrix();
    renderer.setSize(width,height,false);renderer.render(scene,camera);
  }
  try{
    renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
    renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
    renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,1.5));renderer.setClearColor(0x000000,0);
    const canvas=renderer.domElement;canvas.className='avatar-preview-canvas';canvas.setAttribute('role','img');canvas.setAttribute('aria-label',avatarById(id).name+'の3Dプレビュー');
    canvas.style.display='block';canvas.style.width='100%';canvas.style.height='100%';container.prepend(canvas);
    if(typeof ResizeObserver!=='undefined'){resizeObserver=new ResizeObserver(resize);resizeObserver.observe(container);}
    else if(typeof window!=='undefined'){resizeListener=resize;window.addEventListener('resize',resizeListener);}
    resize();
  }catch(error){
    renderer?.dispose();renderer?.domElement.remove();renderer=null;
    status.textContent='人物を選んで、そのまま遊べます。3Dプレビューはこの画面で表示できませんでした。';
  }
  async function setAvatar(nextId){
    if(disposed)return;
    const avatar=avatarById(nextId),request=++generation;
    if(renderer)renderer.domElement.setAttribute('aria-label',avatar.name+'の3Dプレビュー');
    if(!renderer)return;
    status.hidden=false;status.textContent=avatar.name+'を読み込んでいます…';
    try{
      const next=await createAvatarActor(avatar.id);
      if(disposed||request!==generation){next.dispose();return;}
      actor?.dispose();actor=next;scene.add(actor.object);actor.update(0);status.hidden=true;renderer.render(scene,camera);
    }catch(error){
      if(disposed||request!==generation)return;
      status.hidden=false;status.textContent='人物の表示を読み込めませんでした。色を選び直してみてください。';
    }
  }
  void setAvatar(id);
  return {
    setAvatar,
    update(dt=0){if(disposed||!renderer)return;if(!reducedMotion)actor?.update(dt);renderer.render(scene,camera);},
    dispose(){
      if(disposed)return;
      disposed=true;generation++;resizeObserver?.disconnect();
      if(resizeListener&&typeof window!=='undefined')window.removeEventListener('resize',resizeListener);
      actor?.dispose();ground.geometry.dispose();ground.material.dispose();
      renderer?.dispose();renderer?.forceContextLoss();renderer?.domElement.remove();status.remove();renderer=null;
    },
  };
}
