import test from 'node:test';
import assert from 'node:assert/strict';
import { GROUPS, ZONES, WALK_AREAS, NODES, insideWalkArea, routePath, zoneLabel } from '../dist/station-layout.js';

// These checks protect the distinction between the two Shinkansen systems and
// ensure a guided walk can reach its destinations without crossing station walls.
const zoneById = new Map(ZONES.map(zone => [zone.id, zone]));
const conventionalExits = [
  'dome', 'marunouchi-central', 'marunouchi-north',
  'yaesu-north', 'yaesu-central', 'yaesu-south',
];
const eastGates = ['jr-east-north', 'jr-east-south'];
const tokaidoGates = ['tokaido-central', 'tokaido-south'];

function sampleSegment(from, to, check, description) {
  const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / 0.15));
  for (let step = 0; step <= steps; step++) {
    const ratio = step / steps;
    const point = { x: from.x + (to.x - from.x) * ratio, z: from.z + (to.z - from.z) * ratio };
    assert.ok(check(point), `${description}: blocked at (${point.x.toFixed(3)}, ${point.z.toFixed(3)}), segment ${JSON.stringify(from)} -> ${JSON.stringify(to)}`);
  }
}

function assertWalkableRoute(from, to, {check = point => insideWalkArea(point.x, point.z), routeAllowed, allowUnavailable = false} = {}) {
  const path = routePath(from, to, routeAllowed);
  if (allowUnavailable && !path.length) return false;
  assert.ok(path.length, `No route from ${JSON.stringify(from)} to ${to.id ?? JSON.stringify(to)}`);
  assert.equal(path.at(-1).x, to.x, 'Route must end at the requested destination x');
  assert.equal(path.at(-1).z, to.z, 'Route must end at the requested destination z');
  let previous = from;
  for (const point of path) {
    sampleSegment(previous, point, check, `Route to ${to.id ?? 'destination'}`);
    previous = point;
  }
  return true;
}

function arbitraryStarts() {
  const points = new Map();
  // Include corners and off-axis locations; graph-node-only tests miss unsafe
  // attachment lines from the Yaesu passage into a nearby Shinkansen room.
  for (const area of WALK_AREAS) {
    for (const fx of [0.02, 0.25, 0.5, 0.75, 0.98]) {
      for (const fz of [0.02, 0.25, 0.5, 0.75, 0.98]) {
        const point = {
          x: area.minX + (area.maxX - area.minX) * fx,
          z: area.minZ + (area.maxZ - area.minZ) * fz,
        };
        points.set(`${point.x},${point.z}`, point);
      }
    }
  }
  for (const point of [{x:46.1,z:-17.7}, {x:26.4,z:-5.9}, {x:3.3,z:-35.9}, {x:46.1,z:39}]) {
    points.set(`${point.x},${point.z}`, point);
  }
  return [...points.values()];
}

test('11 distinct destinations include all six conventional exits and four Shinkansen transfer gates', () => {
  assert.equal(ZONES.length, 11);
  assert.equal(zoneById.size, ZONES.length, 'Destination IDs must be unique');
  assert.deepEqual(ZONES.filter(zone => zone.kind === 'exit').map(zone => zone.id).sort(), [...conventionalExits].sort());
  assert.equal(ZONES.filter(zone => zone.kind === 'passage').length, 1);
  assert.equal(ZONES.filter(zone => zone.kind === 'transfer').length, 4);
  for (const id of conventionalExits) {
    const zone = zoneById.get(id);
    assert.equal(zone.group, 'general', `${id} must remain a conventional exit`);
    assert.equal(zone.side, id.startsWith('yaesu-') ? 'east' : 'west');
  }
});

