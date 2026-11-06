import test from 'node:test';
import assert from 'node:assert/strict';
import {requestRoom,roomSessionEnded,recoveredProgress} from '../dist/game/ticket-session.js';

test('expired room and revoked membership remain distinguishable from temporary connection failures', async()=>{
  for(const [status,ended] of [[401,true],[404,true],[409,false],[503,false]]){
    await assert.rejects(requestRoom('/api/rooms/ABC234/sync',{},async()=>Response.json({error:'接続を確認してください。',code:status===409?'avatar_taken':undefined},{status})),error=>{
      assert.equal(error.status,status);
      assert.equal(roomSessionEnded(error),ended);
      if(status===409)assert.equal(error.code,'avatar_taken');
      return true;
    });
  }
  await assert.rejects(requestRoom('/api/rooms',{},async()=>{throw new TypeError('offline');}),error=>!roomSessionEnded(error));
});

test('non-JSON session failures retain HTTP status while a valid room response passes through', async()=>{
  await assert.rejects(requestRoom('/api/rooms/ABC234/sync',{},async()=>new Response('Not found',{status:404})),error=>roomSessionEnded(error));
  await assert.rejects(requestRoom('/api/rooms',{},async()=>new Response('<html>gateway</html>',{status:502})),error=>!roomSessionEnded(error));
  const value={room:{code:'ABC234',stage:2,delivered:false},members:[]};
  assert.deepEqual(await requestRoom('/api/rooms',{},async()=>Response.json(value)),value);
});

test('session recovery retains discoveries from both the shared notebook and prior solo play',()=>{
  const shared={version:1,stage:2,delivered:false},local={version:1,stage:1,delivered:false};
  assert.deepEqual(recoveredProgress(shared,local),shared);
  assert.deepEqual(recoveredProgress(local,shared),shared);
  const complete={version:1,stage:3,delivered:true};
  assert.deepEqual(recoveredProgress(shared,complete),complete);
  assert.deepEqual(recoveredProgress(complete,local),complete);
  assert.deepEqual(recoveredProgress({stage:2,delivered:true},{stage:99}),shared);
  assert.equal(shared.stage,2);
  assert.equal(local.stage,1);
});
