import {ROOM_TTL, MEMBER_TTL, cleanName, cleanPosition, startingPosition, resolveAction} from './room-state.mjs';
import {AVATARS, avatarById, avatarIdFromColor} from '../../dist/game/avatar-catalog.js';

const CODE = /^[A-HJ-NP-Z2-9]{6}$/;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const json = (data, status = 200) => Response.json(data, {status, headers: {'Cache-Control': 'no-store'}});
const fail = (message, status = 400, code) => json({error: message, ...(code ? {code} : {})}, status);
const legacyColors = {red: '#d69d9b', blue: '#87b7c4', green: '#b7c491', yellow: '#d8ad62'};
const avatarTaken = () => fail('その旅人は仲間が選んでいます。別の色を選んでください。', 409, 'avatar_taken');
const randomCode = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), n => ALPHABET[n % ALPHABET.length]).join('');
const secret = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), n => n.toString(16).padStart(2, '0')).join('');
const hash = async token => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))), n => n.toString(16).padStart(2, '0')).join('');

async function snapshot(db, code, selfId, action) {
  const room = await db.prepare('SELECT * FROM ticket_rooms WHERE code = ?').bind(code).first();
  if (!room) return fail('この部屋は終了しました。新しい部屋で始めてください。', 404);
  const {results} = await db.prepare('SELECT id, name, color, position, last_seen FROM ticket_members WHERE room_code = ? ORDER BY id').bind(code).all();
  const now = Date.now();
  return json({selfId, room: {code, stage: room.stage, delivered: Boolean(room.delivered), expiresAt: room.expires_at},
    members: results.map(member => ({id: member.id, name: member.name, color: member.color, avatarId: avatarIdFromColor(member.color),
      position: JSON.parse(member.position), online: now - member.last_seen < 10000})), ...(action ? {action} : {})});
}

async function addMember(db, code, name, now, avatarId = null) {
  const token = secret(), tokenHash = await hash(token), id = crypto.randomUUID();
  const position = JSON.stringify(startingPosition());
  // Select an available avatar inside the transactional INSERT, so concurrent
  // requests cannot claim the same figure or create a fifth member. Legacy
  // colors represent the same avatars and also reserve their matching seat.
  const palette = AVATARS.flatMap((avatar, index) => [avatar.id, avatar.color, legacyColors[avatar.id], index]);
  const result = await db.batch([
    db.prepare('DELETE FROM ticket_members WHERE room_code = ? AND last_seen < ?').bind(code, now - MEMBER_TTL),
    db.prepare(`WITH palette (avatar_id, color, legacy_color, sort_order) AS
      (VALUES (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?))
      INSERT INTO ticket_members (id, room_code, token_hash, name, color, position, last_seen)
      SELECT ?, ?, ?, ?, palette.color, ?, ? FROM palette WHERE
      (? IS NULL OR palette.avatar_id = ?)
      AND NOT EXISTS (SELECT 1 FROM ticket_members WHERE room_code = ? AND color IN (palette.color, palette.legacy_color))
      AND
      (SELECT COUNT(*) FROM ticket_members WHERE room_code = ?) < 4
      AND EXISTS (SELECT 1 FROM ticket_rooms WHERE code = ? AND expires_at > ?)
      ORDER BY palette.sort_order LIMIT 1`)
      .bind(...palette, id, code, tokenHash, cleanName(name), position, now, avatarId, avatarId, code, code, code, now),
  ]);
  if (!result[1].meta.changes) return null;
  return {token, id};
}

