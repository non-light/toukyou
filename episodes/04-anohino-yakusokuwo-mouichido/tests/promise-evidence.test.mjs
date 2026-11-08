import test from 'node:test';
import assert from 'node:assert/strict';
import {weaveLetters} from '../dist/game/promise-evidence.js';

test('letter picks preserve player-chosen sources without inferring alternation',()=>{
  let sequence=[];
  for(const source of ['friend','friend','grandma','grandma','grandma'])sequence=weaveLetters(sequence,{type:'take',source});
  assert.deepEqual(sequence,['friend','friend','grandma','grandma','grandma']);
  for(const source of ['friend','grandma'])assert.deepEqual(weaveLetters(sequence,{type:'take',source}),sequence);
});

test('undo returns the last picked letter to its own strip and never changes an input array',()=>{
  const sequence=Object.freeze(['grandma','friend','grandma']);
  const undone=weaveLetters(sequence,{type:'undo'});
  assert.deepEqual(undone,['grandma','friend']);assert.notEqual(undone,sequence);
  assert.deepEqual(weaveLetters(undone,{type:'take',source:'grandma',index:1}),sequence);
  assert.deepEqual(sequence,['grandma','friend','grandma']);
  assert.deepEqual(weaveLetters([],{type:'undo'}),[]);
  assert.deepEqual(weaveLetters(sequence,{type:'reset'}),[]);
});

test('a repeated stale pick cannot consume a second character and invalid sources leave progress intact',()=>{
  const pick={type:'take',source:'grandma',index:0};
  const once=weaveLetters([],pick);
  assert.deepEqual(weaveLetters(once,pick),once);
  for(const source of ['sumiko','__proto__',null,undefined])assert.deepEqual(weaveLetters(once,{type:'take',source}),once);
  assert.deepEqual(weaveLetters(once,{type:'take',source:'friend',index:2}),once);
});

test('initial drafts retain only a legal prefix and never exceed either strip',()=>{
  assert.deepEqual(weaveLetters(['grandma','grandma','grandma','grandma','friend']),['grandma','grandma','grandma']);
  assert.deepEqual(weaveLetters(['friend','unknown','grandma']),['friend']);
  assert.deepEqual(weaveLetters(['friend','friend','friend']),['friend','friend']);
  for(const sequence of [undefined,null,{},'grandma',42])assert.deepEqual(weaveLetters(sequence),[]);
});
