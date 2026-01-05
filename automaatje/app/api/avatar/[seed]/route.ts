import { NextRequest, NextResponse } from 'next/server';
import { generateAvatarSvg } from '@/lib/avatar';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ seed: string }> }
) {
  try {
    const { seed } = await params;

    if (!seed) {
      return new NextResponse('Seed is required', { status: 400 });
    }

    // Generate the SVG avatar
    const svg = generateAvatarSvg(seed);

    // Return the SVG with proper content type and caching headers
    return new NextResponse(svg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
      },
    });
  } catch (error) {
    console.error('Avatar generation error:', error);
    return new NextResponse('Failed to generate avatar', { status: 500 });
  }
}
