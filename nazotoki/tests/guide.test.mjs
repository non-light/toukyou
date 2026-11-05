import test from 'node:test';
import assert from 'node:assert/strict';
import {GATES, LOCATION_CAPTION, resolveLocation, detectGateCrossings, filterGates} from '../dist/station-guide-data.js';
import {FLOOR_ZONES, insideFloor, buildingRoute} from '../dist/floor-layout.js';

const zones = new Map(FLOOR_ZONES.map(zone => [zone.id, zone]));
const gateByZone = new Map(GATES.map(gate => [gate.zoneId, gate]));
const ids = gates => gates.map(gate => gate.id).sort();
const point = (gate, normalOffset, tangentOffset = 0) => {
  const location = {x: gate.x, z: gate.z, floor: gate.floor};
  location[gate.axis] += gate.insideSide * normalOffset;
  location[gate.axis === 'x' ? 'z' : 'x'] += tangentOffset;
  return location;
};

test('14 canonical gates share unique IDs, floor positions, and destination identities', () => {
  assert.equal(GATES.length, 14);
  assert.equal(new Set(GATES.map(gate => gate.id)).size, 14);
  assert.equal(gateByZone.size, 14);
  assert.equal(LOCATION_CAPTION, 'いま歩いている場所');
  for (const gate of GATES) {
    const zone = zones.get(gate.zoneId);
    assert.ok(zone, `${gate.id} must refer to a real destination`);
    assert.equal(gate.id, `gate-${gate.zoneId}`);
    assert.equal(gate.floor, zone.floor);
    assert.equal(gate.group, zone.group);
    assert.ok(['x', 'z'].includes(gate.axis));
    assert.ok([-1, 1].includes(gate.insideSide));
    assert.ok(gate.span > 0);
    assert.ok(insideFloor(gate.x, gate.z, gate.floor));
    assert.ok(gate.operator && gate.destination && gate.title);
    assert.equal(gate.spawn[gate.axis], gate[gate.axis] - gate.insideSide * 5);
    assert.equal(gate.spawn[gate.axis === 'x' ? 'z' : 'x'], gate[gate.axis === 'x' ? 'z' : 'x']);
  }
});

test('crossing each gate in both directions reports one correct entry or exit', () => {
  for (const gate of GATES) {
    const outside = point(gate, -5), inside = point(gate, 5);
    for (const [from, to, entered] of [[outside, inside, true], [inside, outside, false]]) {
      const events = detectGateCrossings(from, to, gate.floor);
      assert.equal(events.length, 1, `${gate.id} should report exactly one crossing`);
      assert.equal(events[0].gate.id, gate.id);
      assert.equal(events[0].entered, entered);
      assert.ok(events[0].message.includes(gate.title), 'Crossing feedback must identify the canonical gate');
    }
  }
});

test('parallel movement, movement beyond the gate span, and other floors do not trigger entry', () => {
  for (const gate of GATES) {
    assert.deepEqual(detectGateCrossings(point(gate, -2, -1), point(gate, -2, 1), gate.floor), []);
    assert.deepEqual(detectGateCrossings(point(gate, -2, gate.span / 2 + 2), point(gate, 2, gate.span / 2 + 2), gate.floor), []);
    assert.deepEqual(detectGateCrossings(point(gate, -5), point(gate, 5), '2F'), []);
    assert.deepEqual(detectGateCrossings({...point(gate, -5), floor: '2F'}, point(gate, 5), gate.floor), []);
    assert.deepEqual(detectGateCrossings(point(gate, -5), {...point(gate, 5), floor: '2F'}, gate.floor), []);
  }
  assert.deepEqual(detectGateCrossings({x: NaN, z: 0}, {x: 0, z: 0}), []);
  assert.deepEqual(detectGateCrossings(null, {x: 0, z: 0}), []);
});