export async function handleRooms(request, db, route) {
  if (!db) return fail('協力プレイを準備しています。ひとりではそのまま遊べます。', 503);
  if (request.method !== 'POST') return fail('この操作にはPOSTを使ってください。', 405);
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return fail('ゲームの画面から操作してください。', 403);
  let body;
  try {
    if (Number(request.headers.get('content-length') || 0) > 8192) return fail('入力が長すぎます。', 413);
    const raw = await request.text();
    if (raw.length > 8192) return fail('入力が長すぎます。', 413);
    body = JSON.parse(raw || '{}');
    if (!body || typeof body !== 'object' || Array.isArray(body)) return fail('入力を確認してください。');
  } catch { return fail('入力を確認してください。'); }
  const avatarId = body.avatarId === undefined ? null : body.avatarId;
  if (avatarId !== null && !AVATARS.some(avatar => avatar.id === avatarId)) return fail('旅人の色を選び直してください。', 400, 'invalid_avatar');
  if (body.avatarId === null) return fail('旅人の色を選び直してください。', 400, 'invalid_avatar');
  const now = Date.now();
  try {
    if (!route.length) {
      await db.batch([
        db.prepare('DELETE FROM ticket_members WHERE room_code IN (SELECT code FROM ticket_rooms WHERE expires_at <= ?)').bind(now),
        db.prepare('DELETE FROM ticket_rooms WHERE expires_at <= ?').bind(now),
      ]);
      let code;
      for (let attempt = 0; attempt < 5; attempt++) {
        const candidate = randomCode();
        const result = await db.prepare('INSERT OR IGNORE INTO ticket_rooms (code, stage, delivered, created_at, expires_at) VALUES (?, 0, 0, ?, ?)').bind(candidate, now, now + ROOM_TTL).run();
        if (result.meta.changes) { code = candidate; break; }
      }
      if (!code) return fail('部屋を作れませんでした。もう一度お試しください。', 503);
      const member = await addMember(db, code, body.name, now, avatarId);
      if (!member) return fail('部屋を作れませんでした。もう一度お試しください。', 503);
      const response = await snapshot(db, code, member.id);
      return json({...await response.json(), token: member.token}, 201);
    }
    const [code, operation] = route;
    if (!CODE.test(code) || route.length !== 2 || !['join', 'sync', 'leave'].includes(operation)) return fail('部屋番号を確認してください。', 404);
    const room = await db.prepare('SELECT * FROM ticket_rooms WHERE code = ? AND expires_at > ?').bind(code, now).first();
    if (!room) return fail('部屋が見つからないか、期限が切れています。番号を確認してください。', 404);
    if (operation === 'join') {
      const member = await addMember(db, code, body.name, now, avatarId);
      if (!member) {
        const count = await db.prepare('SELECT COUNT(*) AS total FROM ticket_members WHERE room_code = ?').bind(code).first();
        return count.total >= 4 ? fail('この部屋は4人そろっています。', 409, 'room_full') : avatarTaken();
      }
      const response = await snapshot(db, code, member.id);
      return json({...await response.json(), token: member.token}, 201);
    }
    if (typeof body.token !== 'string' || !/^[a-f0-9]{64}$/.test(body.token)) return fail('部屋に入り直してください。', 401);
    const member = await db.prepare('SELECT * FROM ticket_members WHERE room_code = ? AND token_hash = ?').bind(code, await hash(body.token)).first();
    if (!member) return fail('接続が終了しました。部屋に入り直してください。', 401);
    if (operation === 'leave') {
      await db.prepare('DELETE FROM ticket_members WHERE id = ?').bind(member.id).run();
      return json({left: true});
    }
    const position = cleanPosition(body.position);
    if (!position) return fail('現在地を確認できませんでした。');
    if (avatarId !== null) {
      const avatar = avatarById(avatarId);
      const changed = await db.prepare(`UPDATE ticket_members SET color = ?, position = ?, last_seen = ? WHERE id = ?
        AND NOT EXISTS (SELECT 1 FROM ticket_members WHERE room_code = ? AND id <> ? AND color IN (?, ?))`)
        .bind(avatar.color, JSON.stringify(position), now, member.id, code, member.id, avatar.color, legacyColors[avatar.id]).run();
      if (!changed.meta.changes) return avatarTaken();
    } else {
      await db.prepare('UPDATE ticket_members SET position = ?, last_seen = ? WHERE id = ?').bind(JSON.stringify(position), now, member.id).run();
    }
    const action = resolveAction(room, body.action, position);
    if (body.action && action.ok) {
      // Monotonic CAS updates make simultaneous correct answers harmless.
      await db.prepare('UPDATE ticket_rooms SET stage = MAX(stage, ?), delivered = MAX(delivered, ?) WHERE code = ? AND stage = ?')
        .bind(action.stage, Number(action.delivered), code, room.stage).run();
    }
    return snapshot(db, code, member.id, body.action ? {ok: action.ok, message: action.message} : undefined);
  } catch (error) {
    console.error('Ticket room request failed', error instanceof Error ? error.message : 'unknown error');
    return fail('通信がうまくいきませんでした。少し待って、もう一度お試しください。', 503);
  }
}
