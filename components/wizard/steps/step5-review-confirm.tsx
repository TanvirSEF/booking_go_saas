'use client';

import React, { useState, useTransition } from 'react';
import { useWizard } from '@/components/wizard/wizard-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  BookingConfirmationDialog,
  type ConfirmedBookingDetails,
} from '@/components/wizard/booking-confirmation-dialog';
import { BankTransferUploader } from '@/components/wizard/bank-transfer-uploader';
import { createAppointment } from '@/actions/appointment';
import {
  validateAppointmentCouponAction,
  createAppointmentStripeSessionAction,
  submitBankTransferReceiptAction,
} from '@/actions/appointment-payment';
import {
  IconArrowLeft,
  IconCalendar,
  IconClock,
  IconUser,
  IconMapPin,
  IconShieldCheck,
  IconCreditCard,
  IconCash,
  IconBuildingBank,
  IconSparkles,
  IconTag,
  IconX,
  IconLoader2,
  IconCheck,
  IconCopy,
} from '@tabler/icons-react';
import { toast } from 'sonner';

export function Step5ReviewConfirm() {
  const {
    business,
    catalog,
    state,
    setStep,
    updatePaymentType,
    setAppliedCoupon,
    resetWizard,
  } = useWizard();

  const {
    selectedLocationId,
    selectedServiceId,
    selectedStaffId,
    selectedDate,
    selectedTimeSlot,
    customer,
    paymentType,
    appliedCoupon,
  } = state;

  const [isPending, startTransition] = useTransition();
  const [isCouponPending, setIsCouponPending] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);

  // Bank Transfer states
  const [receiptUrl, setReceiptUrl] = useState<string>('');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [bankNameInput, setBankNameInput] = useState<string>('');

  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [confirmationDetails, setConfirmationDetails] = useState<ConfirmedBookingDetails | null>(null);

  const [submitError, setSubmitError] = useState<string | null>(null);

  // Resolved metadata
  const selectedLocation = catalog.locations.find((loc) => loc.id === selectedLocationId);
  const selectedService = catalog.services.find((srv) => srv.id === selectedServiceId);
  const selectedStaff = catalog.staff.find((st) => st.id === selectedStaffId);

  const originalPrice = selectedService?.price || 0;
  const discountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const finalPayable = appliedCoupon ? appliedCoupon.finalPrice : originalPrice;

  // Format the date
  const formattedDate = (() => {
    if (!selectedDate) return 'Not selected';
    const parts = selectedDate.split('-');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const monthIndex = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const dateObj = new Date(year, monthIndex, day);
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }
    }
    return selectedDate;
  })();

  const handleApplyCoupon = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setCouponError(null);

    if (!couponInput.trim()) {
      setCouponError('Please enter a coupon code.');
      return;
    }

    try {
      setIsCouponPending(true);
      const res = await validateAppointmentCouponAction({
        couponCode: couponInput.trim(),
        originalPrice,
      });

      if (!res.valid || !res.coupon) {
        setCouponError(res.error || 'Invalid promo code.');
        setAppliedCoupon(null);
      } else {
        setAppliedCoupon(res.coupon);
        setCouponInput('');
        setCouponError(null);
      }
    } catch {
      setCouponError('Failed to validate promo code.');
    } finally {
      setIsCouponPending(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError(null);
    setCouponInput('');
  };

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const handleConfirmBooking = () => {
    if (!selectedService || !selectedLocation || !selectedDate || !selectedTimeSlot) {
      setSubmitError('Missing required booking details. Please go back and complete each step.');
      return;
    }

    setSubmitError(null);

    startTransition(async () => {
      try {
        const response = await createAppointment({
          businessId: business.id,
          serviceId: selectedService.id,
          staffId: selectedStaffId || '',
          locationId: selectedLocation.id,
          date: selectedDate,
          time: selectedTimeSlot.start,
          customerType: customer.customerType,
          name: customer.name,
          email: customer.email,
          contact: customer.contact,
          password: customer.password,
          gender: customer.gender,
          dob: customer.dob,
          notes: customer.notes,
          paymentType: paymentType,
        });

        if (response.success && response.appointmentId) {
          // Stripe checkout branch
          if (paymentType === 'Stripe') {
            const stripeRes = await createAppointmentStripeSessionAction({
              appointmentId: response.appointmentId,
              couponCode: appliedCoupon?.code,
            });

            if (stripeRes.success && stripeRes.url) {
              window.location.href = stripeRes.url;
              return;
            } else {
              setSubmitError(stripeRes.error || 'Failed to initialize Stripe checkout.');
              return;
            }
          }

          // Bank Transfer branch
          if (paymentType === 'BankTransfer') {
            if (receiptUrl || transactionRef) {
              await submitBankTransferReceiptAction({
                appointmentId: response.appointmentId,
                receiptUrl,
                bankName: bankNameInput,
                transactionReference: transactionRef,
              });
            }
          }

          setConfirmationDetails({
            appointmentNumber: response.appointmentId,
            serviceName: selectedService.name,
            staffName: selectedStaff ? selectedStaff.name : 'Any Specialist',
            locationName: selectedLocation.name,
            date: selectedDate,
            time: selectedTimeSlot.start,
            customerName: customer.name,
            customerEmail: customer.email,
            price: finalPayable,
            currencySymbol: business.currencySymbol || '$',
            businessName: business.name,
            businessSlug: business.slug,
          });
          setIsConfirmationOpen(true);
        } else {
          setSubmitError(response.error || 'Failed to place appointment. Please try again.');
        }
      } catch (err: unknown) {
        setSubmitError(err instanceof Error ? err.message : 'A fatal error occurred during booking.');
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <span>Review & Confirm</span>
          <IconSparkles size={20} className="text-primary" />
        </h2>
        <p className="text-xs text-muted-foreground">
          Double-check your appointment itinerary and payment details before finalizing.
        </p>
      </div>

      {submitError && (
        <div className="p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs">
          <p className="font-semibold">Unable to complete booking</p>
          <p className="mt-0.5">{submitError}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Itinerary Details (7 cols) */}
        <div className="lg:col-span-7 space-y-4 bg-card rounded-2xl border p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b">
            <div>
              <span className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider block">
                Selected Service
              </span>
              <h3 className="text-lg font-bold text-foreground mt-0.5">
                {selectedService?.name || 'Service not found'}
              </h3>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-muted-foreground block">Price</span>
              <span className="text-lg font-extrabold text-foreground">
                {business.currencySymbol || '$'}
                {selectedService?.price.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Key Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-muted/30 border border-border/50 space-y-1">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-semibold uppercase tracking-wider">
                <IconMapPin size={13} className="text-primary" />
                <span>Location</span>
              </span>
              <p className="font-semibold text-foreground">
                {selectedLocation?.name || 'Main Office'}
              </p>
              {selectedLocation?.address && (
                <p className="text-[11px] text-muted-foreground line-clamp-1">
                  {selectedLocation.address}
                </p>
              )}
            </div>

            <div className="p-3 rounded-xl bg-muted/30 border border-border/50 space-y-1">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-semibold uppercase tracking-wider">
                <IconUser size={13} className="text-primary" />
                <span>Specialist</span>
              </span>
              <p className="font-semibold text-foreground">
                {selectedStaff ? selectedStaff.name : 'Any Specialist (First Available)'}
              </p>
              <p className="text-[11px] text-muted-foreground">Assigned professional</p>
            </div>

            <div className="p-3 rounded-xl bg-muted/30 border border-border/50 space-y-1">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-semibold uppercase tracking-wider">
                <IconCalendar size={13} className="text-primary" />
                <span>Date</span>
              </span>
              <p className="font-semibold text-foreground">{formattedDate}</p>
              <p className="text-[11px] text-muted-foreground font-mono">{selectedDate}</p>
            </div>

            <div className="p-3 rounded-xl bg-muted/30 border border-border/50 space-y-1">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-semibold uppercase tracking-wider">
                <IconClock size={13} className="text-primary" />
                <span>Time & Duration</span>
              </span>
              <p className="font-semibold text-foreground font-mono">
                {selectedTimeSlot ? `${selectedTimeSlot.start} - ${selectedTimeSlot.end}` : '—'}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {selectedService?.durationMinutes} minutes session
              </p>
            </div>
          </div>

          <div className="pt-3 border-t text-xs space-y-2">
            <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider block">
              Customer Information
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">Name</span>
                <span className="font-medium text-foreground">{customer.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Email</span>
                <span className="font-medium text-foreground truncate block">{customer.email}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Phone</span>
                <span className="font-medium text-foreground">{customer.contact}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Account Type</span>
                <span className="font-medium text-foreground capitalize">
                  {customer.customerType.replace('-', ' ')}
                </span>
              </div>
            </div>
            {customer.notes && (
              <div className="mt-2 p-2.5 rounded-lg bg-muted/20 border text-[11px]">
                <span className="font-semibold text-foreground">Notes: </span>
                <span className="text-muted-foreground">{customer.notes}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Payment Method, Coupons & Total (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Payment Method Selector */}
          <div className="bg-card rounded-2xl border p-5 shadow-xs space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <IconCreditCard size={14} className="text-primary" />
              <span>Payment Method</span>
            </label>

            <div className="space-y-2">
              {/* Option A: Cash / Manual */}
              <button
                type="button"
                onClick={() => updatePaymentType('Manually')}
                className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  paymentType === 'Manually'
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border/60 hover:bg-muted/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <IconCash size={18} />
                  </div>
                  <div>
                    <p className="font-semibold text-xs text-foreground">
                      Pay at Counter / Cash
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Pay upon arrival at the branch
                    </p>
                  </div>
                </div>
                {paymentType === 'Manually' && (
                  <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <IconCheck size={12} />
                  </div>
                )}
              </button>

              {/* Option B: Stripe Card Checkout */}
              <button
                type="button"
                onClick={() => updatePaymentType('Stripe')}
                className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  paymentType === 'Stripe'
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border/60 hover:bg-muted/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                    <IconCreditCard size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-xs text-foreground">
                        Credit or Debit Card
                      </p>
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-muted/50">
                        Stripe
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Visa, Mastercard, Amex, Apple Pay
                    </p>
                  </div>
                </div>
                {paymentType === 'Stripe' && (
                  <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <IconCheck size={12} />
                  </div>
                )}
              </button>

              {/* Option C: Bank Transfer */}
              <button
                type="button"
                onClick={() => updatePaymentType('BankTransfer')}
                className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  paymentType === 'BankTransfer'
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border/60 hover:bg-muted/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <IconBuildingBank size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-xs text-foreground">
                        Bank Transfer / Deposit
                      </p>
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-emerald-500/10 text-emerald-700">
                        Manual Slip
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Direct deposit & receipt upload
                    </p>
                  </div>
                </div>
                {paymentType === 'BankTransfer' && (
                  <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <IconCheck size={12} />
                  </div>
                )}
              </button>
            </div>

            {/* Bank Transfer Details Accordion/Card */}
            {paymentType === 'BankTransfer' && (
              <div className="pt-3 border-t space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-3 rounded-xl bg-muted/40 border text-xs space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b">
                    <span className="font-semibold text-foreground">Company Bank Account</span>
                    <Badge variant="outline" className="text-[10px]">Direct Deposit</Badge>
                  </div>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Bank Name:</span>
                      <span className="font-semibold text-foreground">Chase / Global Commerce Bank</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Account Holder:</span>
                      <span className="font-medium text-foreground">{business.name} Inc.</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Account Number:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-foreground">9876-5432-1098</span>
                        <button
                          type="button"
                          onClick={() => handleCopyText('987654321098', 'Account Number')}
                          className="text-muted-foreground hover:text-primary cursor-pointer"
                        >
                          <IconCopy size={13} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Branch Code:</span>
                      <span className="font-mono text-foreground">044000037</span>
                    </div>
                  </div>
                </div>

                {/* Receipt Uploader */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground">
                    Attach Deposit Slip / Receipt
                  </Label>
                  <BankTransferUploader
                    value={receiptUrl}
                    onChange={setReceiptUrl}
                    disabled={isPending}
                  />
                </div>

                                {/* Bank Name Input */}
                <div className="space-y-1.5">
                  <Label htmlFor="bank-name" className="text-xs font-medium text-foreground">
                    Sender Bank Name (Optional)
                  </Label>
                  <Input
                    id="bank-name"
                    placeholder="e.g. Chase Bank"
                    value={bankNameInput}
                    onChange={(e) => setBankNameInput(e.target.value)}
                    disabled={isPending}
                    className="h-9 text-xs"
                  />
                </div>

                {/* Optional Transaction Reference */}
                <div className="space-y-1.5">
                  <Label htmlFor="tx-ref" className="text-xs font-medium text-foreground">
                    Transaction / Reference ID (Optional)
                  </Label>
                  <Input
                    id="tx-ref"
                    placeholder="e.g. TXN987654321"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    disabled={isPending}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Promotional Coupon Code Input Card */}
          <div className="bg-card rounded-2xl border p-5 shadow-xs space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <IconTag size={14} className="text-primary" />
              <span>Promo / Coupon Code</span>
            </label>

            {appliedCoupon ? (
              <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-600 text-white font-mono text-xs">
                    {appliedCoupon.code}
                  </Badge>
                  <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
                    {appliedCoupon.discountType === 'percentage'
                      ? `${appliedCoupon.discountValue}% OFF`
                      : `-${business.currencySymbol || '$'}${appliedCoupon.discountValue.toFixed(2)} OFF`}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveCoupon}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                >
                  <IconX size={15} />
                </Button>
              </div>
            ) : (
              <form onSubmit={handleApplyCoupon} className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      placeholder="e.g. SUMMER20"
                      value={couponInput}
                      onChange={(e) => {
                        setCouponInput(e.target.value.toUpperCase());
                        setCouponError(null);
                      }}
                      disabled={isCouponPending}
                      className="h-10 uppercase font-mono text-xs"
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="outline"
                    disabled={isCouponPending || !couponInput.trim()}
                    className="h-10 px-4 text-xs font-semibold cursor-pointer"
                  >
                    {isCouponPending ? (
                      <IconLoader2 size={14} className="animate-spin" />
                    ) : (
                      'Apply'
                    )}
                  </Button>
                </div>
                {couponError && (
                  <p className="text-[11px] text-destructive font-medium">{couponError}</p>
                )}
              </form>
            )}
          </div>

          {/* Pricing Total Summary */}
          <div className="bg-card rounded-2xl border p-5 shadow-xs space-y-2.5 text-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Service Subtotal</span>
              <span className="font-medium text-foreground">
                {business.currencySymbol || '$'}
                {originalPrice.toFixed(2)}
              </span>
            </div>

            {appliedCoupon && (
              <div className="flex items-center justify-between text-emerald-600 font-medium">
                <span>Coupon Discount ({appliedCoupon.code})</span>
                <span>
                  -{business.currencySymbol || '$'}
                  {discountAmount.toFixed(2)}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-muted-foreground">
              <span>Booking Fee</span>
              <span className="text-emerald-600 font-medium">Free</span>
            </div>

            <div className="pt-2.5 border-t flex items-center justify-between text-sm font-bold text-foreground">
              <span>Total Payable</span>
              <span className="text-base text-primary font-bold">
                {business.currencySymbol || '$'}
                {finalPayable.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Guarantee / Security Notice */}
          <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
            <IconShieldCheck size={18} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">
                {paymentType === 'Stripe'
                  ? 'Secure 256-bit Encrypted Checkout'
                  : paymentType === 'BankTransfer'
                  ? 'Manual Verification Required'
                  : 'Instant Reservation'}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                {paymentType === 'Stripe'
                  ? 'Your payment is processed securely via Stripe. We do not store card details.'
                  : paymentType === 'BankTransfer'
                  ? 'Your booking will be confirmed upon bank deposit slip verification by the company.'
                  : 'Your appointment request is transmitted directly into the scheduling calendar.'}
              </p>
            </div>
          </div>

          {/* Action Trigger Buttons */}
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(4)}
              disabled={isPending}
              className="h-11 px-4 rounded-xl text-xs font-medium cursor-pointer flex items-center gap-1.5"
            >
              <IconArrowLeft size={14} />
              <span>Back</span>
            </Button>
            <Button
              type="button"
              onClick={handleConfirmBooking}
              disabled={isPending}
              className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-md transition-all text-sm cursor-pointer"
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <IconLoader2 size={16} className="animate-spin" />
                  {paymentType === 'Stripe' ? 'Redirecting to Stripe...' : 'Confirming Appointment...'}
                </span>
              ) : paymentType === 'Stripe' ? (
                'Pay & Confirm Booking'
              ) : paymentType === 'BankTransfer' ? (
                'Submit Booking with Slip'
              ) : (
                'Confirm Appointment'
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <BookingConfirmationDialog
        open={isConfirmationOpen}
        onOpenChange={setIsConfirmationOpen}
        details={confirmationDetails}
        onReset={resetWizard}
      />
    </div>
  );
}
