import { redirect } from 'next/navigation';

export default async function Home({searchParams}: {searchParams: Promise<Record<string, string | string[] | undefined>>}) {
  const params = await searchParams;
  const room = typeof params.room === 'string' ? params.room : '';
  redirect('/play.html' + (room ? '?room=' + encodeURIComponent(room) : ''));
}
