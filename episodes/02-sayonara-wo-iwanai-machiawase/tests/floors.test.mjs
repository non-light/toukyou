import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FLOORS, FLOOR_ZONES, FLOOR_AREAS, CONNECTORS,
  insideFloor, buildingRoute, nearestConnector, walkwayVelocity,
} from '../dist/floor-layout.js';

// Protect Tokyo Station's distinct vertical routes. Equal floor labels do not
// connect the main building with Keiyo, or one railway platform with another.
const zones = new Map(FLOOR_ZONES.map(zone => [zone.id, zone]));
const floors = new Set(FLOORS.map(floor => floor.id));
const connectors = new Map(CONNECTORS.map(connector => [connector.id, connector]));
const samePoint = (a, b) => a.floor === b.floor && Math.abs(a.x - b.x) < 1e-8 && Math.abs(a.z - b.z) < 1e-8;
const defaultAllowed = (x, z, floor) => insideFloor(x, z, floor);

function checkRoute(from, to, allowed = defaultAllowed) {
  const route = buildingRoute(from, to, allowed);
  assert.ok(route.length, `No route from ${from.id ?? JSON.stringify(from)} to ${to.id ?? JSON.stringify(to)}`);
  assert.ok(samePoint(route.at(-1), to), `Route does not end at ${to.id ?? JSON.stringify(to)}`);
  let previous = from;
  for (const step of route) {
    assert.ok(floors.has(step.floor), `Unknown route floor ${step.floor}`);
    if (step.kind === 'transfer') {
      const connector = connectors.get(step.connectorId);
      assert.ok(connector, `Unknown vertical connector ${step.connectorId}`);
      assert.ok(
        samePoint(previous, connector.a) && samePoint(step, connector.b) ||
        samePoint(previous, connector.b) && samePoint(step, connector.a),
        `Transfer ${step.connectorId} must use its two exact endpoints`,
      );
      assert.ok(allowed(previous.x, previous.z, previous.floor), `Blocked departure of ${step.connectorId}`);
      assert.ok(allowed(step.x, step.z, step.floor), `Blocked arrival of ${step.connectorId}`);
    } else {
      assert.equal(step.kind, 'walk', 'Only walk and explicit transfer steps are supported');
      assert.equal(step.floor, previous.floor, 'Walking cannot silently change floors');
      const count = Math.max(1, Math.ceil(Math.hypot(step.x - previous.x, step.z - previous.z) / 0.15));
      for (let i = 0; i <= count; i++) {
        const x = previous.x + (step.x - previous.x) * i / count;
        const z = previous.z + (step.z - previous.z) * i / count;
        assert.ok(allowed(x, z, step.floor), `Route to ${to.id ?? 'connector'} leaves walkable ${step.floor} at (${x.toFixed(2)}, ${z.toFixed(2)})`);
      }
    }
    previous = step;
  }
  return route;
}

function verticalFloors(from, route) {
  return [from.floor, ...route.filter(step => step.kind === 'transfer').map(step => step.floor)];
}

function checkDisconnectedSameFloor(first, second) {
  assert.equal(first.floor, second.floor);
  const sameFloorOnly = (x, z, floor) => floor === first.floor && insideFloor(x, z, floor);
  assert.deepEqual(buildingRoute(first, second, sameFloorOnly), [], `${first.id} and ${second.id} must not share a horizontal connection`);
  const route = checkRoute(first, second);
  assert.ok(route.some(step => step.kind === 'transfer'), 'The available route must leave the disconnected floor area');
}

