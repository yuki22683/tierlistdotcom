import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return new NextResponse('Missing URL', { status: 400 });
  }

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch upstream image');

    const blob = await response.blob();
    const headers = new Headers();
    headers.set('Content-Type', blob.type || 'image/jpeg');
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    return new NextResponse(blob, { headers });
  } catch (error) {
    console.error('Proxy error:', error);
    return new NextResponse('Failed to fetch image', { status: 500 });
  }
}
