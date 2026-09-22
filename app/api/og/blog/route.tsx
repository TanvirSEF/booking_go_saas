import { ImageResponse } from 'next/og';
import { type NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Blog } from '@/models/Blog';
import { Business } from '@/models/Business';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const businessSlug = searchParams.get('business');

    if (!slug) {
      return new ImageResponse(
        (
          <div
            style={{
              height: '100%',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              fontFamily: 'sans-serif',
            }}
          >
            <div style={{ fontSize: 50, fontWeight: 'bold' }}>BookingGo Blog</div>
          </div>
        ),
        { width: 1200, height: 630 }
      );
    }

    await connectToDatabase();

    const business = businessSlug
      ? await Business.findOne({ slug: businessSlug }).lean()
      : null;

    const query: Record<string, unknown> = { slug };
    if (business) {
      query.businessId = business._id;
    }

    const post = await Blog.findOne(query).lean();

    if (!post) {
      return new ImageResponse(
        (
          <div
            style={{
              height: '100%',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              fontSize: 48,
              fontFamily: 'sans-serif',
            }}
          >
            Article Not Found
          </div>
        ),
        { width: 1200, height: 630 }
      );
    }

    const primaryColor = business?.themeColor || '#3b82f6';
    const category = post.category || 'Industry Insights';
    const businessName = business?.name || 'BookingGo';

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            backgroundColor: '#090d16',
            backgroundImage: `radial-gradient(circle at 80% 20%, rgba(59, 130, 246, 0.15) 0%, transparent 40%), radial-gradient(circle at 20% 80%, rgba(147, 51, 234, 0.15) 0%, transparent 40%)`,
            color: '#ffffff',
            padding: 70,
            fontFamily: 'sans-serif',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                color: '#60a5fa',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                padding: '8px 20px',
                borderRadius: 9999,
                fontSize: 20,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {category}
            </div>

            <div style={{ fontSize: 22, color: '#94a3b8', fontWeight: 500 }}>
              {businessName} Blog
            </div>
          </div>

          {/* Article Title & Summary */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div
              style={{
                fontSize: 56,
                fontWeight: 800,
                color: '#ffffff',
                lineHeight: 1.2,
                maxWidth: 1000,
              }}
            >
              {post.title}
            </div>
            {post.summary && (
              <div
                style={{
                  fontSize: 26,
                  color: '#94a3b8',
                  lineHeight: 1.4,
                  maxWidth: 950,
                }}
              >
                {post.summary}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: 30,
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: primaryColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 22,
                }}
              >
                {businessName.charAt(0)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 22, fontWeight: 600, color: '#ffffff' }}>
                  {businessName}
                </span>
                <span style={{ fontSize: 16, color: '#64748b' }}>
                  Official Blog
                </span>
              </div>
            </div>

            <div style={{ fontSize: 20, color: '#94a3b8', fontWeight: 500 }}>
              Read Article →
            </div>
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error generating blog preview';
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0f172a',
            color: '#ef4444',
            fontSize: 32,
            fontFamily: 'sans-serif',
          }}
        >
          {message}
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }
}
