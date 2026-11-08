import { redirect } from 'next/navigation';

export default async function Home({searchParams}: {searchParams: Promise<Record<string, string | string[] | undefined>>}) {
  const params = await searchParams;
  const room = typeof params.room === 'string' ? params.room : '';
  const query = new URLSearchParams();
  if (room) query.set('room', room);
  else if (params.episode === '1' || params.episode === '2' || params.episode === '3' || params.episode === '4') query.set('episode', params.episode);
  redirect('/play.html' + (query.size ? '?' + query.toString() : ''));
}
