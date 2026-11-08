import {redirect} from 'next/navigation';
export default async function Home({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const params=await searchParams;const query=new URLSearchParams();
 if(typeof params.room==="string"&&params.room)query.set("room",params.room);
 else if(params.episode)query.set("episode","1");
 redirect("/play.html"+(query.size?"?"+query.toString():""));
}
