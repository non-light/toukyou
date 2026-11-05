export const AVATARS=Object.freeze([
  Object.freeze({id:'red',name:'赤の旅人',color:'#ec806c',file:'block-person.glb',portrait:0}),
  Object.freeze({id:'blue',name:'青の旅人',color:'#4a8bda',file:'block-person-blue.glb',portrait:1}),
  Object.freeze({id:'green',name:'緑の旅人',color:'#59a77c',file:'block-person-green.glb',portrait:3}),
  Object.freeze({id:'yellow',name:'黄の旅人',color:'#f2c84b',file:'block-person-yellow.glb',portrait:2}),
]);
export const avatarById=id=>AVATARS.find(avatar=>avatar.id===id)??AVATARS[0];
export function avatarIdFromColor(color){
  const legacy={'#d8ad62':'yellow','#87b7c4':'blue','#b7c491':'green','#d69d9b':'red'};
  return AVATARS.find(avatar=>avatar.color===color)?.id??legacy[color]??'red';
}
