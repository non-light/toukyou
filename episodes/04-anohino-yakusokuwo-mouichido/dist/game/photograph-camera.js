import * as THREE from '../vendor/three.module.js';

// These photographs borrow the station's authored exhibits. The photograph
// scene, people, floor and camera belong to this episode alone.
const SIZES={
  'driving-wheels':{distance:9.4,height:2.65,target:1.4,angle:.76},
  'station-postbox':{distance:4.6,height:1.85,target:1.1,angle:.76},
  'square-zero':{distance:24.8,height:8.4,target:2.8,angle:.76},
  'silver-bell':{distance:11.3,height:3.3,target:1.55,angle:.65},
  'keiyo-platform-12':{distance:23,height:5.5,target:1.8,angle:.76,focusZ:28.8},
  'sobu-platform-12':{distance:23,height:5.5,target:1.8,angle:.76,focusZ:28.8},
  'platform-tokaido-1415':{distance:25,height:5.8,target:1.8,angle:.76,focusZ:28.8},
};

export function createPhotographCamera({station,createRenderer=options=>new THREE.WebGLRenderer(options)}={}){
  let renderer=null,failed=false,disposed=false;
  const snapshots=new Map(),models=new Map(),geometries=new Set(),materials=new Set();
  const ownGeometry=value=>(geometries.add(value),value);
  const ownMaterial=value=>(materials.add(value),value);
  const cube=ownGeometry(new THREE.BoxGeometry(1,1,1));
  const sphere=ownGeometry(new THREE.SphereGeometry(1,18,12));
  const cylinder=ownGeometry(new THREE.CylinderGeometry(1,1,1,14));
  const scene=new THREE.Scene();scene.background=new THREE.Color('#d5d9d3');
  scene.fog=new THREE.Fog('#d5d9d3',28,65);
  scene.add(new THREE.HemisphereLight('#fff8e9','#738185',2.8));
  const key=new THREE.DirectionalLight('#fff2d6',3.1);key.position.set(-6,11,9);scene.add(key);
  const fill=new THREE.DirectionalLight('#c5dce9',1.4);fill.position.set(8,6,-5);scene.add(fill);
  const floorMaterial=ownMaterial(new THREE.MeshStandardMaterial({color:'#d2cdc0',roughness:.92}));
  const floor=new THREE.Mesh(cube,floorMaterial);floor.scale.set(160,.1,160);floor.position.y=-.08;scene.add(floor);
  const peopleLayer=new THREE.Group();scene.add(peopleLayer);
  const camera=new THREE.PerspectiveCamera(38,1.6,.05,90);
  const paints=new Map();
  function paint(color){if(!paints.has(color))paints.set(color,ownMaterial(new THREE.MeshStandardMaterial({color,roughness:.82})));return paints.get(color);}
  function piece(group,geometry,material,x,y,z,sx,sy,sz){const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);group.add(mesh);return mesh;}
  function person({x,z,kind='ritsu',angle=0}={}){
    const group=new THREE.Group();group.position.set(x,0,z);group.rotation.y=angle;
    const child=kind==='little'||kind==='brother',older=kind==='woman';
    const scale=child?(kind==='little'?.68:.8):older?.91:1;
    const jacket=paint(older?'#8b847b':kind==='brother'?'#7b887d':kind==='little'?'#b19570':kind==='tsumugi'?'#657f94':kind==='haru'?'#728567':'#586c70');
    const trousers=paint(older?'#6e6c65':'#414d53'),skin=paint('#d4b39a'),hair=paint(older?'#a8a59a':'#3d3937');
    const shoes=paint('#3b3936');
    piece(group,cube,jacket,0,1.02,0,.49,.59,.29);
    piece(group,sphere,skin,0,1.59,.018,.215,.25,.204);
    piece(group,sphere,hair,0,1.71,-.035,.219,.16,.205);
    if(older){
      piece(group,cylinder,trousers,0,.48,0,.29,.64,.26);
      piece(group,sphere,hair,0,1.59,-.16,.17,.19,.14);
      piece(group,cube,jacket,0,.87,0,.52,.61,.32);
    }else{
      for(const side of [-1,1])piece(group,cylinder,trousers,side*.13,.4,0,.092,.67,.1);
    }
    for(const side of [-1,1]){
      piece(group,cube,shoes,side*.13,.09,.045,.19,.14,.32);
      const arm=piece(group,cylinder,jacket,side*.31,1.03,0,.077,.52,.085);arm.rotation.z=-side*.09;
      piece(group,sphere,skin,side*.33,.75,.015,.077,.09,.075);
    }
    // Faces stay understated at photograph scale.
    const eye=paint('#49413b');for(const side of [-1,1])piece(group,sphere,eye,side*.072,1.61,.202,.018,.018,.012);
    if(older){
      piece(group,cube,paint('#786d60'),.35,.49,.07,.24,.24,.13);
      const handle=piece(group,cylinder,paint('#786d60'),.35,.65,.07,.035,.17,.035);handle.rotation.z=.1;
    }
    group.scale.setScalar(scale);peopleLayer.add(group);return group;
  }
  function getModel(id){
    if(models.has(id))return models.get(id);
    const source=station?.landmarks?.find(item=>item.id===id)?.group??station?.trains?.find(item=>item.zoneId===id)?.group;
    if(!source)return null;
    const model=source.clone(true);model.position.set(0,0,0);model.rotation.set(0,0,0);model.scale.set(1,1,1);model.visible=true;
    model.traverse(object=>{
      // The text on a plaque would give away the place before its shapes do.
      // Visibility is changed on cloned objects, never on borrowed resources.
      const texture=object.material?.map,image=texture?.image;
      if(object.geometry?.type==='PlaneGeometry'&&image?.width===1024&&image?.height===256)object.visible=false;
    });
    models.set(id,model);return model;
  }
  function startRenderer(){
    if(failed||disposed)return false;
    if(renderer)return true;
    try{
      renderer=createRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'low-power'});
      renderer.setPixelRatio(1);renderer.setSize(960,600,false);
      renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
      renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();failed=true;snapshots.clear();});
      return true;
    }catch{failed=true;renderer?.dispose();renderer=null;return false;}
  }
  function snapshot(spotId,view='center',{old=false,people=false,backgroundWoman=false}={}){
    if(disposed||!Object.hasOwn(SIZES,spotId)||!['left','center','right'].includes(view))return null;
    const cacheKey=JSON.stringify([spotId,view,Boolean(old),people,Boolean(backgroundWoman)]);
    if(snapshots.has(cacheKey))return snapshots.get(cacheKey);
    const model=getModel(spotId);if(!model||!startRenderer())return null;
    for(const item of models.values())item.removeFromParent();scene.add(model);peopleLayer.clear();
    const size=SIZES[spotId],angle=view==='center'?0:view==='left'?-size.angle:size.angle;
    camera.far=size.focusZ?200:90;camera.updateProjectionMatrix();
    scene.fog.near=size.focusZ?65:28;scene.fog.far=size.focusZ?150:65;
    camera.position.set(Math.sin(angle)*size.distance,size.height,(size.focusZ??0)+Math.cos(angle)*size.distance);
    camera.lookAt(0,size.target,size.focusZ??0);camera.updateMatrixWorld(true);
    const facing=(x,z)=>Math.atan2(camera.position.x-x,camera.position.z-z);
    if(spotId==='silver-bell'){
      if(people==='friends'){person({x:-1.08,z:2.25,kind:'tsumugi',angle:facing(-1.08,2.25)});person({x:.05,z:2.25,kind:'haru',angle:facing(.05,2.25)});}
      else if(people&&old){person({x:-1.08,z:2.25,kind:'brother',angle:facing(-1.08,2.25)});person({x:.05,z:2.25,kind:'little',angle:facing(.05,2.25)});}
      else if(people)person({x:-1.3,z:2.3,angle:facing(-1.3,2.3)});
      if(backgroundWoman)person({x:3.45,z:-1.1,kind:'woman',angle:.9});
    }
    try{
      scene.updateMatrixWorld(true);renderer.render(scene,camera);
      const canvas=document.createElement('canvas');canvas.width=960;canvas.height=600;
      const context=canvas.getContext('2d');if(!context)return null;
      context.filter=old?'sepia(.48) saturate(.55) contrast(.9) brightness(1.06)':'none';
      context.drawImage(renderer.domElement,0,0);context.filter='none';
      if(old){context.fillStyle='#e1c690';context.globalAlpha=.08;context.fillRect(0,0,960,600);context.globalAlpha=1;}
      const vignette=context.createRadialGradient(480,285,170,480,300,580);vignette.addColorStop(0,'#2b261b00');vignette.addColorStop(1,old?'#4a352b24':'#25353113');context.fillStyle=vignette;context.fillRect(0,0,960,600);
      const url=canvas.toDataURL('image/jpeg',.88);snapshots.set(cacheKey,url);return url;
    }catch{failed=true;return null;}
  }
  function dispose(){
    if(disposed)return;disposed=true;snapshots.clear();models.clear();peopleLayer.clear();scene.clear();
    renderer?.dispose();renderer?.forceContextLoss();renderer=null;
    // Only this episode's geometry and paint are owned here. Landmark clone
    // geometries, textures and materials continue to belong to the station.
    geometries.forEach(value=>value.dispose());materials.forEach(value=>value.dispose());
  }
  return {snapshot,dispose};
}
