import { ImageResponse } from 'next/og';
import { type NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Business } from '@/models/Business';
import { Service } from '@/models/Service';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

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
            <div style={{ fontSize: 60, fontWeight: 'bold' }}>BookingGo</div>
            <div style={{ fontSize: 28, color: '#94a3b8', marginTop: 16 }}>
              Online Appointment & Scheduling Platform
            </div>
          </div>
        ),
        { width: 1200, height: 630 }
      );
    }

    await connectToDatabase();
    const business = await Business.findOne({ slug }).lean();

    if (!business) {
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
            <div style={{ fontSize: 50, fontWeight: 'bold' }}>Business Not Found</div>
            <div style={{ fontSize: 24, color: '#94a3b8', marginTop: 16 }}>
              bookinggo.app/appointments/{slug}
            </div>
          </div>
        ),
        { width: 1200, height: 630 }
      );
    }

    const serviceCount = await Service.countDocuments({
      businessId: business._id,
      isActive: true,
    });

    const primaryColor = business.themeColor || '#6366f1';
    const currency = business.currencySymbol || '$';

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            backgroundColor: '#0b0f19',
            backgroundImage: `radial-gradient(circle at 10% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(33, 201, 176, 0.15) 0%, transparent 40%)`,
            color: '#ffffff',
            padding: 70,
            fontFamily: 'sans-serif',
          }}
        >
          {/* Top Bar: Brand Pill & Verified Badge */}
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
                gap: 12,
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                padding: '10px 22px',
                borderRadius: 9999,
                border: '1px solid rgba(255, 255, 255, 0.12)',
              }}
            >
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: '#22c55e',
                }}
              />
              <span style={{ fontSize: 20, color: '#e2e8f0', fontWeight: 600 }}>
                Online Scheduling Live
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                fontSize: 22,
                color: '#94a3b8',
                fontWeight: 500,
              }}
            >
              Powered by <span style={{ color: '#ffffff', fontWeight: 700, marginLeft: 6 }}>BookingGo</span>
            </div>
          </div>

          {/* Main Title & Description */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              style={{
                fontSize: 64,
                fontWeight: 800,
                color: '#ffffff',
                lineHeight: 1.15,
                letterSpacing: '-0.02em',
                maxWidth: 950,
              }}
            >
              {business.name}
            </div>
            <div
              style={{
                fontSize: 28,
                color: '#94a3b8',
                lineHeight: 1.4,
                maxWidth: 900,
              }}
            >
              {business.seo?.metaDescription ||
                `Book your service online instantly. Professional appointments with instant confirmation.`}
            </div>
          </div>

          {/* Bottom Card Footer with KPIs */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: 30,
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div style={{ display: 'flex', gap: 40, alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 18, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Available Services
                </span>
                <span style={{ fontSize: 32, fontWeight: 700, color: '#ffffff' }}>
                  {serviceCount > 0 ? `${serviceCount}+ Services` : 'Custom Bookings'}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 18, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Accepted Currency
                </span>
                <span style={{ fontSize: 32, fontWeight: 700, color: '#22c55e' }}>
                  {currency} {business.currency || 'USD'}
                </span>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: primaryColor,
                color: '#ffffff',
                padding: '16px 36px',
                borderRadius: 14,
                fontSize: 24,
                fontWeight: 700,
              }}
            >
              Book Now →
            </div>
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error generating preview';
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
