import { type NextRequest, NextResponse } from 'next/server';
import { calculateAvailableSlots } from '@/lib/booking-engine';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const serviceId = searchParams.get('serviceId');
    const date = searchParams.get('date');
    const locationId = searchParams.get('locationId') || undefined;
    const staffId = searchParams.get('staffId') || undefined;

    if (!businessId || !serviceId || !date) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required query parameters: businessId, serviceId, date',
        },
        { status: 400 }
      );
    }

    const slots = await calculateAvailableSlots({
      businessId,
      serviceId,
      date,
      locationId,
      staffId,
    });

    return NextResponse.json({
      success: true,
      count: slots.length,
      slots,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON request body' },
        { status: 400 }
      );
    }

    const { businessId, serviceId, date, locationId, staffId } = body;

    if (!businessId || !serviceId || !date) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: businessId, serviceId, date',
        },
        { status: 400 }
      );
    }

    const slots = await calculateAvailableSlots({
      businessId,
      serviceId,
      date,
      locationId,
      staffId,
    });

    return NextResponse.json({
      success: true,
      count: slots.length,
      slots,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
