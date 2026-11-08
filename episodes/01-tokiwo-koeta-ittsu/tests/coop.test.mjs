import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync, readdirSync} from 'node:fs';
import {handleRooms} from '../server-app/lib/rooms.mjs';
import {resolveAction} from '../server-app/lib/room-state.mjs';
import {requestRoom, roomSessionEnded} from '../dist/game/ticket-session.js';

function database() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  const migrations = new URL('../drizzle/', import.meta.url);
  for (const file of readdirSync(migrations).filter(name => name.endsWith('.sql')).sort()) {
    sqlite.exec(readFileSync(new URL(file, migrations), 'utf8').replaceAll('--> statement-breakpoint', ''));
  }
  const db = {
    prepare(sql) {
      const statement = sqlite.prepare(sql);
      const wrap = values => ({
        bind: (...next) => wrap(next),
        async first() { return statement.get(...values) ?? null; },
        async all() { return {results: statement.all(...values)}; },
        async run() { return this.runSync(); },
        runSync() { const result = statement.run(...values); return {meta: {changes: result.changes}}; },
      });
      return wrap([]);
    },
    async batch(statements) {
      sqlite.exec('BEGIN IMMEDIATE');
      try {
        // D1 executes a batch as one isolated transaction; keep the test adapter
        // synchronous inside its transaction so concurrent API calls do too.
        const values = statements.map(statement => statement.runSync());
        sqlite.exec('COMMIT');
        return values;
      } catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
    sqlite,
  };
  return db;
}

async function api(db, path = '', body = {}, extra = {}) {
  const request = new Request('https://ticket.test/api/rooms' + path, {
    method: 'POST', headers: {'Content-Type': 'application/json', ...extra}, body: JSON.stringify(body),
  });
  const response = await handleRooms(request, db, path.split('/').filter(Boolean));
  return {status: response.status, data: await response.json()};
}

test('cooperative rooms admit at most four members and never expose membership tokens', async () => {
  const db = database();
  const owner = await api(db, '', {name: 'はじめ'});
  assert.equal(owner.status, 201);
  assert.match(owner.data.room.code, /^[A-HJ-NP-Z2-9]{6}$/);
  const code = owner.data.room.code;
  const joins = [];
  for (let i = 0; i < 5; i++) joins.push(await api(db, '/' + code + '/join', {name: '旅人' + i}));
  assert.equal(joins.filter(value => value.status === 201).length, 3);
  assert.equal(joins.filter(value => value.status === 409).length, 2);
  const result = await api(db, '/' + code + '/sync', {token: owner.data.token, position: {x: 34, z: 10, floor: 'B1F'}});
  assert.equal(result.data.members.length, 4);
  for (const member of result.data.members) {
    assert.equal('token' in member, false);
    assert.equal('token_hash' in member, false);
  }
  db.sqlite.close();
});

test('room progress requires correct clues and physical proximity, is shared and idempotent', async () => {
  const db = database();
  const owner = (await api(db, '', {name: 'いち'})).data;
  const code = owner.room.code;
  const other = (await api(db, '/' + code + '/join', {name: 'に'})).data;
  const sync = (token, position, action) => api(db, '/' + code + '/sync', {token, position, action});
  const bell = {x: 34, z: 10, floor: 'B1F'};
  const pillars = {x: 2, z: -3, floor: 'B1F'};
  const postbox = {x: -24, z: -2.5, floor: '1F'};
  let result = await sync(owner.token, postbox, {type: 'bell'});
  assert.equal(result.data.room.stage, 0);
  assert.equal(result.data.action.ok, false);
  result = await sync(owner.token, bell, {type: 'bell'});
  assert.equal(result.data.room.stage, 1);
  result = await sync(other.token, pillars, {type: 'choice', answer: 'train'});
  assert.equal(result.data.room.stage, 1);
  result = await sync(other.token, pillars, {type: 'choice', answer: 'postbox'});
  assert.equal(result.data.room.stage, 2);
  result = await sync(owner.token, bell, {type: 'bell'});
  assert.equal(result.data.room.stage, 2);
  result = await sync(owner.token, postbox, {type: 'order', answer: ['bell', 'pillars', 'postbox']});
  assert.equal(result.data.room.stage, 3);
  assert.equal(result.data.room.delivered, false);
  result = await sync(other.token, postbox, {type: 'deliver'});
  assert.equal(result.data.room.delivered, true);
  result = await sync(owner.token, postbox);
  assert.equal(result.data.room.delivered, true);
  db.sqlite.close();
});

