import {env} from 'cloudflare:workers';
import {handleRooms} from '../../../../lib/rooms.mjs';

export async function POST(request: Request, context: {params: Promise<{parts: string[]}>}) {
  const {parts} = await context.params;
  return handleRooms(request, env.DB, parts);
}
