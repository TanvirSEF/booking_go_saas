import mongoose from 'mongoose';
import { connectToDatabase } from '../lib/db';
import { Business } from '../models/Business';
import { Category } from '../models/Category';
import { Service } from '../models/Service';
import { User } from '../models/User';
import {
  getCategoriesAction,
  createCategoryAction,
  updateCategoryAction,
  reorderCategoriesAction,
  toggleCategoryStatusAction,
  deleteCategoryAction,
} from '../actions/category';

let passedAssertions = 0;
let totalAssertions = 0;

function assert(condition: unknown, message: string) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  ✅ [PASS] ${message}`);
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function run() {
  console.log('=====================================================================');
  console.log('🚀 Running Live Atlas Integration Tests: Service Category Engine');
  console.log('=====================================================================\n');

  await connectToDatabase();

  const testSuffix = `cat_${Date.now()}`;

  // Provision Tenant A
  const companyUserA = await User.create({
    name: 'Category Tenant Owner A',
    email: `cat_owner_a_${testSuffix}@example.com`,
    password: 'Password123!',
    role: 'company',
  });

  const businessA = await Business.create({
    companyId: companyUserA._id,
    name: 'Lotus Wellness Spa & Salon',
    slug: `lotus-spa-${testSuffix}`,
    currency: 'USD',
    currencySymbol: '$',
    themeColor: '#4f46e5',
  });

  // Provision Tenant B (for multi-tenant isolation assertions)
  const companyUserB = await User.create({
    name: 'Category Tenant Owner B',
    email: `cat_owner_b_${testSuffix}@example.com`,
    password: 'Password123!',
    role: 'company',
  });

  const businessB = await Business.create({
    companyId: companyUserB._id,
    name: 'Apex Barber & Grooming',
    slug: `apex-barber-${testSuffix}`,
    currency: 'USD',
    currencySymbol: '$',
    themeColor: '#059669',
  });

  try {
    // -------------------------------------------------------------
    // Phase 1: Creation & Auto-Increment Sequential Ordering
    // -------------------------------------------------------------
    console.log('👉 Phase 1: Creation & Auto-Increment Sequential Ordering');

    const cat1Res = await createCategoryAction({
      businessId: businessA._id.toString(),
      name: 'Hair Care & Styling',
      description: 'Cuts, colors, and treatments',
      icon: 'scissors',
    });
    assert(cat1Res.success === true, 'Created first category successfully');
    assert(cat1Res.data?.order === 0, `First category receives order 0 (got ${cat1Res.data?.order})`);
    assert(cat1Res.data?.name === 'Hair Care & Styling', 'Category name matches input');
    assert(cat1Res.data?.icon === 'scissors', 'Category icon persisted');

    const cat2Res = await createCategoryAction({
      businessId: businessA._id.toString(),
      name: 'Skin & Facial Treatments',
      description: 'Hydrafacials and peels',
    });
    assert(cat2Res.success === true, 'Created second category successfully');
    assert(cat2Res.data?.order === 1, `Second category automatically incremented to order 1 (got ${cat2Res.data?.order})`);

    const cat3Res = await createCategoryAction({
      businessId: businessA._id.toString(),
      name: 'Massage & Bodywork',
      description: 'Deep tissue and Swedish massage',
      order: 5, // Explicit order override
    });
    assert(cat3Res.success === true, 'Created third category with explicit order');
    assert(cat3Res.data?.order === 5, `Category honored explicit order 5 (got ${cat3Res.data?.order})`);

    // -------------------------------------------------------------
    // Phase 2: Duplicate Name Collision Guard
    // -------------------------------------------------------------
    console.log('\n👉 Phase 2: Duplicate Name Collision Guard');

    const dupRes = await createCategoryAction({
      businessId: businessA._id.toString(),
      name: 'hair care & styling', // case-insensitive duplicate!
    });
    assert(dupRes.success === false, 'Rejects duplicate category name in same business');
    assert(dupRes.error?.includes('already exists'), 'Returns descriptive duplicate error message');

    // Identical name in DIFFERENT business should succeed
    const crossTenantRes = await createCategoryAction({
      businessId: businessB._id.toString(),
      name: 'Hair Care & Styling', // same name, different tenant business
    });
    assert(crossTenantRes.success === true, 'Allows identical category name in a distinct tenant business');

    // -------------------------------------------------------------
    // Phase 3: Category Update Action
    // -------------------------------------------------------------
    console.log('\n👉 Phase 3: Category Update Action & Collision Guard');

    const updateRes = await updateCategoryAction({
      id: cat1Res.data!.id,
      name: 'Hair & Scalp Therapy',
      description: 'Comprehensive hair and scalp wellness',
      icon: 'sparkles',
    });
    assert(updateRes.success === true, 'Updated category name and details successfully');
    assert(updateRes.data?.name === 'Hair & Scalp Therapy', 'Updated category name reflected in return data');

    // Verify in Atlas
    const cat1Doc = await Category.findById(cat1Res.data!.id).lean();
    assert(cat1Doc?.name === 'Hair & Scalp Therapy', 'Atlas persisted updated category name');
    assert(cat1Doc?.icon === 'sparkles', 'Atlas persisted updated category icon');

    // Attempt rename collision: rename Category 1 to Category 2's name -> MUST FAIL
    const renameCollision = await updateCategoryAction({
      id: cat1Res.data!.id,
      name: 'Skin & Facial Treatments',
    });
    assert(renameCollision.success === false, 'Rejects renaming to an existing category in same business');

    // -------------------------------------------------------------
    // Phase 4: Sequential Reordering Action
    // -------------------------------------------------------------
    console.log('\n👉 Phase 4: Sequential Reordering Action (Drag-and-Drop)');

    // Reorder: Cat 3 -> 0, Cat 1 -> 1, Cat 2 -> 2
    const reorderRes = await reorderCategoriesAction([
      { id: cat3Res.data!.id, order: 0 },
      { id: cat1Res.data!.id, order: 1 },
      { id: cat2Res.data!.id, order: 2 },
    ]);
    assert(reorderRes.success === true, 'Reordered categories in bulk successfully');

    // Fetch ordered categories
    const listOrdered = await getCategoriesAction({ businessId: businessA._id.toString() });
    assert(listOrdered.success === true, 'Fetched ordered categories');
    assert(listOrdered.data?.length === 3, 'Returns all 3 categories');
    assert(listOrdered.data?.[0].id === cat3Res.data!.id, 'First category is now Cat 3 (Massage & Bodywork)');
    assert(listOrdered.data?.[1].id === cat1Res.data!.id, 'Second category is Cat 1 (Hair & Scalp Therapy)');
    assert(listOrdered.data?.[2].id === cat2Res.data!.id, 'Third category is Cat 2 (Skin & Facial Treatments)');

    // -------------------------------------------------------------
    // Phase 5: Visibility Status Toggling & Public Filtering
    // -------------------------------------------------------------
    console.log('\n👉 Phase 5: Visibility Status Toggling & Public Filtering');

    const toggleRes = await toggleCategoryStatusAction(cat2Res.data!.id);
    assert(toggleRes.success === true, 'Toggled category visibility status');
    assert(toggleRes.isActive === false, 'Category is now marked inactive (isActive: false)');

    // Query active-only categories (default behavior for public booking)
    const activeOnly = await getCategoriesAction({
      businessId: businessA._id.toString(),
      includeInactive: false,
    });
    assert(activeOnly.data?.length === 2, 'Excludes inactive category from active query (2 returned)');
    assert(
      !activeOnly.data?.some((c) => c.id === cat2Res.data!.id),
      'Inactive category Cat 2 is absent from active list'
    );

    // Query with includeInactive: true
    const allCategories = await getCategoriesAction({
      businessId: businessA._id.toString(),
      includeInactive: true,
    });
    assert(allCategories.data?.length === 3, 'Returns all categories when includeInactive: true');

    // Public booking query parity check
    const publicPortalQuery = await Category.find({
      businessId: businessA._id,
      isActive: { $ne: false },
    })
      .sort({ order: 1, name: 1 })
      .lean();
    assert(publicPortalQuery.length === 2, 'Public portal query filters out inactive categories');
    assert(
      String(publicPortalQuery[0]._id) === cat3Res.data!.id,
      'Public portal query respects custom sequence order'
    );

    // Re-enable Cat 2
    await toggleCategoryStatusAction(cat2Res.data!.id);

    // -------------------------------------------------------------
    // Phase 6: Service Link Protection & Service Aggregation
    // -------------------------------------------------------------
    console.log('\n👉 Phase 6: Service Link Protection & Service Count Aggregation');

    // Provision 2 services assigned to Cat 1
    await Service.create({
      companyId: companyUserA._id,
      businessId: businessA._id,
      categoryId: new mongoose.Types.ObjectId(cat1Res.data!.id),
      name: 'Keratin Smoothing Treatment',
      durationMinutes: 90,
      price: 250,
      isActive: true,
    });

    await Service.create({
      companyId: companyUserA._id,
      businessId: businessA._id,
      categoryId: new mongoose.Types.ObjectId(cat1Res.data!.id),
      name: 'Scalp Detox & Massage',
      durationMinutes: 45,
      price: 85,
      isActive: false, // inactive service
    });

    // Verify service counts aggregation
    const listWithStats = await getCategoriesAction({ businessId: businessA._id.toString() });
    const cat1Stats = listWithStats.data?.find((c) => c.id === cat1Res.data!.id);
    assert(cat1Stats?.servicesCount === 2, 'Accurately aggregates 2 total services for Cat 1');
    assert(cat1Stats?.activeServicesCount === 1, 'Accurately aggregates 1 active service for Cat 1');

    const cat3Stats = listWithStats.data?.find((c) => c.id === cat3Res.data!.id);
    assert(cat3Stats?.servicesCount === 0, 'Cat 3 has 0 linked services');

    // Attempt deleting Category 1 with linked services -> MUST FAIL
    const blockedDelete = await deleteCategoryAction(cat1Res.data!.id);
    assert(blockedDelete.success === false, 'Blocks deletion of category with assigned services');
    assert(
      blockedDelete.error?.includes('2 service(s) are assigned to it'),
      'Returns descriptive service link error'
    );

    // -------------------------------------------------------------
    // Phase 7: Clean Deletion When Unlinked
    // -------------------------------------------------------------
    console.log('\n👉 Phase 7: Clean Deletion When Unlinked');

    // Delete Cat 3 (unlinked) -> MUST PASS
    const successDelete = await deleteCategoryAction(cat3Res.data!.id);
    assert(successDelete.success === true, 'Successfully deletes unlinked category');

    const checkCat3 = await Category.findById(cat3Res.data!.id).lean();
    assert(checkCat3 === null, 'Cat 3 completely removed from MongoDB Atlas');

    // -------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------
    console.log('\n=====================================================================');
    console.log(`🎉 All Service Category Tests Passed: ${passedAssertions}/${totalAssertions} Assertions!`);
    console.log('=====================================================================\n');
  } finally {
    // Clean up test documents
    await Service.deleteMany({ businessId: { $in: [businessA._id, businessB._id] } });
    await Category.deleteMany({ businessId: { $in: [businessA._id, businessB._id] } });
    await Business.deleteMany({ _id: { $in: [businessA._id, businessB._id] } });
    await User.deleteMany({ _id: { $in: [companyUserA._id, companyUserB._id] } });
    await mongoose.disconnect();
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test failed with error:', err);
    process.exit(1);
  });