test('the building exposes eight valid floors, distinct zones, and no invented 3F', () => {
  assert.deepEqual(FLOORS.map(floor => floor.id), ['2F', 'M2F', '1F', 'B1F', 'B2F', 'B3F', 'B4F', 'B5F']);
  assert.equal(floors.size, 8);
  assert.equal(zones.size, FLOOR_ZONES.length, 'Zone IDs must be unique across floors');
  assert.ok(FLOOR_ZONES.length >= 41, 'All original floor destinations must remain available');
  assert.deepEqual(Object.keys(FLOOR_AREAS).sort(), [...floors].sort());
  for (let index = 1; index < FLOORS.length; index++) assert.ok(FLOORS[index].elevation < FLOORS[index - 1].elevation);
  for (const zone of FLOOR_ZONES) {
    assert.ok(floors.has(zone.floor), `${zone.id} refers to an unknown floor`);
    assert.ok(insideFloor(zone.x, zone.z, zone.floor), `${zone.id} is outside its floor's walkable area`);
  }
  for (const floor of FLOORS) {
    assert.ok(zones.has(floor.defaultZone), `${floor.id} has no valid default zone`);
    assert.equal(zones.get(floor.defaultZone).floor, floor.id);
  }
  assert.equal(insideFloor(0, 0, '3F'), false);
});

test('all vertical links have valid endpoints and work in both directions', () => {
  assert.equal(connectors.size, CONNECTORS.length, 'Connector IDs must be unique');
  for (const connector of CONNECTORS) {
    assert.notEqual(connector.a.floor, connector.b.floor, `${connector.id} must change floors`);
    for (const endpoint of [connector.a, connector.b]) {
      assert.ok(floors.has(endpoint.floor));
      assert.ok(insideFloor(endpoint.x, endpoint.z, endpoint.floor), `${connector.id} endpoint is inaccessible`);
    }
    for (const [from, to] of [[connector.a, connector.b], [connector.b, connector.a]]) {
      const route = checkRoute(from, to);
      assert.ok(route.some(step => step.kind === 'transfer' && step.connectorId === connector.id), `${connector.id} should be usable directly in both directions`);
    }
  }
});

test('Keiyo uses 1F → separate B1 passage → B2 → B3 → B4, with the reverse route preserved', () => {
  const start = zones.get('dome');
  for (const id of ['keiyo-platform-12', 'keiyo-platform-34']) {
    const destination = zones.get(id);
    const route = checkRoute(start, destination);
    assert.deepEqual(verticalFloors(start, route), ['1F', 'B1F', 'B2F', 'B3F', 'B4F']);
    assert.equal(route.find(step => step.kind === 'transfer').connectorId, 'keiyo-entrance');
    assert.deepEqual(verticalFloors(destination, checkRoute(destination, start)), ['B4F', 'B3F', 'B2F', 'B1F', '1F']);
  }
});

test('Sobu/Yokosuka uses the main B1 → Sobu B4 concourse → B5, never Keiyo B2/B3', () => {
  const start = zones.get('dome');
  for (const id of ['sobu-platform-12', 'sobu-platform-34']) {
    const destination = zones.get(id);
    const route = checkRoute(start, destination);
    assert.deepEqual(verticalFloors(start, route), ['1F', 'B1F', 'B4F', 'B5F']);
    assert.ok(route.some(step => step.connectorId === 'sobu-deep'));
    assert.ok(!route.some(step => step.floor === 'B2F' || step.floor === 'B3F'));
    assert.deepEqual(verticalFloors(destination, checkRoute(destination, start)), ['B5F', 'B4F', 'B1F', '1F']);
  }
});

test('matching B1/B4 labels do not create false main-building/Keiyo connections', () => {
  checkDisconnectedSameFloor(zones.get('b1-concourse'), zones.get('keiyo-passage'));
  checkDisconnectedSameFloor(zones.get('keiyo-platform-12'), zones.get('sobu-concourse'));
  const b1Route = checkRoute(zones.get('b1-concourse'), zones.get('keiyo-passage'));
  assert.ok(b1Route.some(step => step.floor === '1F'), 'Main B1 to Keiyo passage must return through 1F');
});

test('M2 islands and separate railway platforms require a vertical connection', () => {
  const intermediate = FLOOR_ZONES.filter(zone => zone.floor === 'M2F');
  for (let i = 0; i < intermediate.length; i++) for (let j = i + 1; j < intermediate.length; j++) {
    checkDisconnectedSameFloor(intermediate[i], intermediate[j]);
  }
  const upperPlatforms = FLOOR_ZONES.filter(zone => zone.floor === '2F');
  for (let i = 0; i < upperPlatforms.length; i++) for (let j = i + 1; j < upperPlatforms.length; j++) {
    checkDisconnectedSameFloor(upperPlatforms[i], upperPlatforms[j]);
  }
  checkDisconnectedSameFloor(zones.get('keiyo-platform-12'), zones.get('keiyo-platform-34'));
  checkDisconnectedSameFloor(zones.get('sobu-platform-12'), zones.get('sobu-platform-34'));
});

