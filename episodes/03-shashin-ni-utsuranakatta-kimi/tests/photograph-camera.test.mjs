import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {createPhotographCamera} from '../dist/game/photograph-camera.js';

test('a lost photo context returns the text-fallback signal without rendering or caching blank images',()=>{
  const previousDocument=globalThis.document,listeners=new Map();let renders=0,prevented=false,created=0;
  globalThis.document={createElement:tag=>{
    assert.equal(tag,'canvas');
    return {width:0,height:0,getContext:()=>({filter:'none',globalAlpha:1,drawImage(){},fillRect(){},createRadialGradient:()=>({addColorStop(){}})}),toDataURL:()=>`data:image/jpeg;test,${renders}`};
  }};
  const renderer={domElement:{addEventListener:(type,listener)=>listeners.set(type,listener)},setPixelRatio(){},setSize(){},render(){renders++;},dispose(){},forceContextLoss(){}};
  const camera=createPhotographCamera({station:{landmarks:[{id:'driving-wheels',group:new THREE.Group()}]},createRenderer:()=>{created++;return renderer;}});
  try{
    assert.match(camera.snapshot('driving-wheels','left'),/^data:image\/jpeg/);assert.equal(renders,1);
    listeners.get('webglcontextlost')({preventDefault(){prevented=true;}});
    assert.equal(prevented,true);
    for(const view of ['left','center','right'])assert.equal(camera.snapshot('driving-wheels',view),null);
    assert.equal(renders,1,'A lost renderer is never asked to render a new or previously cached view');
    assert.equal(created,1);
  }finally{camera.dispose();if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;}
});

test('initial photo-renderer failure stays on the fallback without repeated renderer allocation',()=>{
  let created=0;
  const camera=createPhotographCamera({station:{landmarks:[{id:'driving-wheels',group:new THREE.Group()}]},createRenderer:()=>{created++;throw new Error('unavailable');}});
  try{
    assert.equal(camera.snapshot('driving-wheels','left'),null);assert.equal(camera.snapshot('driving-wheels','right'),null);assert.equal(created,1);
  }finally{camera.dispose();}
});