test('membership tokens and same-origin checks protect synchronization and leave restores a seat', async () => {
  const db = database();
  const owner = (await api(db)).data;
  const code = owner.room.code;
  const position = {x: 34, z: 10, floor: 'B1F'};
  assert.equal((await api(db, '/' + code + '/sync', {token: 'a'.repeat(64), position})).status, 401);
  assert.equal((await api(db, '/' + code + '/sync', {token: owner.token, position}, {Origin: 'https://elsewhere.test'})).status, 403);
  assert.equal((await api(db, '/' + code + '/leave', {token: owner.token})).status, 200);
  assert.equal((await api(db, '/' + code + '/sync', {token: owner.token, position})).status, 401);
  assert.equal((await api(db, '/' + code + '/join', {name: '新しい旅人'})).status, 201);
  db.sqlite.close();
});

test('temporarily disconnected members stay for 90 seconds and room lifetime is 24 hours', async () => {
  const db = database();
  const owner = (await api(db)).data;
  const code = owner.room.code;
  assert.ok(owner.room.expiresAt > Date.now() + 23 * 60 * 60 * 1000);
  const other = (await api(db, '/' + code + '/join', {name: '一時離席'})).data;
  db.sqlite.prepare('UPDATE ticket_members SET last_seen = ? WHERE id = ?').run(Date.now() - 11000, other.selfId);
  let result = await api(db, '/' + code + '/sync', {token: owner.token, position: {x: 34, z: 10, floor: 'B1F'}});
  assert.equal(result.data.members.find(member => member.id === other.selfId).online, false);
  assert.equal(result.data.members.length, 2);
  db.sqlite.prepare('UPDATE ticket_rooms SET expires_at = ? WHERE code = ?').run(Date.now() - 1, code);
  result = await api(db, '/' + code + '/join', {});
  assert.equal(result.status, 404);
  db.sqlite.close();
});

test('the final delivery never skips the order puzzle', () => {
  const result = resolveAction({stage: 2, delivered: 0}, {type: 'deliver'}, {x: -24, z: -2.5, floor: '1F'});
  assert.equal(result.ok, false);
  assert.equal(result.stage, 2);
  assert.equal(result.delivered, false);
});

test('a reclaimed seat and expired room return errors the client can recover from', async () => {
  const db = database();
  const owner = (await api(db, '', {name:'戻る旅人'})).data;
  const code = owner.room.code;
  db.sqlite.prepare('UPDATE ticket_members SET last_seen = ? WHERE id = ?').run(Date.now()-91000,owner.selfId);
  assert.equal((await api(db,'/'+code+'/join',{name:'次の旅人'})).status,201);
  const fetcher = (path, options) => handleRooms(new Request('https://ticket.test'+path,options),db,path.slice('/api/rooms'.length).split('/').filter(Boolean));
  const payload={token:owner.token,position:{x:34,z:10,floor:'B1F'}};
  await assert.rejects(requestRoom('/api/rooms/'+code+'/sync',payload,fetcher),error=>error.status===401&&roomSessionEnded(error));
  db.sqlite.prepare('UPDATE ticket_rooms SET expires_at = ? WHERE code = ?').run(Date.now()-1,code);
  await assert.rejects(requestRoom('/api/rooms/'+code+'/sync',payload,fetcher),error=>error.status===404&&roomSessionEnded(error));
  db.sqlite.close();
});