test('multiple gates crossed in one segment are reported in physical travel order', () => {
  const west = gateByZone.get('marunouchi-central'), east = gateByZone.get('yaesu-central');
  const from = {x: west.x - 5, z: 0}, to = {x: east.x + 5, z: 0};
  const forward = detectGateCrossings(from, to, '1F');
  assert.deepEqual(forward.map(event => event.gate.id), [west.id, east.id]);
  assert.deepEqual(forward.map(event => event.entered), [true, false]);
  const reverse = detectGateCrossings(to, from, '1F');
  assert.deepEqual(reverse.map(event => event.gate.id), [east.id, west.id]);
  assert.deepEqual(reverse.map(event => event.entered), [true, false]);
});

test('current location agrees with the paid side of every gate and preserves transfer areas', () => {
  for (const gate of GATES) {
    const inside = resolveLocation(point(gate, 5));
    const outside = resolveLocation(point(gate, -5));
    assert.equal(inside.floor, gate.floor);
    assert.equal(outside.floor, gate.floor);
    assert.equal(inside.paid, true, `${gate.id} inside must be a paid area`);
    assert.equal(inside.group, gate.group);
    assert.match(inside.areaLabel, /改札内/);
    if (gate.kind === 'transfer') {
      assert.equal(outside.paid, true, `${gate.id} returns to the conventional paid area`);
      assert.equal(outside.group, 'general');
    } else {
      assert.equal(outside.paid, false, `${gate.id} outside must be unpaid`);
      assert.match(outside.areaLabel, /改札外/);
    }
  }
});

test('location uses the containing floor island, keeping Keiyo, Sobu, and platform areas distinct', () => {
  const mainB1 = resolveLocation(zones.get('b1-concourse'));
  const keiyoB1 = resolveLocation(zones.get('keiyo-passage'));
  assert.equal(mainB1.group, 'general');
  assert.equal(keiyoB1.group, 'keiyo');
  assert.notEqual(mainB1.id, keiyoB1.id);
  const keiyoB4 = resolveLocation(zones.get('keiyo-platform-12'));
  const sobuB4 = resolveLocation(zones.get('sobu-concourse'));
  assert.equal(keiyoB4.group, 'keiyo');
  assert.equal(sobuB4.group, 'sobu');
  assert.notEqual(keiyoB4.id, sobuB4.id);
  for (const zone of FLOOR_ZONES.filter(zone => ['2F', 'M2F', 'B5F'].includes(zone.floor))) {
    const location = resolveLocation(zone);
    assert.equal(location.id, zone.id);
    assert.equal(location.floor, zone.floor);
    assert.equal(location.group, zone.group);
    assert.equal(location.paid, zone.id !== 'm2-yaekita');
  }
  const gap = resolveLocation({x: 32, z: 39, floor: 'B1F'});
  assert.equal(gap.paid, false, 'An empty gap must not inherit the nearest underground area');
  assert.match(gap.areaLabel, /エリア外/);
});

test('JR East and Tokaido/Sanyo retain separate operators, destinations, and south transfer identities', () => {
  const eastSouth = gateByZone.get('jr-east-south'), tokaidoSouth = gateByZone.get('tokaido-south');
  assert.notEqual(eastSouth.id, tokaidoSouth.id);
  assert.notEqual(eastSouth.title, tokaidoSouth.title);
  assert.equal(eastSouth.operator, 'JR東日本');
  assert.equal(tokaidoSouth.operator, 'JR東海');
  assert.match(eastSouth.destination, /北陸/);
  assert.match(eastSouth.destination, /20〜23番線/);
  assert.match(tokaidoSouth.destination, /東海道・山陽/);
  assert.match(tokaidoSouth.destination, /14〜19番線/);
  assert.deepEqual(ids(filterGates({group: 'east'})), ids(GATES.filter(gate => gate.group === 'east')));
  assert.deepEqual(ids(filterGates({group: 'tokaido'})), ids(GATES.filter(gate => gate.group === 'tokaido')));
  assert.deepEqual(ids(filterGates({query: '南 のりかえ口'})), ids([eastSouth, tokaidoSouth]));
});

