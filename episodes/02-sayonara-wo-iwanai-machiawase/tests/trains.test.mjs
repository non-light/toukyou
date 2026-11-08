import test, {before, after} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {TRAIN_SERVICES} from '../dist/train-data.js';
import {FLOORS, FLOOR_AREAS, FLOOR_ZONES, insideFloor} from '../dist/floor-layout.js';

const platforms = FLOOR_ZONES.filter(zone => zone.kind === 'platform');
const byZone = new Map(platforms.map(zone => [zone.id, zone]));
const services = new Map(TRAIN_SERVICES.map(service => [service.id, service]));
const sceneChecks = process.env.CHECK_BUILDING_SCENE === '1';
const sceneOptions = {skip: sceneChecks ? false : 'Set CHECK_BUILDING_SCENE=1 for train geometry and platform checks'};
let building, previousDocument;

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

before(async () => {
  if (!sceneChecks) return;
  previousDocument = globalThis.document;
  globalThis.document = {createElement: tag => {
    assert.equal(tag, 'canvas');
    return makeCanvas();
  }};
  const {createBuildingScene} = await import('../dist/building-scene.js');
  building = createBuildingScene();
  building.scene.updateMatrixWorld(true);
});

after(() => {
  if (!sceneChecks) return;
  building?.dispose?.();
  if (previousDocument === undefined) delete globalThis.document;
  else globalThis.document = previousDocument;
});

function allowed(x, z, floor) {
  const radius = .27;
  return insideFloor(x, z, floor) && !(building.collidersByFloor[floor] ?? []).some(box =>
    x > box.minX - radius && x < box.maxX + radius &&
    z > box.minZ - radius && z < box.maxZ + radius);
}

function overlaps(a, b) {
  const tolerance = 1e-6;
  return a.maxX > b.minX + tolerance && a.minX < b.maxX - tolerance &&
    a.maxZ > b.minZ + tolerance && a.minZ < b.maxZ - tolerance;
}

function actualBounds(train) {
  const box = new THREE.Box3().setFromObject(train.group);
  assert.ok(!box.isEmpty(), `${train.id} must contain rendered train geometry`);
  return {minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z};
}

test('representative trains cover every platform and preserve their railway, floor, and platform number', () => {
  assert.equal(platforms.length, 14);
  assert.equal(services.size, TRAIN_SERVICES.length, 'Train service IDs must be unique');
  assert.deepEqual([...new Set(TRAIN_SERVICES.map(service => service.zoneId))].sort(), [...byZone.keys()].sort());
  for (const service of TRAIN_SERVICES) {
    const zone = byZone.get(service.zoneId);
    assert.ok(zone, `${service.id} must refer to a platform`);
    assert.equal(service.floor, zone.floor, `${service.id} is assigned to the wrong floor`);
    assert.equal(service.group, zone.group, `${service.id} is assigned to the wrong railway`);
    assert.ok(zone.title.includes(service.platformLabel), `${service.id} must keep its actual model-platform number label`);
    assert.ok(service.label && service.model && service.style);
    assert.ok(Number.isInteger(service.cars) && service.cars > 0);
  }
});

test('JR East Shinkansen, Tokaido/Sanyo, Keiyo, and Sobu representatives stay distinct', () => {
  const east = TRAIN_SERVICES.filter(service => service.group === 'east');
  const tokaido = TRAIN_SERVICES.filter(service => service.group === 'tokaido');
  assert.equal(east.length, 2);
  assert.equal(tokaido.length, 3);
  assert.deepEqual(new Set(east.map(service => service.model)), new Set(['E5系', 'E7系']));
  for (const service of east) {
    assert.equal(service.floor, '2F');
    assert.match(service.platformLabel, /20・21|22・23/);
    assert.notEqual(service.model, 'N700系');
  }
  for (const service of tokaido) {
    assert.equal(service.model, 'N700系');
    assert.equal(service.floor, '2F');
    assert.match(service.platformLabel, /14・15|16・17|18・19/);
  }
  for (const service of TRAIN_SERVICES.filter(service => service.group === 'keiyo')) assert.equal(service.floor, 'B4F');
  for (const service of TRAIN_SERVICES.filter(service => service.group === 'sobu')) assert.equal(service.floor, 'B5F');
});

