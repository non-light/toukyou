import {env} from 'cloudflare:workers';
import {handleRooms} from '../../../lib/rooms.mjs';

export async function POST(request: Request) {
  return handleRooms(request, env.DB, []);
}