test('gate search handles full-width text, operators, destinations, platforms, and combined terms', () => {
  const east = GATES.filter(gate => gate.group === 'east');
  const tokaido = GATES.filter(gate => gate.group === 'tokaido');
  assert.deepEqual(ids(filterGates({query: 'ＪＲ ＥＡＳＴ'})), ids(filterGates({query: 'JR東日本'})));
  assert.deepEqual(ids(filterGates({query: 'jr central'})), ids(filterGates({query: 'JR東海'})));
  assert.deepEqual(ids(filterGates({query: 'JR East 北陸'})), ids(east));
  assert.deepEqual(ids(filterGates({query: '２０〜２３'})), ids(east));
  assert.deepEqual(ids(filterGates({query: '１４～１９'})), ids(tokaido));
  assert.deepEqual(ids(filterGates({query: '  Ｂ２Ｆ　京葉  '})), ids(GATES.filter(gate => gate.group === 'keiyo')));
  assert.deepEqual(ids(filterGates({query: 'ＪＲ東海 南'})), ids([gateByZone.get('tokaido-south')]));
  assert.deepEqual(filterGates({group: 'east', query: '東海道'}), []);
  assert.deepEqual(filterGates({query: '存在しない改札'}), []);
  assert.deepEqual(ids(filterGates()), ids(GATES));
});

function makeCanvas() {
  const canvas = {width: 0, height: 0, style: {}};
  const gradient = {addColorStop() {}};
  const context = new Proxy({
    canvas,
    measureText: text => ({width: String(text).length * 16}),
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
    createPattern: () => ({}),
    getImageData: () => ({data: new Uint8ClampedArray(canvas.width * canvas.height * 4)}),
  }, {get(target, key) { return key in target ? target[key] : () => {}; }});
  canvas.getContext = () => context;
  return canvas;
}

function assertPhysicalRoute(from, to, allowed) {
  const route = buildingRoute(from, to, allowed);
  assert.ok(route.length, `Mounted gate visuals must leave ${to.id} reachable`);
  const last = route.at(-1);
  assert.deepEqual({floor:last.floor, x:last.x, z:last.z}, {floor:to.floor, x:to.x, z:to.z});
  let previous = from;
  for (const step of route) {
    assert.ok(allowed(step.x, step.z, step.floor));
    if (step.kind === 'walk') {
      assert.equal(previous.floor, step.floor);
      const count = Math.max(1, Math.ceil(Math.hypot(step.x - previous.x, step.z - previous.z) / .15));
      for (let i = 0; i <= count; i++) assert.ok(allowed(previous.x + (step.x - previous.x) * i / count, previous.z + (step.z - previous.z) * i / count, step.floor));
    }
    previous = step;
  }
}

test('gate spawn points are collision-free and animated gate visuals preserve every floor guide route', {
  skip: process.env.CHECK_BUILDING_SCENE !== '1' ? 'Set CHECK_BUILDING_SCENE=1 for mounted scene checks' : false,
}, async t => {
  const previousDocument = globalThis.document;
  globalThis.document = {createElement: tag => {
    assert.equal(tag, 'canvas');
    return makeCanvas();
  }};
  let building, visuals;
  try {
    const [{createBuildingScene}, {addGateVisuals}] = await Promise.all([import('../dist/building-scene.js'), import('../dist/gate-visuals.js')]);
    building = createBuildingScene();
    visuals = addGateVisuals(building);
    const radius = .27;
    const allowed = (x, z, floor) => insideFloor(x, z, floor) && !(building.collidersByFloor[floor] ?? []).some(box =>
      x > box.minX - radius && x < box.maxX + radius && z > box.minZ - radius && z < box.maxZ + radius);
    for (const gate of GATES) {
      assert.ok(allowed(gate.spawn.x, gate.spawn.z, gate.floor), `${gate.id} spawn is blocked`);
      assert.ok(building.floorGroups[gate.floor].getObjectByName(gate.id), `${gate.id} visual is absent from its floor`);
      visuals.update(point(gate, -2), gate.floor, .1);
    }
    const start = zones.get('dome');
    for (const zone of FLOOR_ZONES) {
      assertPhysicalRoute(start, zone, allowed);
      assertPhysicalRoute(zone, start, allowed);
    }
    t.diagnostic(`All 14 gate spawns and ${FLOOR_ZONES.length} floor destinations remain accessible with animated gates mounted`);
  } finally {
    visuals?.dispose();
    building?.dispose();
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});
