import mongoose from 'mongoose';
import { connectToDatabase } from '../lib/db';
import { LandingPageSetting } from '../models/LandingPageSetting';

async function main() {
  await connectToDatabase();

  const doc = await LandingPageSetting.findOne({ slug: 'default' });
  if (!doc) {
    console.log('No default landing page document found.');
    process.exit(0);
  }

  const featureImages = [
    '/images/landing/feature-image-1.png',
    '/images/landing/feature-image-2.png',
    '/images/landing/feature-image-3.png',
  ];

  const avatars = [
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  ];

  if (doc.features?.cards) {
    doc.features.cards.forEach((card, i) => {
      card.image = featureImages[i] || `/images/landing/feature-image-${(i % 5) + 1}.png`;
    });
  }

  if (doc.reviews?.items) {
    doc.reviews.items.forEach((item, i) => {
      item.image = avatars[i % avatars.length];
    });
  }

  doc.markModified('features');
  doc.markModified('reviews');
  await doc.save();
  console.log('✅ Successfully updated default landing page settings in MongoDB Atlas with image URLs!');

  const recheck = await LandingPageSetting.findOne({ slug: 'default' }).lean();
  console.log('Features cards after update:', recheck?.features?.cards?.map((c) => ({ heading: c.heading, image: c.image })));
  console.log('Reviews items after update:', recheck?.reviews?.items?.map((r) => ({ heading: r.heading, image: r.image })));

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Error updating Atlas:', err);
  process.exit(1);
});
