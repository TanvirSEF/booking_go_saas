'use server';

import Stripe from 'stripe';
import path from 'path';
import fs from 'fs/promises';
import { connectToDatabase } from '@/lib/db';
import { Coupon } from '@/models/Coupon';
import { Appointment } from '@/models/Appointment';
import type { IService } from '@/models/Service';
import type { IStaff } from '@/models/Staff';
import type { IBusiness } from '@/models/Business';
import type { AppliedCoupon } from '@/types/wizard';
import type { ConfirmedBookingDetails } from '@/components/wizard/booking-confirmation-dialog';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';

const stripe = new Stripe(stripeSecretKey);

export interface ValidateCouponInput {
  couponCode: string;
  originalPrice: number;
}

export interface ValidateCouponResult {
  valid: boolean;
  coupon?: AppliedCoupon;
  error?: string;
}

export async function validateAppointmentCouponAction(
  input: ValidateCouponInput
): Promise<ValidateCouponResult> {
  try {
    if (!input.couponCode || !input.couponCode.trim()) {
      return { valid: false, error: 'Please enter a coupon code.' };
    }

    const code = input.couponCode.trim().toUpperCase();
    const originalPrice = Number(input.originalPrice) || 0;

    await connectToDatabase();

    const coupon = await Coupon.findOne({
      code,
      isActive: true,
    }).lean();

    if (!coupon) {
      return { valid: false, error: 'Invalid or inactive promo code.' };
    }

    if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
      return { valid: false, error: 'This promo code has expired.' };
    }

    if (coupon.limit && coupon.limit > 0 && coupon.usedCount >= coupon.limit) {
      return { valid: false, error: 'This promo code has reached its usage limit.' };
    }

    if (coupon.minimumSpend && coupon.minimumSpend > 0 && originalPrice < coupon.minimumSpend) {
      return {
        valid: false,
        error: `Minimum booking amount of $${coupon.minimumSpend.toFixed(2)} required for this coupon.`,
      };
    }

    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = (originalPrice * coupon.discount) / 100;
      if (coupon.maximumSpend && coupon.maximumSpend > 0) {
        discountAmount = Math.min(discountAmount, coupon.maximumSpend);
      }
    } else {
      discountAmount = Math.min(originalPrice, coupon.discount);
    }

    discountAmount = Math.min(discountAmount, originalPrice);
    const finalPrice = Math.max(0, originalPrice - discountAmount);

    return {
      valid: true,
      coupon: {
        code: coupon.code,
        name: coupon.name,
        discountType: coupon.discountType as 'percentage' | 'flat',
        discountValue: coupon.discount,
        discountAmount: Number(discountAmount.toFixed(2)),
        finalPrice: Number(finalPrice.toFixed(2)),
      },
    };
  } catch (err) {
    console.error('validateAppointmentCouponAction error:', err);
    return { valid: false, error: 'Failed to validate coupon. Please try again.' };
  }
}

export async function createAppointmentStripeSessionAction(input: {
  appointmentId: string;
  couponCode?: string;
}): Promise<{ success: boolean; url?: string | null; error?: string }> {
  try {
    if (!stripeSecretKey) {
      return { success: false, error: 'Stripe is not configured in environment variables.' };
    }

    await connectToDatabase();
    const appointment = await Appointment.findById(input.appointmentId)
      .populate<{ serviceId: IService }>('serviceId')
      .populate<{ businessId: IBusiness }>('businessId')
      .lean();

    if (!appointment) {
      return { success: false, error: 'Appointment not found.' };
    }

    const business = appointment.businessId;
    const service = appointment.serviceId;

    let payableAmount = appointment.price || service?.price || 0;

    if (input.couponCode) {
      const couponRes = await validateAppointmentCouponAction({
        couponCode: input.couponCode,
        originalPrice: payableAmount,
      });
      if (couponRes.valid && couponRes.coupon) {
        payableAmount = couponRes.coupon.finalPrice;
      }
    }

    const currency = (business?.currency || 'USD').toLowerCase();
    const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const slug = business?.slug || 'booking';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: service?.name || 'Appointment Booking',
              description: `Appointment #${appointment.appointmentNumber} with ${business?.name || 'Service'}`,
            },
            unit_amount: Math.round(payableAmount * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_email: appointment.email,
      success_url: `${appUrl}/appointments/${slug}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/appointments/${slug}?payment=cancelled`,
      metadata: {
        appointmentId: String(appointment._id),
        businessSlug: slug,
      },
    });

    return { success: true, url: session.url };
  } catch (err: unknown) {
    console.error('createAppointmentStripeSessionAction error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create Stripe payment session.',
    };
  }
}

