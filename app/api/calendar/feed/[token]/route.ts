import { NextRequest, NextResponse } from 'next/server';
import { resolveFeedToken, generateIcsFeed } from '@/lib/calendar-feed-engine';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface RouteProps {
  params: Promise<{ token: string }>;
}

export async function GET(
  _request: NextRequest,
  props: RouteProps
): Promise<NextResponse> {
  try {
    const { token } = await props.params;

    if (!token) {
      return new NextResponse('Calendar feed token is required.', {
        status: 400,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const context = await resolveFeedToken(token);

    if (!context) {
      return new NextResponse('Calendar feed not found or invalid feed token.', {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const icsContent = await generateIcsFeed(context);

    const safeFilename =
      context.scope === 'staff'
        ? `schedule-${context.staffName ? context.staffName.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'staff'}.ics`
        : `schedule-${context.businessName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.ics`;

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `inline; filename="${safeFilename}"`,
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal calendar feed generation error.';
    return new NextResponse(`Error generating calendar feed: ${message}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
