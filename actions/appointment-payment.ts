'use server';

import { Types } from 'mongoose';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { connectToDatabase } from '@/lib/db';
import { stripe, getStripeClient } from '@/lib/stripe';
import { Appointment } from '@/models/Appointment';
import { AppointmentPayment } from '@/models/AppointmentPayment';
import { Business } from '@/models/Business';
import { Service } from '@/models/Service';
import { Coupon } from '@/models/Coupon';
import type {
  ValidateCouponInput,
  ValidateCouponResponse,
  CreateAppointmentStripeSessionInput,
  StripeSessionResponse,
  VerifyStripePaymentResponse,
  SubmitBankTransferInput,
  SubmitBankTransferResponse,
  UploadReceiptResponse,
} from '@/types/appointment-payment';

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Outside Next.js request context
  }
}

/**
 * Validates a promotional coupon code against an appointment's price.
 */
export async function validateAppointmentCouponAction(
  input: ValidateCouponInput
): Promise<ValidateCouponResponse> {
  try {
    const { couponCode, originalPrice } = input;

    if (!couponCode || !couponCode.trim()) {
      return { success: false, error: 'Please enter a coupon code.' };
    }

    if (typeof originalPrice !== 'number' || originalPrice < 0) {
      return { success: false, error: 'Invalid original price.' };
    }

    await connectToDatabase();

    const cleanCode = couponCode.trim().toUpperCase();
    const coupon = await Coupon.findOne({ code: cleanCode, isActive: true });

    if (!coupon) {
      return { success: false, error: `Coupon code "${cleanCode}" is invalid.` };
    }

    if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
      return { success: false, error: `Coupon code "${cleanCode}" has expired.` };
    }

    if (coupon.limit > 0 && (coupon.usedCount || 0) >= coupon.limit) {
      return { success: false, error: `Coupon code "${cleanCode}" has reached its usage limit.` };
    }

    if (coupon.minimumSpend > 0 && originalPrice < coupon.minimumSpend) {
      return {
        success: false,
        error: `A minimum booking spend of $${coupon.minimumSpend} is required for this coupon.`,
      };
    }

    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = (originalPrice * coupon.discount) / 100;
      if (coupon.maximumSpend && coupon.maximumSpend > 0 && discountAmount > coupon.maximumSpend) {
        discountAmount = coupon.maximumSpend;
      }
    } else {
      discountAmount = Math.min(coupon.discount, originalPrice);
    }

    const finalPrice = Math.max(0, originalPrice - discountAmount);

    return {
      success: true,
      coupon: {
        couponId: String(coupon._id),
        couponCode: coupon.code,
        couponName: coupon.name,
        discountType: coupon.discountType,
        discount: coupon.discount,
        discountAmount: Number(discountAmount.toFixed(2)),
        finalPrice: Number(finalPrice.toFixed(2)),
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to validate coupon.';
    return { success: false, error: message };
  }
}

/**
 * Creates a Stripe Checkout Session for an appointment booking.
 */
