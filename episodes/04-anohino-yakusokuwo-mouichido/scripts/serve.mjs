import * as fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:http';
const PROJECT_ROOT=fileURLToPath(new URL("../",import.meta.url));
function serveStatic(){
  const metadata=JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT,'episode.json'),'utf8'));
  const args=process.argv.slice(2),portIndex=args.indexOf('--port');
  const port=Number(portIndex>=0?args[portIndex+1]:process.env.PORT||metadata.port);
  if(!Number.isInteger(port)||port<1||port>65535)throw new Error('ポートは1〜65535で指定してください。');
  const root=path.join(PROJECT_ROOT,'dist');
  const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.glb':'model/gltf-binary','.txt':'text/plain; charset=utf-8','.md':'text/plain; charset=utf-8'};
  const server=createServer((request,response)=>{
    if(!['GET','HEAD'].includes(request.method)){response.writeHead(405,{'Allow':'GET, HEAD'});response.end();return;}
    let pathname;
    try{pathname=decodeURIComponent(new URL(request.url,'http://127.0.0.1').pathname);}catch{response.writeHead(400);response.end('Bad request');return;}
    if(['/', '/play', '/play.html'].includes(pathname))pathname='/index.html';
    const file=path.resolve(root,'.'+pathname);
    if(file!==root&&!file.startsWith(root+path.sep)){response.writeHead(403);response.end('Forbidden');return;}
    let stat;try{stat=fs.statSync(file);}catch{response.writeHead(404);response.end('Not found');return;}
    if(!stat.isFile()){response.writeHead(404);response.end('Not found');return;}
    response.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Content-Length':stat.size,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    if(request.method==='HEAD')response.end();else fs.createReadStream(file).on('error',()=>response.destroy()).pipe(response);
  });
  server.on('error',error=>{console.error(error.message);process.exitCode=1;});
  server.listen(port,'127.0.0.1',()=>console.log(metadata.title+'\nLocal: http://127.0.0.1:'+port+'/'));
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>server.close(()=>process.exit(0)));
}
serveStatic();
