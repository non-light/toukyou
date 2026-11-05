import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: '時をこえた一通 — 東京駅のふしぎな切符',
  description: '古い切符で昔の案内を読み解く、1〜4人のやさしい東京駅の謎解き。',
};
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return <html lang="ja"><body>{children}</body></html>;
}
