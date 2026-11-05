import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

export function assertGameProject(hosting, protection) {
  const selected=hosting?.project_id;
  if (!selected || selected===protection?.original?.project_id) throw new Error('オリジナル保存版への公開を停止しました。ゲーム制作版の保存先を使用してください。');
  if (selected!==protection?.development?.project_id) throw new Error('ゲーム制作版の公開先が登録内容と一致しません。');
  return true;
}
if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const root=new URL('../',import.meta.url);
  const hosting=JSON.parse(readFileSync(new URL('.openai/hosting.json',root),'utf8'));
  const protection=JSON.parse(readFileSync(new URL('protected-original.json',root),'utf8'));
  assertGameProject(hosting,protection);
  const protectedMap=JSON.parse(readFileSync(new URL('protected-map.json',root),'utf8'));
  for(const [path,expected] of Object.entries(protectedMap.sha256)){
    const actual=createHash('sha256').update(readFileSync(new URL(path,root))).digest('hex');
    if(actual!==expected)throw new Error('元の駅データが変更されています。公開を停止しました: '+path);
  }
  process.stdout.write('公開先の確認: ゲーム制作版 / オリジナルへの上書きを防止\n');
  process.stdout.write('駅の形・階・通路・電車・目印・地図: 変更なし\n');
}
