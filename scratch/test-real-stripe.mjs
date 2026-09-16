import Stripe from "stripe";
import mongoose from "mongoose";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const MONGODB_URI = process.env.MONGODB_URI;

async function testRealStripe() {
  console.log("🚀 Testing Live Stripe Test Mode Integration...\n");
  console.log("Using Key:", STRIPE_SECRET_KEY ? `${STRIPE_SECRET_KEY.slice(0, 14)}...` : "NONE");
  console.log("Using Webhook Secret:", STRIPE_WEBHOOK_SECRET ? `${STRIPE_WEBHOOK_SECRET.slice(0, 12)}...` : "NONE");

  const stripe = new Stripe(STRIPE_SECRET_KEY, { typescript: true });

  // 1. Check Stripe API Connection
  console.log("\n--- Step 1: Connecting to Stripe API ---");
  try {
    const balance = await stripe.balance.retrieve();
    console.log("✅ Successfully authenticated with Stripe!");
    console.log("   Available Currency:", balance.available?.[0]?.currency || "USD");
    console.log("   Livemode:", balance.livemode ? "LIVE (Careful!)" : "TEST MODE (Safe)");
  } catch (err) {
    console.error("❌ Failed to connect to Stripe with STRIPE_SECRET_KEY:", err.message);
    process.exit(1);
  }

  // 2. Create a Real Test Checkout Session
  console.log("\n--- Step 2: Creating a Real Stripe Checkout Session ---");
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "SaaS Premium Plan (Monthly)",
              description: "Automated test session for SaaS subscriptions",
            },
            unit_amount: 2900, // $29.00
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        },
      ],
      success_url: "http://localhost:3000/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "http://localhost:3000/dashboard?payment=cancelled",
      metadata: {
        test: "true",
      },
    });

    console.log("✅ Checkout Session created successfully!");
    console.log("   Session ID:", session.id);
    console.log("   Checkout URL:", session.url);
  } catch (err) {
    console.error("❌ Failed to create Checkout Session:", err.message);
    process.exit(1);
  }

  // 3. Test Webhook Route with the real STRIPE_WEBHOOK_SECRET
  console.log("\n--- Step 3: Verifying Webhook Signature with STRIPE_WEBHOOK_SECRET ---");
  await mongoose.connect(MONGODB_URI);

  const User = mongoose.models.User || mongoose.model("User", new mongoose.Schema({
    name: String,
    email: String,
    role: String,
    activePlanId: mongoose.Schema.Types.ObjectId,
    billingType: String,
    planExpireDate: Date,
  }, { timestamps: true }));

  const Plan = mongoose.models.Plan || mongoose.model("Plan", new mongoose.Schema({
    name: String,
    packagePriceMonthly: Number,
    packagePriceYearly: Number,
    isEnabled: Boolean,
  }, { timestamps: true }));

  const Order = mongoose.models.Order || mongoose.model("Order", new mongoose.Schema({
    orderNumber: String,
    companyId: mongoose.Schema.Types.ObjectId,
    planId: mongoose.Schema.Types.ObjectId,
    planName: String,
    billingCycle: String,
    price: Number,
    paymentType: String,
    paymentStatus: String,
    txnId: String,
  }, { timestamps: true }));

  const testUser = await User.create({
    name: "Live Test Tenant",
    email: `live_test_${Date.now()}@example.com`,
    role: "company",
  });

  const testPlan = await Plan.create({
    name: "Live Test Plan",
    packagePriceMonthly: 39,
    packagePriceYearly: 390,
    isEnabled: true,
  });

  const testPayload = JSON.stringify({
    id: `evt_live_${Date.now()}`,
    object: "event",
    api_version: "2026-08-26.dahlia",
    type: "checkout.session.completed",
    data: {
      object: {
        id: `cs_live_${Date.now()}`,
        object: "checkout.session",
        amount_total: 3900,
        currency: "usd",
        metadata: {
          userId: String(testUser._id),
          planId: String(testPlan._id),
          planName: testPlan.name,
          billingType: "monthly",
          rawPrice: "39",
          discountAmount: "0",
        },
      },
    },
  });

  const signature = stripe.webhooks.generateTestHeaderString({
    payload: testPayload,
    secret: STRIPE_WEBHOOK_SECRET,
  });

  const res = await fetch("http://localhost:3000/api/webhooks/stripe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": signature,
    },
    body: testPayload,
  });

  console.log("   Webhook HTTP Status:", res.status);
  const data = await res.json();
  console.log("   Webhook Response:", data);

  if (res.status === 200 && data.received) {
    console.log("✅ Webhook endpoint verified successfully with your STRIPE_WEBHOOK_SECRET!");
  } else {
    console.error("❌ Webhook verification failed:", data);
    process.exit(1);
  }

  // Cleanup test records
  await Order.deleteMany({ companyId: testUser._id });
  await User.findByIdAndDelete(testUser._id);
  await Plan.findByIdAndDelete(testPlan._id);
  await mongoose.disconnect();

  console.log("\n🎉 ALL TESTS PASSED WITH YOUR REAL STRIPE SANDBOX KEYS!");
}

testRealStripe().catch(console.error);