test('every listed destination can be reached from the south dome and returned from', t => {
  const start = zones.get('dome');
  const began = performance.now();
  for (const destination of FLOOR_ZONES) {
    checkRoute(start, destination);
    checkRoute(destination, start);
  }
  t.diagnostic(`${FLOOR_ZONES.length} destinations checked in both directions in ${Math.round(performance.now() - began)} ms`);
});

test('nearby stairs identify only current-floor endpoints and sort by distance', () => {
  for (const connector of CONNECTORS) for (const endpoint of [connector.a, connector.b]) {
    const nearby = nearestConnector(endpoint, endpoint.floor, 0.05);
    assert.ok(nearby.some(item => item.connector.id === connector.id));
    for (let index = 0; index < nearby.length; index++) {
      assert.equal(nearby[index].floor, endpoint.floor);
      assert.ok(nearby[index].distance < 0.05);
      if (index) assert.ok(nearby[index].distance >= nearby[index - 1].distance);
    }
  }
  assert.deepEqual(nearestConnector({x:999, z:999}, 'B1F'), []);
});

test('moving walkways carry opposite lanes only inside the Keiyo B1 sections', () => {
  for (const z of [90, 120, 190, 220]) {
    assert.ok(walkwayVelocity(28, z, 'B1F') > 0);
    assert.ok(walkwayVelocity(36, z, 'B1F') < 0);
    assert.equal(walkwayVelocity(32, z, 'B1F'), 0, 'The central walking lane remains stationary');
    for (const floor of floors) if (floor !== 'B1F') assert.equal(walkwayVelocity(28, z, floor), 0);
  }
  for (const z of [50, 76, 142, 157, 172, 238, 270]) assert.equal(walkwayVelocity(28, z, 'B1F'), 0);
  assert.equal(walkwayVelocity(24, 90, 'B1F'), 0);
  assert.equal(walkwayVelocity(40, 90, 'B1F'), 0);
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

test('building geometry keeps all zones, connector endpoints, and cross-floor guide routes clear', {
  skip: process.env.CHECK_BUILDING_SCENE !== '1' ? 'Set CHECK_BUILDING_SCENE=1 once building-scene.js is ready' : false,
}, async t => {
  const previousDocument = globalThis.document;
  globalThis.document = {createElement: tag => {
    assert.equal(tag, 'canvas');
    return makeCanvas();
  }};
  let station;
  try {
    const {createBuildingScene} = await import('../dist/building-scene.js');
    station = createBuildingScene();
    assert.deepEqual(station.zones.map(zone => `${zone.floor}:${zone.id}`).sort(), FLOOR_ZONES.map(zone => `${zone.floor}:${zone.id}`).sort());
    assert.deepEqual(Object.keys(station.collidersByFloor).sort(), [...floors].sort());
    const radius = 0.27;
    const allowed = (x, z, floor) => insideFloor(x, z, floor) && !station.collidersByFloor[floor].some(box =>
      x > box.minX - radius && x < box.maxX + radius &&
      z > box.minZ - radius && z < box.maxZ + radius);
    for (const zone of FLOOR_ZONES) assert.ok(allowed(zone.x, zone.z, zone.floor), `Building geometry blocks ${zone.id}`);
    for (const connector of CONNECTORS) for (const endpoint of [connector.a, connector.b]) {
      assert.ok(allowed(endpoint.x, endpoint.z, endpoint.floor), `Building geometry blocks ${connector.id} on ${endpoint.floor}`);
    }
    const began = performance.now();
    const start = zones.get('dome');
    for (const destination of FLOOR_ZONES) {
      checkRoute(start, destination, allowed);
      checkRoute(destination, start, allowed);
    }
    t.diagnostic(`${FLOOR_ZONES.length} physical floor routes checked both ways in ${Math.round(performance.now() - began)} ms`);
  } finally {
    station?.dispose?.();
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});