test('each platform contains a real train on its own floor, with correct service metadata', sceneOptions, () => {
  assert.ok(Array.isArray(building.trains));
  assert.deepEqual(building.trainServices, TRAIN_SERVICES);
  assert.equal(new Set(building.trains.map(train => train.id)).size, building.trains.length);
  for (const platform of platforms) assert.ok(building.trains.some(train => train.zoneId === platform.id), `${platform.id} has no train`);
  for (const train of building.trains) {
    const service = services.get(train.serviceId);
    assert.ok(service, `${train.id} refers to an unknown train service`);
    for (const field of ['zoneId', 'floor', 'model', 'label', 'platformLabel', 'cars']) assert.equal(train[field], service[field], `${train.id} has inconsistent ${field}`);
    assert.ok(train.group?.isGroup, `${train.id} must expose its rendered THREE.Group`);
    assert.equal(building.floorGroups[train.floor].getObjectById(train.group.id), train.group, `${train.id} must belong to its own floor layer`);
    let meshes = 0;
    train.group.traverse(object => {if (object.isMesh) meshes++;});
    assert.ok(meshes > 0, `${train.id} must contain visible geometry`);
    const level = FLOORS.find(floor => floor.id === train.floor).elevation;
    const worldBox = new THREE.Box3().setFromObject(train.group);
    assert.ok(worldBox.min.y >= level - .2 && worldBox.max.y <= level + 3.8, `${train.id} must sit on its floor's rails`);
    building.setFloor(train.floor);
    for (let object = train.group; object; object = object.parent) assert.equal(object.visible, true, `${train.id} must be visible on its active floor`);
    const zone = byZone.get(train.zoneId);
    assert.ok(allowed(service.viewX, service.viewZ, train.floor), `${train.id} must have a clear viewing position`);
    const direction = new THREE.Vector3(-Math.sin(service.viewYaw), 0, -Math.cos(service.viewYaw));
    const ray = new THREE.Raycaster(new THREE.Vector3(service.viewX, level + 1.65, service.viewZ), direction, .12, 120);
    assert.ok(ray.intersectObject(train.group, true).length > 0, `${train.id} must be visible from the chosen platform viewing direction`);

    const bounds = actualBounds(train);
    const width = bounds.maxX - bounds.minX, depth = bounds.maxZ - bounds.minZ;
    if (train.orientation === 'ns') assert.ok(depth > width * 3);
    else {
      assert.equal(train.orientation, 'ew');
      assert.ok(width > depth * 3);
    }
    for (const field of ['minX', 'maxX', 'minZ', 'maxZ']) assert.ok(Math.abs(train.bounds[field] - bounds[field]) < 1e-3, `${train.id} declared ${field} must match actual geometry`);
  }
});

test('actual train geometry never enters any walking island or another train', sceneOptions, () => {
  const trains = building.trains.map(train => ({...train, actual: actualBounds(train)}));
  for (const train of trains) {
    for (const area of FLOOR_AREAS[train.floor]) assert.equal(overlaps(train.actual, area), false, `${train.id} intrudes into a walking island on ${train.floor}`);
  }
  for (let i = 0; i < trains.length; i++) for (let j = i + 1; j < trains.length; j++) {
    if (trains[i].floor === trains[j].floor) assert.equal(overlaps(trains[i].actual, trains[j].actual), false, `${trains[i].id} and ${trains[j].id} overlap`);
  }
});

test('platform edges and tracks remain inaccessible while platform centers stay walkable', sceneOptions, () => {
  for (const zone of platforms) {
    const area = FLOOR_AREAS[zone.floor].find(a => zone.x >= a.minX && zone.x <= a.maxX && zone.z >= a.minZ && zone.z <= a.maxZ);
    const centerX = (area.minX + area.maxX) / 2, centerZ = (area.minZ + area.maxZ) / 2;
    assert.equal(allowed(zone.x, zone.z, zone.floor), true, `${zone.id} center must remain available for arrival`);
    for (const [x, z] of [[area.minX, centerZ], [area.maxX, centerZ], [centerX, area.minZ], [centerX, area.maxZ]]) {
      assert.equal(allowed(x, z, zone.floor), false, `${zone.id} edge must stop the walker`);
    }
    const tracks = area.maxZ - area.minZ > area.maxX - area.minX ?
      [[area.minX - 2.1, centerZ], [area.maxX + 2.1, centerZ]] :
      [[centerX, area.minZ - 2.1], [centerX, area.maxZ + 2.1]];
    for (const [x, z] of tracks) assert.equal(allowed(x, z, zone.floor), false, `${zone.id} adjacent track must not become walkable`);
  }
});

test('the reported platform canopy supports block walkers on all three platform floors', sceneOptions, () => {
  for (const point of [
    {floor: '2F', x: -36.3, z: -34},
    {floor: 'B4F', x: -19, z: 291.5},
    {floor: 'B5F', x: -58.3, z: -30},
  ]) assert.equal(allowed(point.x, point.z, point.floor), false, `The canopy support at ${JSON.stringify(point)} must not be passable`);
});

test('stopped representative trains do not move when the scene updates or floors switch', sceneOptions, () => {
  const transforms = building.trains.map(train => ({id: train.id, position: train.group.position.toArray(), rotation: train.group.rotation.toArray(), scale: train.group.scale.toArray()}));
  for (const floor of FLOORS) {
    building.setFloor(floor.id);
    building.update(120, .05);
  }
  for (let i = 0; i < building.trains.length; i++) {
    const train = building.trains[i], before = transforms[i];
    assert.equal(train.id, before.id);
    assert.deepEqual(train.group.position.toArray(), before.position);
    assert.deepEqual(train.group.rotation.toArray(), before.rotation);
    assert.deepEqual(train.group.scale.toArray(), before.scale);
  }
});
