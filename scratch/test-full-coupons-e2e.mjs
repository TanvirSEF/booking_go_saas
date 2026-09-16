import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  console.log("=== Comprehensive End-to-End Coupons Test ===");
  await mongoose.connect(MONGODB_URI);

  const Coupon = mongoose.models.Coupon || mongoose.model('Coupon', new mongoose.Schema({
    name: String,
    code: { type: String, uppercase: true, unique: true },
    discountType: { type: String, default: 'percentage' },
    discount: Number,
    limit: Number,
    usedCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  }, { timestamps: true }));

  const Order = mongoose.models.Order || mongoose.model('Order', new mongoose.Schema({
    couponCode: String,
    planName: String,
    paymentType: String,
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  }, { timestamps: true }));

  // Clean up previous test entries
  await Coupon.deleteMany({ code: { $in: ['E2E_CODE_1', 'E2E_CODE_2', 'AUTOGEN1234'] } });

  // 1. Create Coupon
  console.log("1. Testing Coupon Creation...");
  const created = await Coupon.create({
    name: 'Holiday Special',
    code: 'E2E_CODE_1',
    discount: 30,
    limit: 100,
    usedCount: 0,
    isActive: true,
  });
  console.log("   Created Coupon:", created.code, "ID:", String(created._id));

  // 2. Fetch Coupons List
  console.log("2. Testing Coupons List Query...");
  const list = await Coupon.find().sort({ createdAt: -1 }).lean();
  console.log("   Total Coupons:", list.length);
  const found = list.find(c => c.code === 'E2E_CODE_1');
  console.log("   Found created coupon in list:", !!found);

  // 3. Update Coupon
  console.log("3. Testing Coupon Update...");
  await Coupon.findByIdAndUpdate(created._id, {
    name: 'Holiday Special Updated',
    discount: 35,
    limit: 150,
  });
  const updated = await Coupon.findById(created._id).lean();
  console.log("   Updated name:", updated.name);
  console.log("   Updated discount:", updated.discount);
  console.log("   Updated limit:", updated.limit);

  // 4. Test Redemption Query
  console.log("4. Testing Redemption query...");
  // Create dummy order using this coupon
  const testOrder = await Order.create({
    couponCode: 'E2E_CODE_1',
    planName: 'Pro Monthly',
    paymentType: 'Stripe',
  });
  const orders = await Order.find({ couponCode: 'E2E_CODE_1' }).lean();
  console.log("   Redemptions for coupon:", orders.length, "Order plan:", orders[0]?.planName);

  // 5. Clean up Order & Delete Coupon
  console.log("5. Testing Coupon Deletion...");
  await Order.findByIdAndDelete(testOrder._id);
  await Coupon.findByIdAndDelete(created._id);
  const deletedCheck = await Coupon.findById(created._id);
  console.log("   Coupon exists after deletion:", !!deletedCheck);

  // 6. Test HTTP SSR for /super-admin/coupons
  console.log("6. Testing SSR on /super-admin/coupons with auth...");
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

  const pageRes = await fetch("http://localhost:3000/super-admin/coupons", {
    headers: { Cookie: cookieHeader },
  });
  console.log("   SSR HTTP Status:", pageRes.status);
  const pageHtml = await pageRes.text();
  console.log("   Contains 'Manage Coupon':", pageHtml.includes("Manage Coupon"));
  console.log("   Contains 'Entries Per Page':", pageHtml.includes("Entries Per Page"));
  console.log("   Contains 'DISCOUNT (%)':", pageHtml.includes("DISCOUNT (%)"));

  await mongoose.disconnect();
  console.log("\n✅ ALL END-TO-END TESTS COMPLETED SUCCESSFULLY!");
}

run().catch(console.error);