export async function createAppointmentStripeSessionAction(
  input: CreateAppointmentStripeSessionInput
): Promise<StripeSessionResponse> {
  try {
    const { appointmentId, couponCode, successUrl, cancelUrl } = input;

    if (!appointmentId || !Types.ObjectId.isValid(appointmentId)) {
      return { success: false, error: 'Invalid appointment ID provided.' };
    }

    await connectToDatabase();

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return { success: false, error: 'Appointment not found.' };
    }

    if (appointment.paymentStatus === 'paid') {
      return { success: false, error: 'This appointment has already been paid.' };
    }

    const [business, service] = await Promise.all([
      Business.findById(appointment.businessId).lean(),
      Service.findById(appointment.serviceId).lean(),
    ]);

    if (!business) {
      return { success: false, error: 'Business organization not found.' };
    }

    const rawPrice = appointment.price || service?.price || 0;
    let finalPrice = rawPrice;
    let discountAmount = 0;
    let validCouponId: string | null = null;
    let cleanCouponCode = '';

    if (couponCode && couponCode.trim()) {
      const couponRes = await validateAppointmentCouponAction({
        couponCode,
        originalPrice: rawPrice,
      });

      if (couponRes.success && couponRes.coupon) {
        finalPrice = couponRes.coupon.finalPrice;
        discountAmount = couponRes.coupon.discountAmount;
        validCouponId = couponRes.coupon.couponId;
        cleanCouponCode = couponRes.coupon.couponCode;
      }
    }

    // Edge Case: 100% discount / Free appointment
    if (finalPrice <= 0) {
      appointment.paymentStatus = 'paid';
      appointment.appointmentStatus = 'Confirmed';
      appointment.paymentType = 'Stripe';
      appointment.notes = appointment.notes
        ? `${appointment.notes}\n[Promo: 100% Free Booking via Coupon ${cleanCouponCode}]`
        : `[Promo: 100% Free Booking via Coupon ${cleanCouponCode}]`;

      await appointment.save();

      await AppointmentPayment.create({
        appointmentId: appointment._id,
        companyId: appointment.companyId,
        businessId: appointment.businessId,
        paymentType: 'Promo',
        amount: rawPrice,
        discountAmount: discountAmount,
        finalAmount: 0,
        paymentDate: new Date(),
        txnId: `FREE-${Date.now()}`,
        status: 'completed',
      });

      if (validCouponId) {
        await Coupon.findByIdAndUpdate(validCouponId, { $inc: { usedCount: 1 } });
      }

      const redirectPath = `/appointments/${business.slug}?payment=success&free=true&appointmentNumber=${appointment.appointmentNumber}`;
      return { success: true, url: redirectPath };
    }

    const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const resolvedSuccessUrl =
      successUrl ||
      `${appUrl}/appointments/${business.slug}?payment=success&session_id={CHECKOUT_SESSION_ID}&appointmentNumber=${appointment.appointmentNumber}`;
    const resolvedCancelUrl =
      cancelUrl ||
      `${appUrl}/appointments/${business.slug}?payment=cancelled&appointmentNumber=${appointment.appointmentNumber}`;

    const stripeClient = await getStripeClient().catch(() => stripe);
    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: appointment.email,
      line_items: [
        {
          price_data: {
            currency: (business.currency || 'USD').toLowerCase(),
            product_data: {
              name: `${service?.name || 'Appointment'} - ${business.name}`,
              description: `Appointment #${appointment.appointmentNumber} on ${appointment.date} (${appointment.time})`,
            },
            unit_amount: Math.round(finalPrice * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: 'appointment',
        appointmentId: String(appointment._id),
        appointmentNumber: appointment.appointmentNumber,
        businessId: String(appointment.businessId),
        companyId: String(appointment.companyId),
        serviceId: String(appointment.serviceId),
        couponId: validCouponId || '',
        couponCode: cleanCouponCode || '',
        discountAmount: String(discountAmount),
        finalAmount: String(finalPrice),
      },
      success_url: resolvedSuccessUrl,
      cancel_url: resolvedCancelUrl,
    });

    return {
      success: true,
      url: session.url,
      sessionId: session.id,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to initiate Stripe checkout.';
    return { success: false, error: message };
  }
}

/**
 * Instantly verifies an appointment's Stripe payment session on client redirect,
 * providing zero-latency confirmation without waiting for webhook delivery.
 */
export async function verifyAppointmentStripePaymentAction(
  sessionId: string
): Promise<VerifyStripePaymentResponse> {
  try {
    if (!sessionId || !sessionId.trim()) {
      return { success: false, error: 'Session ID is required.' };
    }

    const stripeClient = await getStripeClient().catch(() => stripe);
    const session = await stripeClient.checkout.sessions.retrieve(sessionId.trim());
    if (!session) {
      return { success: false, error: 'Stripe session not found.' };
    }

    if (session.payment_status !== 'paid') {
      return { success: false, error: 'Payment is not completed yet.' };
    }

    const metadata = session.metadata || {};
    const appointmentId = metadata.appointmentId;

    if (!appointmentId || !Types.ObjectId.isValid(appointmentId)) {
      return { success: false, error: 'Invalid appointment reference in session metadata.' };
    }

    await connectToDatabase();

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return { success: false, error: 'Appointment record not found.' };
    }

    const paidAmount = session.amount_total ? session.amount_total / 100 : appointment.price;

    // Idempotent state update
    if (appointment.paymentStatus !== 'paid') {
      appointment.paymentStatus = 'paid';
      appointment.appointmentStatus = 'Confirmed';
      appointment.paymentType = 'Stripe';

      const timestamp = new Date().toLocaleString();
      const log = `[${timestamp}] Stripe payment confirmed (Txn: ${session.payment_intent || session.id})`;
      appointment.notes = appointment.notes ? `${appointment.notes}\n${log}` : log;
      await appointment.save();
    }

    // Idempotently record payment ledger entry
    const txnId = (session.payment_intent as string) || session.id;
    const existingPayment = await AppointmentPayment.findOne({
      $or: [{ txnId }, { appointmentId: appointment._id }],
    });

    if (existingPayment) {
      existingPayment.paymentType = 'Stripe';
      existingPayment.status = 'completed';
      existingPayment.finalAmount = paidAmount;
      existingPayment.discountAmount = Number(metadata.discountAmount || 0);
      existingPayment.txnId = txnId;
      existingPayment.receiptUrl = session.customer_details?.email || '';
      await existingPayment.save();
    } else {
      await AppointmentPayment.create({
        appointmentId: appointment._id,
        companyId: appointment.companyId,
        businessId: appointment.businessId,
        paymentType: 'Stripe',
        amount: appointment.price,
        discountAmount: Number(metadata.discountAmount || 0),
        finalAmount: paidAmount,
        paymentDate: new Date(),
        txnId,
        receiptUrl: session.customer_details?.email || '',
        status: 'completed',
      });
    }

    if (metadata.couponId) {
      await Coupon.findByIdAndUpdate(metadata.couponId, { $inc: { usedCount: 1 } });
    }

    return {
      success: true,
      appointmentNumber: appointment.appointmentNumber,
      paymentStatus: 'paid',
      amount: paidAmount,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to verify payment session.';
    return { success: false, error: message };
  }
}

/**
 * Uploads a bank transfer payment receipt / slip (JPG, PNG, WEBP, PDF up to 5MB).
 */
export async function uploadReceiptAction(
  formData: FormData
): Promise<UploadReceiptResponse> {
  try {
    const file = (formData.get('receipt') || formData.get('file')) as File | null;
    if (!file) {
      return { success: false, error: 'No receipt file provided.' };
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedMimeTypes.includes(file.type)) {
      return {
        success: false,
        error: 'Invalid file type. Please upload a JPG, PNG, WEBP image or PDF document.',
      };
    }

    const maxSizeBytes = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSizeBytes) {
      return { success: false, error: 'Receipt file size cannot exceed 5MB.' };
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const uniqueId = crypto.randomUUID().slice(0, 8);
    const filename = `receipt_${Date.now()}_${uniqueId}.${ext}`;

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'receipts');
    await fs.mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, filename);
    await fs.writeFile(filePath, buffer);

    const publicUrl = `/uploads/receipts/${filename}`;

    return {
      success: true,
      url: publicUrl,
      filename,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to upload receipt.';
    return { success: false, error: message };
  }
}