test('automatic avatar assignment stays distinct under concurrent joins and a departing avatar is reusable', async () => {
  const db = database();
  const owner = (await api(db)).data;
  const code = owner.room.code;
  const joins = await Promise.all(Array.from({length: 7}, (_, i) => api(db, '/' + code + '/join', {name: '旅人' + i})));
  assert.equal(joins.filter(result => result.status === 201).length, 3);
  assert.equal(joins.filter(result => result.status === 409).length, 4);
  let snapshot = await api(db, '/' + code + '/sync', {token: owner.token, position: {x: 34, z: 10, floor: 'B1F'}});
  assert.deepEqual(new Set(snapshot.data.members.map(member => member.avatarId)), new Set(['red', 'blue', 'green', 'yellow']));
  const leaving = joins.find(result => result.status === 201).data;
  const avatarId = snapshot.data.members.find(member => member.id === leaving.selfId).avatarId;
  assert.equal((await api(db, '/' + code + '/leave', {token: leaving.token})).status, 200);
  const replacement = await api(db, '/' + code + '/join', {name: '交代', avatarId});
  assert.equal(replacement.status, 201);
  assert.equal(replacement.data.members.find(member => member.id === replacement.data.selfId).avatarId, avatarId);
  db.sqlite.close();
});

test('a requested avatar is claimed atomically and invalid selections never create a room', async () => {
  const db = database();
  for (const avatarId of [null, 'purple', '', 3, [], {}]) {
    const invalid = await api(db, '', {avatarId});
    assert.equal(invalid.status, 400);
    assert.equal(invalid.data.code, 'invalid_avatar');
  }
  assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS total FROM ticket_rooms').get().total, 0);
  const owner = (await api(db, '', {name: '赤', avatarId: 'red'})).data;
  assert.equal(owner.members.find(member => member.id === owner.selfId).avatarId, 'red');
  const code = owner.room.code;
  const joins = await Promise.all(Array.from({length: 6}, (_, i) => api(db, '/' + code + '/join', {name: '青' + i, avatarId: 'blue'})));
  assert.equal(joins.filter(result => result.status === 201).length, 1);
  assert.equal(joins.filter(result => result.status === 409 && result.data.code === 'avatar_taken').length, 5);
  assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS total FROM ticket_members WHERE room_code = ?').get(code).total, 2);
  db.sqlite.close();
});

test('avatar changes preserve progress and reject a taken color without changing position', async () => {
  const db = database();
  const owner = (await api(db, '', {name: '赤', avatarId: 'red'})).data;
  const code = owner.room.code;
  const other = (await api(db, '/' + code + '/join', {name: '青', avatarId: 'blue'})).data;
  const blocked = await api(db, '/' + code + '/sync', {token: owner.token, avatarId: 'blue', position: {x: 2, z: -3, floor: 'B1F'}, action: {type: 'bell'}});
  assert.equal(blocked.status, 409);
  assert.equal(blocked.data.code, 'avatar_taken');
  const stored = db.sqlite.prepare('SELECT color, position FROM ticket_members WHERE id = ?').get(owner.selfId);
  assert.equal(stored.color, '#ec806c');
  assert.deepEqual(JSON.parse(stored.position), {x: 34, z: 10, floor: 'B1F', yaw: Math.PI});
  assert.equal(db.sqlite.prepare('SELECT stage FROM ticket_rooms WHERE code = ?').get(code).stage, 0);
  const changes = await Promise.all([owner, other].map(member => api(db, '/' + code + '/sync', {
    token: member.token, avatarId: 'yellow', position: {x: 34, z: 10, floor: 'B1F'},
  })));
  assert.equal(changes.filter(result => result.status === 200).length, 1);
  assert.equal(changes.filter(result => result.status === 409 && result.data.code === 'avatar_taken').length, 1);
  db.sqlite.close();
});

test('legacy avatar colors reserve the same figure for new joins and changes', async () => {
  const db = database();
  const owner = (await api(db, '', {avatarId: 'blue'})).data;
  const code = owner.room.code;
  db.sqlite.prepare('UPDATE ticket_members SET color = ? WHERE id = ?').run('#87b7c4', owner.selfId);
  const duplicate = await api(db, '/' + code + '/join', {avatarId: 'blue'});
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.data.code, 'avatar_taken');
  const other = (await api(db, '/' + code + '/join')).data;
  assert.equal(other.members.find(member => member.id === owner.selfId).avatarId, 'blue');
  assert.notEqual(other.members.find(member => member.id === other.selfId).avatarId, 'blue');
  const blocked = await api(db, '/' + code + '/sync', {token: other.token, avatarId: 'blue', position: {x: 34, z: 10, floor: 'B1F'}});
  assert.equal(blocked.status, 409);
  db.sqlite.close();
});