test('JR East 20–23 and Tokaido/Sanyo 14–19 remain separate in gate data and user-facing labels', () => {
  assert.equal(GROUPS.east.operator, 'JR東日本');
  assert.equal(GROUPS.east.platforms, '20〜23番線');
  assert.equal(GROUPS.tokaido.operator, 'JR東海');
  assert.equal(GROUPS.tokaido.platforms, '14〜19番線');
  for (const id of eastGates) {
    const zone = zoneById.get(id);
    assert.equal(zone.group, 'east');
    assert.match(zone.body, /20〜23番線/);
    assert.match(zoneLabel(zone), /北陸ほか/);
    assert.doesNotMatch(zone.body, /14〜19番線/);
  }
  for (const id of tokaidoGates) {
    const zone = zoneById.get(id);
    assert.equal(zone.group, 'tokaido');
    assert.match(zone.body, /14〜19番線/);
    assert.match(zoneLabel(zone), /東海道・山陽/);
    assert.doesNotMatch(zone.body, /20〜23番線/);
  }
  // Both operators have a south transfer gate; their labels must still differ.
  assert.notEqual(zoneLabel(zoneById.get('jr-east-south')), zoneLabel(zoneById.get('tokaido-south')));
});

test('every destination and every graph link lies in the walkable station', () => {
  for (const zone of ZONES) assert.ok(insideWalkArea(zone.x, zone.z), `${zone.id} is inaccessible`);
  for (const node of NODES) {
    assert.ok(insideWalkArea(node.x, node.z), `${node.id} is outside the station`);
    for (const id of node.links) {
      const other = NODES.find(candidate => candidate.id === id);
      assert.ok(other, `${node.id} links to missing node ${id}`);
      assert.ok(other.links.includes(node.id), `${node.id} -> ${id} must be traversable both ways`);
      sampleSegment(node, other, point => insideWalkArea(point.x, point.z), `Graph ${node.id} -> ${id}`);
    }
  }
});

test('guided routes between every pair of destinations stay inside walkable corridors', () => {
  for (const from of ZONES) for (const to of ZONES) assertWalkableRoute(from, to);
});

test('guides can start at off-axis positions without cutting through non-walkable gaps', () => {
  for (const from of arbitraryStarts()) for (const to of ZONES) assertWalkableRoute(from, to);
});

function makeCanvas() {
  const canvas = { width: 0, height: 0, style: {} };
  const gradient = { addColorStop() {} };
  const context = new Proxy({
    canvas,
    measureText: text => ({width: String(text).length * 16}),
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
    createPattern: () => ({}),
    getImageData: () => ({data: new Uint8ClampedArray(canvas.width * canvas.height * 4)}),
  }, { get(target, key) { return key in target ? target[key] : () => {}; } });
  canvas.getContext = () => context;
  return canvas;
}

test('scene geometry leaves each zone and all guided graph segments clear for the player', {
  skip: process.env.CHECK_SCENE !== '1' ? 'Set CHECK_SCENE=1 once the scene rebuild is ready' : false,
}, async t => {
  const previousDocument = globalThis.document;
  globalThis.document = {createElement: tag => {
    assert.equal(tag, 'canvas', 'Scene stub only supports procedural canvas assets');
    return makeCanvas();
  }};
  let station;
  try {
    const {createStationScene} = await import('../dist/scene.js');
    station = createStationScene();
    assert.deepEqual(station.zones.map(zone => zone.id), ZONES.map(zone => zone.id), 'Scene and navigation must expose the same destinations');
    const radius = 0.27;
    const free = point => insideWalkArea(point.x, point.z) && !station.colliders.some(box =>
      point.x > box.minX - radius && point.x < box.maxX + radius &&
      point.z > box.minZ - radius && point.z < box.maxZ + radius);
    for (const zone of ZONES) assert.ok(free(zone), `Scene collider blocks ${zone.id}`);
    const options = {check: free, routeAllowed: (x, z) => free({x, z})};
    for (const from of ZONES) for (const to of ZONES) assertWalkableRoute(from, to, options);
    let routed = 0, unavailable = 0;
    for (const from of arbitraryStarts().filter(free)) for (const to of ZONES) {
      // An explicit unavailable route lets the app ask the walker to move into
      // the passage; a path through a ticket gate post must never be offered.
      if (assertWalkableRoute(from, to, {...options, allowUnavailable: true})) routed++;
      else unavailable++;
    }
    t.diagnostic(`${routed} arbitrary physical routes clear; ${unavailable} explicitly unavailable`);
  } finally {
    station?.dispose?.();
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});
