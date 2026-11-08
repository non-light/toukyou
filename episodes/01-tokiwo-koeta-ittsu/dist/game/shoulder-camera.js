import * as THREE from '../vendor/three.module.js';

const BACK=2.7,SHOULDER=.5,HEIGHT=.25,AIM_DISTANCE=8;
const WALL_MARGIN=.18,RELEASE_RATE=8,TELEPORT_DISTANCE=8;
const FULL_DISTANCE=Math.hypot(BACK,SHOULDER);

// Intersect a horizontal segment with the inflated wall rectangle. This reads
// the station's collision records without changing them or creating a route.
function wallEntry(start,end,wall){
  if(!wall||![wall.minX,wall.maxX,wall.minZ,wall.maxZ].every(Number.isFinite))return null;
  const minX=wall.minX-WALL_MARGIN,maxX=wall.maxX+WALL_MARGIN;
  const minZ=wall.minZ-WALL_MARGIN,maxZ=wall.maxZ+WALL_MARGIN;
  let enter=0,exit=1;
  for(const [origin,delta,min,max]of [[start.x,end.x-start.x,minX,maxX],[start.z,end.z-start.z,minZ,maxZ]]){
    if(Math.abs(delta)<1e-9){if(origin<min||origin>max)return null;continue;}
    let near=(min-origin)/delta,far=(max-origin)/delta;
    if(near>far)[near,far]=[far,near];
    enter=Math.max(enter,near);exit=Math.min(exit,far);
    if(enter>exit)return null;
  }
  return enter>=0&&enter<=1?enter:null;
}

/** A game-only shoulder camera; the authored station remains untouched. */
export function createShoulderCamera({camera,station}){
  if(!camera?.isCamera)throw new TypeError('肩越し視点にはカメラが必要です。');
  let distance=FULL_DISTANCE,initialized=false,resetPending=true,lastFloor=null;
  let lastYaw=0,lastPitch=0;
  const lastPlayer=new THREE.Vector3(),pivot=new THREE.Vector3(),desired=new THREE.Vector3(),aim=new THREE.Vector3();
  const right=new THREE.Vector3(),forward=new THREE.Vector3();

  function reset(){resetPending=true;initialized=false;}

  function update({player,yaw=0,pitch=0,floor,dt=0,active=true}){
    if(!player||![player.x,player.y,player.z].every(Number.isFinite))return {distance,avatarOpacity:1};
    yaw=Number.isFinite(yaw)?yaw:0;
    pitch=Number.isFinite(pitch)?THREE.MathUtils.clamp(pitch,-1.2,1.48):0;
    if(!active){
      camera.position.copy(player);camera.rotation.set(pitch,yaw,0,'YXZ');
      distance=0;reset();lastFloor=null;
      return {distance,avatarOpacity:0};
    }

    const deltaTime=Number.isFinite(dt)?THREE.MathUtils.clamp(dt,0,.1):0;
    const yawChange=Math.abs(Math.atan2(Math.sin(yaw-lastYaw),Math.cos(yaw-lastYaw)));
    const discontinuity=!initialized||resetPending||floor!==lastFloor||
      lastPlayer.distanceToSquared(player)>TELEPORT_DISTANCE**2||yawChange>.85||Math.abs(pitch-lastPitch)>.7;
    pivot.copy(player);
    right.set(Math.cos(yaw),0,-Math.sin(yaw));
    desired.copy(pivot).addScaledVector(right,SHOULDER);
    desired.x+=Math.sin(yaw)*BACK;
    desired.z+=Math.cos(yaw)*BACK;

    let fraction=1;
    for(const wall of station?.collidersByFloor?.[floor]??[]){
      const hit=wallEntry(pivot,desired,wall);
      if(hit!==null)fraction=Math.min(fraction,hit);
    }
    // A small extra gap keeps roundoff from placing the camera on a wall face.
    const targetDistance=fraction<1?Math.max(0,FULL_DISTANCE*fraction-.005):FULL_DISTANCE;
    if(discontinuity||targetDistance<distance)distance=targetDistance;
    else if(targetDistance-distance>.005)distance+=(targetDistance-distance)*(1-Math.exp(-RELEASE_RATE*deltaTime));
    else distance=targetDistance;

    camera.position.copy(pivot).lerp(desired,distance/FULL_DISTANCE);
    const ground=player.y-1.65;
    camera.position.y=Math.max(ground+.3,player.y+HEIGHT);
    forward.set(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch));
    aim.copy(pivot).addScaledVector(forward,AIM_DISTANCE);
    camera.lookAt(aim);

    initialized=true;resetPending=false;lastFloor=floor;lastPlayer.copy(player);lastYaw=yaw;lastPitch=pitch;
    return {distance,avatarOpacity:THREE.MathUtils.smoothstep(distance,.45,1.1)};
  }

  return {update,reset,get distance(){return distance;}};
}
