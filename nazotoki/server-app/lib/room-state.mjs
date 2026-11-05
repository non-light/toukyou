import {AVATARS} from '../../dist/game/avatar-catalog.js';

export const ROOM_TTL = 24 * 60 * 60 * 1000;
export const MEMBER_TTL = 90 * 1000;
export const COLORS = AVATARS.map(avatar => avatar.color);
export const FLOORS = new Set(['2F', 'M2F', '1F', 'B1F', 'B2F', 'B3F', 'B4F', 'B5F']);
const START = {x: 34, z: 10, floor: 'B1F', yaw: Math.PI};

export function cleanName(value) {
  const name = typeof value === 'string' ? value.trim().replace(/[\u0000-\u001f\u007f]/g, '') : '';
  return name.slice(0, 20) || '旅人';
}

export function cleanPosition(value) {
  if (!value || !Number.isFinite(value.x) || !Number.isFinite(value.z) ||
      !Number.isFinite(value.yaw ?? 0) || !FLOORS.has(value.floor) ||
      Math.abs(value.x) > 2000 || Math.abs(value.z) > 2000) return null;
  return {x: value.x, z: value.z, floor: value.floor, yaw: value.yaw ?? 0};
}

export const startingPosition = () => ({...START});

export function resolveAction(room, action, position) {
  const unchanged = {stage: room.stage, delivered: Boolean(room.delivered)};
  if (!action) return {...unchanged, ok: true, message: ''};
  const requirements = {
    bell: {stage: 0, floor: 'B1F', x: 34, z: 10},
    choice: {stage: 1, floor: 'B1F', x: 2, z: -3},
    order: {stage: 2, floor: '1F', x: -24, z: -2.5},
    deliver: {stage: 3, floor: '1F', x: -24, z: -2.5},
  };
  const target = requirements[action.type];
  if (!target) return {...unchanged, ok: false, message: 'この操作は使えません。'};
  if (room.stage > target.stage || (action.type === 'deliver' && room.delivered)) {
    return {...unchanged, ok: true, message: '仲間と発見を共有しました。'};
  }
  if (room.stage !== target.stage) return {...unchanged, ok: false, message: '先に手帳の案内をたどりましょう。'};
  if (!position || position.floor !== target.floor || Math.hypot(position.x - target.x, position.z - target.z) > 10) {
    return {...unchanged, ok: false, message: '目印の近くで切符を使ってみましょう。'};
  }
  if (action.type === 'choice' && action.answer !== 'postbox') {
    return {...unchanged, ok: false, message: '屋根の形を、もう一度見比べてみよう。'};
  }
  if (action.type === 'order' && JSON.stringify(action.answer) !== JSON.stringify(['bell', 'pillars', 'postbox'])) {
    return {...unchanged, ok: false, message: '手帳に残った、見つけた順番を見てみよう。'};
  }
  return {stage: action.type === 'deliver' ? 3 : room.stage + 1,
    delivered: action.type === 'deliver', ok: true, message: action.type === 'deliver' ? '手紙を届けました。' : '切符に新しい印が入りました。'};
}