export async function verifyAppointmentStripePaymentAction(
  sessionId: string
): Promise<{ success: boolean; details?: ConfirmedBookingDetails; error?: string }> {
  try {
    if (!sessionId || !stripeSecretKey) {
      return { success: false, error: 'Invalid session or missing Stripe key.' };
    }

    await connectToDatabase();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return { success: false, error: 'Payment has not been completed.' };
    }

    const appointmentId = session.metadata?.appointmentId;
    if (!appointmentId) {
      return { success: false, error: 'Appointment ID not found in session metadata.' };
    }

    const updatedApt = await Appointment.findByIdAndUpdate(
      appointmentId,
      {
        paymentStatus: 'paid',
        paymentType: 'Stripe',
        appointmentStatus: 'confirmed',
        statusColor: '#27a93d',
      },
      { new: true }
    )
      .populate<{ serviceId: IService }>('serviceId')
      .populate<{ staffId: IStaff }>('staffId')
      .populate<{ businessId: IBusiness }>('businessId')
      .lean();

    if (!updatedApt) {
      return { success: false, error: 'Appointment not found in database.' };
    }

    const business = updatedApt.businessId;
    const service = updatedApt.serviceId;
    const staff = updatedApt.staffId;

    const details: ConfirmedBookingDetails = {
      appointmentNumber: updatedApt.appointmentNumber,
      businessSlug: business?.slug || '',
      businessName: business?.name || 'Company',
      serviceName: service?.name || 'Service',
      staffName: staff?.name || 'Any Specialist',
      locationName: 'Main Location',
      date: updatedApt.date,
      time: updatedApt.time,
      customerName: updatedApt.name,
      customerEmail: updatedApt.email,
      price: updatedApt.price || service?.price || 0,
      currencySymbol: business?.currency || '$',
    };

    return { success: true, details };
  } catch (err: unknown) {
    console.error('verifyAppointmentStripePaymentAction error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to verify Stripe payment.',
    };
  }
}

export async function uploadReceiptAction(
  formData: FormData
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const file = formData.get('file') as File | null;
    if (!file) {
      return { success: false, error: 'No file provided.' };
    }

    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: 'File size exceeds 5MB limit.' };
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedMimeTypes.includes(file.type)) {
      return { success: false, error: 'Only PNG, JPG, WEBP, and PDF files are allowed.' };
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'receipts');
    await fs.mkdir(uploadsDir, { recursive: true });

    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `receipt_${Date.now()}_${safeName}`;
    const filePath = path.join(uploadsDir, filename);

    await fs.writeFile(filePath, buffer);
    const publicUrl = `/uploads/receipts/${filename}`;

    return { success: true, url: publicUrl };
  } catch (err: unknown) {
    console.error('uploadReceiptAction error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to upload receipt.',
    };
  }
}

export async function submitBankTransferReceiptAction(input: {
  appointmentId: string;
  receiptUrl?: string;
  bankName?: string;
  transactionReference?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await connectToDatabase();
    const appointment = await Appointment.findById(input.appointmentId);
    if (!appointment) {
      return { success: false, error: 'Appointment not found.' };
    }

    appointment.paymentType = 'BankTransfer';
    appointment.paymentStatus = 'unpaid';
    appointment.appointmentStatus = 'pending';

    if (input.receiptUrl) {
      appointment.attachment = input.receiptUrl;
    }

    const bankNote = [
      input.bankName ? `Bank: ${input.bankName}` : '',
      input.transactionReference ? `Ref: ${input.transactionReference}` : '',
    ]
      .filter(Boolean)
      .join(', ');

    if (bankNote) {
      appointment.notes = appointment.notes
        ? `${appointment.notes} | Bank Transfer: ${bankNote}`
        : `Bank Transfer: ${bankNote}`;
    }

    await appointment.save();
    return { success: true };
  } catch (err: unknown) {
    console.error('submitBankTransferReceiptAction error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to submit bank transfer details.',
    };
  }
}
