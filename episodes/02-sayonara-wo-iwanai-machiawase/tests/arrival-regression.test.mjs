import test from 'node:test';
import assert from 'node:assert/strict';
import {FLOOR_AREAS,FLOOR_ZONES,insideFloor} from '../dist/floor-layout.js';
import {TRAIN_SERVICES} from '../dist/train-data.js';
import {SPOTS,nearSpot,initialProgress,applyAction} from '../dist/game/farewell-state.js';

const platform=SPOTS.find(spot=>spot.id==='platform-tokaido-1415');
const zone=FLOOR_ZONES.find(item=>item.id===platform.zoneId);
const area=FLOOR_AREAS[zone.floor].find(item=>zone.x>=item.minX&&zone.x<=item.maxX&&zone.z>=item.minZ&&zone.z<=item.maxZ);
const photo=TRAIN_SERVICES.find(item=>item.zoneId===platform.zoneId);
const at=(x,z,floor=platform.floor)=>({x,z,floor});

test('the farewell platform arrival area exactly matches its model island and accepts both entry methods',()=>{
  assert.deepEqual(platform.region,area);
  for(const position of [zone,at(photo.viewX,photo.viewZ),at(area.minX,area.minZ),at(area.maxX,area.maxZ)]){
    assert.equal(nearSpot(position,platform),true);
    assert.equal(applyAction({...initialProgress(),stage:3},{type:'answer',answer:'SQUARE ZERO'},position).correct,true);
  }
});

test('the nearest edge of adjacent platforms never unlocks the 14 and 15 platform message',()=>{
  for(const other of FLOOR_AREAS[platform.floor]){
    if(other===area)continue;
    for(const x of [other.minX,(other.minX+other.maxX)/2,other.maxX]){
      for(const z of [-30,0,30]){
        const position=at(x,z);
        assert.equal(insideFloor(x,z,position.floor),true);
        assert.equal(nearSpot(position,platform),false,`Wrong platform at ${x},${z}`);
        const progress={...initialProgress(),stage:3};
        const result=applyAction(progress,{type:'answer',answer:'SQUARE ZERO'},position);
        assert.equal(result.correct,false);assert.deepEqual(result.progress,progress);
      }
    }
  }
});

test('platform arrival excludes the gap, another floor and points just outside every platform boundary',()=>{
  for(const position of [at(64,0),at(64,-30),at(48,0),at(zone.x,zone.z,'M2F'),at(zone.x,zone.z,'B4F'),at(area.minX-.001,0),at(area.maxX+.001,0),at(zone.x,area.minZ-.001),at(zone.x,area.maxZ+.001)])assert.equal(nearSpot(position,platform),false);
  for(const radius of [-1,NaN,Infinity])assert.equal(nearSpot(zone,platform,radius),false);
});
