import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export type ThemePreset = 'theme1' | 'theme2' | 'theme3' | 'theme4' | 'theme5';

export interface IThemeFeature {
  title: string;
  description: string;
  icon?: string;
}

export interface IThemeGalleryImage {
  url: string;
  caption?: string;
}

export interface IThemeBanner {
  title: string;
  subTitle: string;
  image: string;
  buttonText: string;
  buttonUrl: string;
  isVisible: boolean;
}

export interface IThemeAbout {
  title: string;
  description: string;
  image: string;
  features: IThemeFeature[];
  isVisible: boolean;
}

export interface IThemeGallery {
  title: string;
  images: IThemeGalleryImage[];
  isVisible: boolean;
}

export interface IThemeFooter {
  copyright: string;
  socialLinks: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    youtube?: string;
  };
}

export interface IThemeStyling {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  customCss: string;
  customJs: string;
}

export interface IDomainMapping {
  customDomain?: string;
  subdomain?: string;
  isVerified: boolean;
  verifiedAt?: Date | null;
}

export interface IThemeSetting {
  businessId: Types.ObjectId;
  companyId: Types.ObjectId;
  activeTheme: ThemePreset;
  banner: IThemeBanner;
  about: IThemeAbout;
  gallery: IThemeGallery;
  footer: IThemeFooter;
  styling: IThemeStyling;
  domainMapping: IDomainMapping;
  createdAt: Date;
  updatedAt: Date;
}

export interface IThemeSettingDocument extends IThemeSetting, Document {}

const ThemeFeatureSchema = new Schema<IThemeFeature>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    icon: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const ThemeGalleryImageSchema = new Schema<IThemeGalleryImage>(
  {
    url: { type: String, required: true, trim: true },
    caption: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const ThemeBannerSchema = new Schema<IThemeBanner>(
  {
    title: { type: String, default: 'Book Your Service Online with Ease', trim: true },
    subTitle: { type: String, default: 'Fast, flexible, and effortless appointment scheduling tailored for you.', trim: true },
    image: { type: String, default: '', trim: true },
    buttonText: { type: String, default: 'Book Appointment Now', trim: true },
    buttonUrl: { type: String, default: '#booking-section', trim: true },
    isVisible: { type: Boolean, default: true },
  },
  { _id: false }
);

const ThemeAboutSchema = new Schema<IThemeAbout>(
  {
    title: { type: String, default: 'About Our Business', trim: true },
    description: { type: String, default: 'We are dedicated to providing world-class services with experienced specialists.', trim: true },
    image: { type: String, default: '', trim: true },
    features: { type: [ThemeFeatureSchema], default: [] },
    isVisible: { type: Boolean, default: true },
  },
  { _id: false }
);

const ThemeGallerySchema = new Schema<IThemeGallery>(
  {
    title: { type: String, default: 'Our Work & Atmosphere', trim: true },
    images: { type: [ThemeGalleryImageSchema], default: [] },
    isVisible: { type: Boolean, default: true },
  },
  { _id: false }
);

const ThemeFooterSchema = new Schema<IThemeFooter>(
  {
    copyright: { type: String, default: '© 2026 All Rights Reserved.', trim: true },
    socialLinks: {
      facebook: { type: String, default: '', trim: true },
      instagram: { type: String, default: '', trim: true },
      twitter: { type: String, default: '', trim: true },
      linkedin: { type: String, default: '', trim: true },
      youtube: { type: String, default: '', trim: true },
    },
  },
  { _id: false }
);

const ThemeStylingSchema = new Schema<IThemeStyling>(
  {
    primaryColor: { type: String, default: '#0f172a', trim: true },
    secondaryColor: { type: String, default: '#3b82f6', trim: true },
    fontFamily: { type: String, default: 'Inter', trim: true },
    customCss: { type: String, default: '' },
    customJs: { type: String, default: '' },
  },
  { _id: false }
);

const DomainMappingSchema = new Schema<IDomainMapping>(
  {
    customDomain: { type: String, default: '', lowercase: true, trim: true },
    subdomain: { type: String, default: '', lowercase: true, trim: true },
    isVerified: { type: Boolean, default: false },
    verifiedAt: { type: Date, default: null },
  },
  { _id: false }
);

const ThemeSettingSchema = new Schema<IThemeSettingDocument>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      unique: true,
      index: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    activeTheme: {
      type: String,
      enum: ['theme1', 'theme2', 'theme3', 'theme4', 'theme5'],
      default: 'theme1',
    },
    banner: {
      type: ThemeBannerSchema,
      default: () => ({}),
    },
    about: {
      type: ThemeAboutSchema,
      default: () => ({}),
    },
    gallery: {
      type: ThemeGallerySchema,
      default: () => ({}),
    },
    footer: {
      type: ThemeFooterSchema,
      default: () => ({}),
    },
    styling: {
      type: ThemeStylingSchema,
      default: () => ({}),
    },
    domainMapping: {
      type: DomainMappingSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

// High-speed routing and tenant indexes
ThemeSettingSchema.index({ 'domainMapping.customDomain': 1 }, { sparse: true });
ThemeSettingSchema.index({ 'domainMapping.subdomain': 1 }, { sparse: true });

export const ThemeSetting: Model<IThemeSettingDocument> =
  (mongoose.models.ThemeSetting as Model<IThemeSettingDocument>) ||
  mongoose.model<IThemeSettingDocument>('ThemeSetting', ThemeSettingSchema);

export default ThemeSetting;
