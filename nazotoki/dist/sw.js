const CACHE='tokyo-station-game-series-audit-v3';
const FILES=['./game/promise-evidence.js?v=audit3','./game/promise-evidence.css?v=audit3','./game/promise.js?v=audit3','./game/promise-state.js?v=audit3','./game/promise.css?v=audit3','./game/photograph.js?v=audit3','./game/photograph-state.js?v=audit3','./game/photograph-camera.js?v=audit3','./game/photograph.css?v=audit3','./game/episodes.js?v=audit3','./game/episodes.css?v=audit3','./game/farewell.js?v=audit3','./game/farewell-state.js?v=audit3','./game/farewell.css?v=audit3','./game/photos/driving-wheels.jpg','./game/photos/station-postbox.jpg','./game/photos/square-zero.jpg','./game/photos/silver-bell.jpg','./game/ticket-session.js?v=audit3','./game/mobile-hud.css?v=hud2','./game/shoulder-camera.js?v=shoulder1','./game/avatar.css?v=avatar1','./game/avatar-catalog.js?v=avatar1','./game/avatar-layer.js?v=shoulder1','./game/avatars/block-person.glb','./game/avatars/block-person-blue.glb','./game/avatars/block-person-green.glb','./game/avatars/block-person-yellow.glb','./game/avatars/portraits.png','./vendor/avatar/GLTFLoader.js','./vendor/avatar/BufferGeometryUtils.js','./game/ticket.js?v=audit3','./game/ticket-state.js?v=audit3','./game/ticket.css?v=avatar1','./','./index.html','./style.css','./guide-ui.css?v=game1','./app.js?v=audit3','./scene.js?v=game1','./station-layout.js?v=game1','./station-map.js?v=game1','./floor-layout.js?v=game1','./building-scene.js?v=game1','./train-data.js?v=game1','./train-scene.js?v=game1','./station-guide-data.js?v=game1','./gate-visuals.js?v=game1','./landmarks.js?v=game1','./landmark-scene.js?v=game1','./vendor/three.module.js','./icon.svg','./icon-180.png','./icon-192.png','./icon-512.png','./manifest.webmanifest','./game/studio.css?v=game1','./game/content.js?v=game1','./game/state.js?v=game1','./game/characters.js?v=game1','./game/addon.js?v=audit3'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES.map(path=>new Request(path,{cache:'reload'})))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('tokyo-station-game-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))});
async function offlineResponse(request){
  const hit=await caches.match(request);
  if(hit)return hit;
  // A first offline visit to /play?episode=N needs the same cached game shell.
  // Keep the requested URL so its episode and saved progress are still used.
  if(request.mode==='navigate'){
    const shell=await caches.match(new URL('./index.html',self.location.href));
    if(shell)return shell;
  }
  return new Response('オフラインで利用するには、初回にオンラインで開いてください。',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
}
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(url.pathname.startsWith('/api/'))return;
  if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
  event.respondWith(fetch(event.request,{cache:'no-cache'}).then(response=>{
    if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}
    return response;
  }).catch(()=>offlineResponse(event.request)));
});
