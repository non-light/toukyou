import {sanitizeProgress} from './ticket-state.js?v=ticket1';

export async function requestRoom(path,data,fetcher=fetch){
  const response=await fetcher(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),cache:'no-store'});
  let value;
  try{value=await response.json();}catch{}
  if(!response.ok||!value||typeof value!=='object'){
    const error=new Error(value?.error??value?.message??'協力プレイに接続できませんでした。少し待って、もう一度お試しください。');
    error.status=response.status;error.code=value?.code;
    throw error;
  }
  return value;
}

export function roomSessionEnded(error){return error?.status===401||error?.status===404;}

export function recoveredProgress(shared,local){
  const a=sanitizeProgress(shared),b=sanitizeProgress(local);
  return {version:1,stage:Math.max(a.stage,b.stage),delivered:a.delivered||b.delivered};
}