/**
 * Submits bank transfer details and payment proof for an appointment.
 */
export async function submitBankTransferReceiptAction(
  input: SubmitBankTransferInput
): Promise<SubmitBankTransferResponse> {
  try {
    const { appointmentId, receiptUrl, bankName, transactionReference, notes } = input;

    if (!appointmentId || !Types.ObjectId.isValid(appointmentId)) {
      return { success: false, error: 'Invalid appointment ID provided.' };
    }

    if (!receiptUrl || !receiptUrl.trim()) {
      return { success: false, error: 'Please provide a valid receipt upload URL.' };
    }

    await connectToDatabase();

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return { success: false, error: 'Appointment not found.' };
    }

    appointment.paymentType = 'BankTransfer';
    appointment.attachment = receiptUrl.trim();

    const timestamp = new Date().toLocaleString();
    const details = [
      `[${timestamp}] Bank Transfer Submitted`,
      bankName?.trim() ? `Bank: ${bankName.trim()}` : null,
      transactionReference?.trim() ? `Ref: ${transactionReference.trim()}` : null,
      notes?.trim() ? `Notes: ${notes.trim()}` : null,
    ]
      .filter(Boolean)
      .join(' | ');

    const updatedNotes = appointment.notes ? `${appointment.notes}\n${details}` : details;

    await Appointment.findByIdAndUpdate(appointmentId, {
      paymentType: 'BankTransfer',
      attachment: receiptUrl.trim(),
      notes: updatedNotes,
    });

    // Upsert pending payment record
    const txnId = transactionReference?.trim() || `BT-${Date.now()}`;
    const existingPayment = await AppointmentPayment.findOne({ appointmentId: appointment._id });

    if (existingPayment) {
      existingPayment.paymentType = 'BankTransfer';
      existingPayment.receiptUrl = receiptUrl.trim();
      existingPayment.txnId = txnId;
      existingPayment.status = 'pending';
      await existingPayment.save();
    } else {
      await AppointmentPayment.create({
        appointmentId: appointment._id,
        companyId: appointment.companyId,
        businessId: appointment.businessId,
        paymentType: 'BankTransfer',
        amount: appointment.price,
        discountAmount: 0,
        finalAmount: appointment.price,
        paymentDate: new Date(),
        txnId,
        receiptUrl: receiptUrl.trim(),
        status: 'pending',
      });
    }

    safeRevalidate('/customer');
    safeRevalidate(`/find-appointment/${appointment.appointmentNumber}`);

    return {
      success: true,
      appointmentNumber: appointment.appointmentNumber,
      message: 'Bank transfer proof submitted successfully. Pending business verification.',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to submit bank transfer.';
    return { success: false, error: message };
  }
}
