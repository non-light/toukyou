import vinext from 'vinext';
import {defineConfig} from 'vite';
import {configureToolEnvironment} from './scripts/tool-environment.mjs';
export default defineConfig(async()=>{
 configureToolEnvironment(process.cwd());
 const {cloudflare}=await import('@cloudflare/vite-plugin');
 return {server:{host:"127.0.0.1",...(process.env.CODEX_SANDBOX==="seatbelt"?{watch:{useFsEvents:false,usePolling:true}}:{})},plugins:[
  vinext(),
  cloudflare({viteEnvironment:{name:"rsc",childEnvironments:["ssr"]},inspectorPort:false,config:{
   name:"tokyo-station-episode-01",main:"./worker/index.ts",compatibility_date:"2026-05-15",compatibility_flags:["nodejs_compat"],
   d1_databases:[{binding:"DB",database_name:"tokyo-station-episode-01-local",database_id:"00000000-0000-4000-8000-000000000000",migrations_dir:"./drizzle"}]
  }})
 ]};
});
