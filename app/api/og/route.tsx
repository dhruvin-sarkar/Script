import { ImageResponse } from '@vercel/og';

export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title') ?? 'Script';
  const subtitle =
    searchParams.get('subtitle') ?? 'The developer platform for logging, learning, and connecting.';

  return new ImageResponse(
    <div
      style={{
        width: '1200px',
        height: '630px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background:
          'linear-gradient(135deg, rgba(124,106,247,0.95), rgba(14,14,16,1) 55%, rgba(24,24,27,1))',
        color: 'white',
        padding: '64px',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ fontSize: 72, fontWeight: 800, fontFamily: 'monospace' }}>{'</>'}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1 }}>{title}</div>
        <div style={{ fontSize: 28, opacity: 0.84 }}>{subtitle}</div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
    },
  );
}
