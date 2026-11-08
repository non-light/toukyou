import * as fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const PROJECT_ROOT=fileURLToPath(new URL("../",import.meta.url));
function buildStatic(){
  const output=path.join(PROJECT_ROOT,'build');
  fs.rmSync(output,{recursive:true,force:true});
  fs.cpSync(path.join(PROJECT_ROOT,'dist'),output,{recursive:true});
  console.log('単独公開用の静的ファイルを build/ に作成しました。');
}
buildStatic();
