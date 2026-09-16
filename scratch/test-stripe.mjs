import mongoose from "mongoose";
import Stripe from "stripe";

const MONGODB_URI = process.env.MONGODB_URI;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "sk_test_mock";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "whsec_mock";

async function runStripeTests() {
  console.log("🚀 Starting Stripe Payment Gateway Automated Tests...\n");

  const stripe = new Stripe(STRIPE_SECRET_KEY, { typescript: true });

  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB database.");

  // Models
  const User =
    mongoose.models.User ||
    mongoose.model(
      "User",
      new mongoose.Schema(
        {
          name: String,
          email: String,
          role: String,
          activePlanId: mongoose.Schema.Types.ObjectId,
          billingType: String,
          planExpireDate: Date,
          isTrialDone: Boolean,
        },
        { timestamps: true }
      )
    );

  const Plan =
    mongoose.models.Plan ||
    mongoose.model(
      "Plan",
      new mongoose.Schema(
        {
          name: String,
          packagePriceMonthly: Number,
          packagePriceYearly: Number,
          isFreePlan: Boolean,
          isEnabled: Boolean,
        },
        { timestamps: true }
      )
    );

  const Order =
    mongoose.models.Order ||
    mongoose.model(
      "Order",
      new mongoose.Schema(
        {
          orderNumber: String,
          companyId: mongoose.Schema.Types.ObjectId,
          planId: mongoose.Schema.Types.ObjectId,
          planName: String,
          billingCycle: String,
          price: Number,
          discountAmount: Number,
          currency: String,
          paymentType: String,
          paymentStatus: String,
          txnId: String,
        },
        { timestamps: true }
      )
    );

  // Create test user and test plan
  const testUser = await User.create({
    name: "Stripe Test Tenant",
    email: `stripe_test_${Date.now()}@example.com`,
    role: "company",
  });

  const testPlan = await Plan.create({
    name: "Pro Stripe Plan",
    packagePriceMonthly: 49,
    packagePriceYearly: 490,
    isFreePlan: false,
    isEnabled: true,
  });

  console.log(`Created test tenant (${testUser.email}) and test plan (${testPlan.name}).`);

  // --- Test 1: Webhook rejects missing signature ---
  console.log("\n--- Test 1: Webhook Rejects Missing Signature ---");
  const noSigRes = await fetch("http://localhost:3000/api/webhooks/stripe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: "evt_test" }),
  });
  console.log("Missing Signature Response Status:", noSigRes.status);
  const noSigData = await noSigRes.json();
  console.log("Error Message:", noSigData.error);
  if (noSigRes.status !== 400) throw new Error("Expected status 400 for missing signature");

  // --- Test 2: Webhook rejects invalid signature ---
  console.log("\n--- Test 2: Webhook Rejects Invalid Signature ---");
  const badSigRes = await fetch("http://localhost:3000/api/webhooks/stripe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": "t=12345,v1=invalid_signature_hex",
    },
    body: JSON.stringify({ id: "evt_test" }),
  });
  console.log("Invalid Signature Response Status:", badSigRes.status);
  const badSigData = await badSigRes.json();
  console.log("Error Message:", badSigData.error);
  if (badSigRes.status !== 400) throw new Error("Expected status 400 for invalid signature");

  // --- Test 3: Webhook processes checkout.session.completed with valid signature ---
  console.log("\n--- Test 3: Webhook Processes checkout.session.completed ---");
  const checkoutPayload = JSON.stringify({
    id: `evt_cs_${Date.now()}`,
    object: "event",
    api_version: "2026-08-26.dahlia",
    type: "checkout.session.completed",
    data: {
      object: {
        id: `cs_test_${Date.now()}`,
        object: "checkout.session",
        amount_total: 4900,
        currency: "usd",
        metadata: {
          userId: String(testUser._id),
          planId: String(testPlan._id),
          planName: testPlan.name,
          billingType: "monthly",
          rawPrice: "49",
          discountAmount: "0",
        },
      },
    },
  });

  const validSig = stripe.webhooks.generateTestHeaderString({
    payload: checkoutPayload,
    secret: STRIPE_WEBHOOK_SECRET,
  });

  const validRes = await fetch("http://localhost:3000/api/webhooks/stripe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": validSig,
    },
    body: checkoutPayload,
  });

  console.log("Valid Webhook Response Status:", validRes.status);
  const validData = await validRes.json();
  console.log("Webhook Response:", validData);
  if (validRes.status !== 200 || !validData.received) {
    throw new Error("Webhook handler did not return { received: true }");
  }

  // Verify database updates for checkout.session.completed
  const updatedUser = await User.findById(testUser._id).lean();
  console.log("Updated User activePlanId:", String(updatedUser.activePlanId));
  console.log("Updated User billingType:", updatedUser.billingType);
  console.log("Updated User planExpireDate:", updatedUser.planExpireDate);
  if (String(updatedUser.activePlanId) !== String(testPlan._id)) {
    throw new Error("User activePlanId was not updated");
  }

  const createdOrder = await Order.findOne({ companyId: testUser._id }).lean();
  console.log("Created Order Number:", createdOrder.orderNumber);
  console.log("Created Order Price:", createdOrder.price);
  console.log("Created Order Status:", createdOrder.paymentStatus);
  console.log("Created Order Payment Type:", createdOrder.paymentType);
  if (!createdOrder || createdOrder.paymentStatus !== "succeeded" || createdOrder.paymentType !== "Stripe") {
    throw new Error("Order was not properly created by webhook");
  }

  // --- Test 4: Webhook processes invoice.payment_succeeded renewal ---
  console.log("\n--- Test 4: Webhook Processes invoice.payment_succeeded (Renewal) ---");
  const previousExpiry = new Date(updatedUser.planExpireDate);
  const invoicePayload = JSON.stringify({
    id: `evt_inv_${Date.now()}`,
    object: "event",
    api_version: "2026-08-26.dahlia",
    type: "invoice.payment_succeeded",
    data: {
      object: {
        id: `in_test_${Date.now()}`,
        object: "invoice",
        amount_paid: 4900,
        currency: "usd",
        customer_email: testUser.email,
        hosted_invoice_url: "https://stripe.com/invoice/mock",
      },
    },
  });

  const invoiceSig = stripe.webhooks.generateTestHeaderString({
    payload: invoicePayload,
    secret: STRIPE_WEBHOOK_SECRET,
  });

  const invoiceRes = await fetch("http://localhost:3000/api/webhooks/stripe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": invoiceSig,
    },
    body: invoicePayload,
  });

  console.log("Invoice Webhook Response Status:", invoiceRes.status);
  const invoiceData = await invoiceRes.json();
  console.log("Invoice Webhook Response:", invoiceData);
  if (invoiceRes.status !== 200 || !invoiceData.received) {
    throw new Error("Invoice webhook handler did not return { received: true }");
  }

  const renewedUser = await User.findById(testUser._id).lean();
  console.log("Previous Expiry:", previousExpiry);
  console.log("Renewed Expiry:", renewedUser.planExpireDate);
  if (new Date(renewedUser.planExpireDate) <= previousExpiry) {
    throw new Error("User planExpireDate was not extended on renewal");
  }

  const renewalOrders = await Order.find({ companyId: testUser._id }).sort({ createdAt: -1 }).lean();
  console.log(`Total Orders for Tenant: ${renewalOrders.length}`);
  console.log("Latest Order Plan Name:", renewalOrders[0].planName);
  if (renewalOrders.length < 2) {
    throw new Error("Renewal order was not created");
  }

  // Cleanup
  await Order.deleteMany({ companyId: testUser._id });
  await User.findByIdAndDelete(testUser._id);
  await Plan.findByIdAndDelete(testPlan._id);
  await mongoose.disconnect();

  console.log("\n🎉 ALL STRIPE GATEWAY TESTS PASSED SUCCESSFULLY!");
}

runStripeTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
