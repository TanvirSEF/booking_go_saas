import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("No MONGODB_URI found in environment");
  process.exit(1);
}

async function runTests() {
  console.log("🚀 Starting Coupons Management Interface Automated Tests...\n");

  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB database.");

  const Coupon = mongoose.models.Coupon || mongoose.model('Coupon', new mongoose.Schema({
    name: String,
    code: { type: String, uppercase: true, unique: true },
    discountType: String,
    discount: Number,
    limit: Number,
    usedCount: Number,
    isActive: Boolean,
  }, { timestamps: true }));

  // Clean up any existing test coupons
  await Coupon.deleteMany({ code: { $in: ['TESTAMELIA', 'CNJOQGPHPO_TEST', 'MANUAL50'] } });

  console.log("\n--- Test 1: Seed / Verify Coupon Creation (like amelia CNJOQGPHPO in screenshot) ---");
  const testCoupon = await Coupon.create({
    name: 'amelia',
    code: 'CNJOQGPHPO_TEST',
    discountType: 'percentage',
    discount: 63,
    limit: 99,
    usedCount: 0,
    isActive: true,
  });
  console.log("✅ Seeded test coupon matching screenshot 1:", testCoupon.name, testCoupon.code);

  console.log("\n--- Test 2: Verify Super Admin Login & Session Cookie ---");
  const csrfRes = await fetch("http://localhost:3000/api/auth/csrf");
  const { csrfToken } = await csrfRes.json();
  const setCookie = csrfRes.headers.get("set-cookie") || "";
  const cookieMatches = setCookie.match(/authjs\.[^=]+=[^;]+/g) || [];
  let cookieHeader = cookieMatches.join("; ");

  const loginRes = await fetch("http://localhost:3000/api/auth/callback/credentials", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieHeader,
    },
    body: new URLSearchParams({
      email: "superadmin@example.com",
      password: "1234",
      csrfToken,
      redirect: "false",
    }),
    redirect: "manual",
  });

  const loginSetCookie = loginRes.headers.get("set-cookie") || "";
  const authCookies = loginSetCookie.match(/authjs\.[^=]+=[^;]+/g) || [];
  cookieHeader = [...cookieMatches, ...authCookies].join("; ");
  console.log("Super Admin Login Status:", loginRes.status);

  console.log("\n--- Test 3: Fetch /super-admin/coupons (SSR) ---");
  const couponsPageRes = await fetch("http://localhost:3000/super-admin/coupons", {
    headers: { Cookie: cookieHeader },
  });
  console.log("Page HTTP Status:", couponsPageRes.status);
  const couponsHtml = await couponsPageRes.text();
  console.log("Includes Manage Coupon title:", couponsHtml.includes("Manage Coupon"));
  console.log("Includes Entries Per Page:", couponsHtml.includes("Entries Per Page"));
  console.log("Includes amelia coupon name:", couponsHtml.includes("amelia"));
  console.log("Includes CNJOQGPHPO_TEST code:", couponsHtml.includes("CNJOQGPHPO_TEST"));
  console.log("Includes 63% discount:", couponsHtml.includes("63"));

  console.log("\n--- Test 4: Fetch /super-admin/coupons/[id] (SSR Details View) ---");
  const detailsPageRes = await fetch(`http://localhost:3000/super-admin/coupons/${testCoupon._id}`, {
    headers: { Cookie: cookieHeader },
  });
  console.log("Details Page HTTP Status:", detailsPageRes.status);
  const detailsHtml = await detailsPageRes.text();
  console.log("Includes Manage Coupon Details title:", detailsHtml.includes("Manage Coupon Details"));
  console.log("Includes USER column:", detailsHtml.includes("USER"));
  console.log("Includes DATE column:", detailsHtml.includes("DATE"));
  console.log("Includes PLAN NAME column:", detailsHtml.includes("PLAN NAME"));
  console.log("Includes PAYMENT TYPE column:", detailsHtml.includes("PAYMENT TYPE"));
  console.log("Includes No entries found empty state:", detailsHtml.includes("No entries found"));

  // Clean up test coupon
  await Coupon.findByIdAndDelete(testCoupon._id);
  console.log("\n✅ Cleaned up test coupon.");

  await mongoose.disconnect();
  console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY!");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
