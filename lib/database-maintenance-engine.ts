import mongoose, { Types } from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Business } from '@/models/Business';
import { Location } from '@/models/Location';
import { Category } from '@/models/Category';
import { Service } from '@/models/Service';
import { Staff } from '@/models/Staff';
import { Customer } from '@/models/Customer';
import { Appointment } from '@/models/Appointment';
import { AppointmentPayment } from '@/models/AppointmentPayment';
import { ExchangeRate } from '@/models/ExchangeRate';
import { Coupon } from '@/models/Coupon';
import { Order } from '@/models/Order';
import { Plan } from '@/models/Plan';
import { Role } from '@/models/Role';
import { CustomStatus } from '@/models/CustomStatus';
import { CustomField } from '@/models/CustomField';
import { Testimonial } from '@/models/Testimonial';
import { Blog } from '@/models/Blog';
import { Notification } from '@/models/Notification';
import { LoginDetail } from '@/models/LoginDetail';
import { WebhookEvent } from '@/models/WebhookEvent';
import type {
  DatabaseHealthReport,
  DatabaseHealthStatus,
  CollectionHealthStat,
  IndexHealthStat,
  OrphanAuditReport,
  OrphanItemCount,
  VacuumOptions,
  VacuumExecutionResult,
} from '@/types/maintenance';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyModel = mongoose.Model<any>;

// ---------------------------------------------------------------------------
// 1. Database Health Diagnostic Inspector
// ---------------------------------------------------------------------------

export async function getDatabaseHealth(): Promise<DatabaseHealthReport> {
  await connectToDatabase();

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection is not established.');
  }

  // Measure connection latency via ping
  const pingStart = Date.now();
  await db.command({ ping: 1 });
  const pingMs = Date.now() - pingStart;

  // Determine overall status based on latency
  let status: DatabaseHealthStatus = 'healthy';
  if (pingMs > 1000) {
    status = 'unhealthy';
  } else if (pingMs > 300) {
    status = 'degraded';
  }

  // Scan collection document counts across all core models
  const models = [
    { name: 'User', model: User },
    { name: 'Business', model: Business },
    { name: 'Location', model: Location },
    { name: 'Category', model: Category },
    { name: 'Service', model: Service },
    { name: 'Staff', model: Staff },
    { name: 'Customer', model: Customer },
    { name: 'Appointment', model: Appointment },
    { name: 'AppointmentPayment', model: AppointmentPayment },
    { name: 'ExchangeRate', model: ExchangeRate },
    { name: 'Coupon', model: Coupon },
    { name: 'Order', model: Order },
    { name: 'Plan', model: Plan },
    { name: 'Role', model: Role },
    { name: 'CustomStatus', model: CustomStatus },
    { name: 'CustomField', model: CustomField },
    { name: 'Testimonial', model: Testimonial },
    { name: 'Blog', model: Blog },
    { name: 'Notification', model: Notification },
    { name: 'LoginDetail', model: LoginDetail },
    { name: 'WebhookEvent', model: WebhookEvent },
  ];

  const collections: CollectionHealthStat[] = await Promise.all(
    models.map(async ({ name, model }) => {
      try {
        const count = await model.countDocuments();
        return { name, documentCount: count };
      } catch {
        return { name, documentCount: 0 };
      }
    })
  );

  // Inspect indexes on core collections
  const criticalCollections = [
    User.collection.name,
    Business.collection.name,
    Appointment.collection.name,
    Service.collection.name,
    ExchangeRate.collection.name,
  ];

  const indexes: IndexHealthStat[] = [];
  for (const collName of criticalCollections) {
    try {
      const coll = db.collection(collName);
      const rawIndexes = await coll.indexes();
      indexes.push({
        collection: collName,
        indexCount: rawIndexes.length,
        indexes: rawIndexes.map((idx) => String(idx.name ?? 'unnamed')),
      });
    } catch {
      indexes.push({
        collection: collName,
        indexCount: 0,
        indexes: [],
      });
    }
  }

  return {
    status,
    pingMs,
    databaseName: db.databaseName,
    collections,
    indexes,
    timestamp: new Date(),
  };
}

// ---------------------------------------------------------------------------
// 2. Deep Relational Integrity & Orphan Scanner
// ---------------------------------------------------------------------------

export async function auditOrphanedRecords(businessId?: string): Promise<OrphanAuditReport> {
  await connectToDatabase();

  const businessObjectId = businessId ? new Types.ObjectId(businessId) : null;
  const breakdown: OrphanItemCount[] = [];

  // Helper aggregation runner for dangling foreign key detection
  const findOrphanIds = async (
    model: AnyModel,
    lookupCollection: string,
    localField: string,
    description: string,
    entityName: string
  ): Promise<Types.ObjectId[]> => {
    const pipeline: mongoose.PipelineStage[] = [];

    if (businessObjectId) {
      pipeline.push({ $match: { businessId: businessObjectId } });
    }

    pipeline.push(
      {
        $lookup: {
          from: lookupCollection,
          localField,
          foreignField: '_id',
          as: 'matchedParent',
        },
      },
      {
        $match: {
          matchedParent: { $size: 0 },
        },
      },
      {
        $project: { _id: 1 },
      }
    );

    const docs = await model.aggregate(pipeline);
    const ids = docs.map((d: { _id: Types.ObjectId }) => d._id);

    if (ids.length > 0) {
      breakdown.push({
        entity: entityName,
        count: ids.length,
        description,
        sampleIds: ids.slice(0, 5).map((id: Types.ObjectId) => String(id)),
      });
    }

    return ids;
  };

  // 1. AppointmentPayments referencing non-existent Appointments
  await findOrphanIds(
    AppointmentPayment,
    Appointment.collection.name,
    'appointmentId',
    'AppointmentPayments referencing deleted or non-existent appointments',
    'AppointmentPayment'
  );

  // 2. Appointments referencing non-existent Businesses
  await findOrphanIds(
    Appointment,
    Business.collection.name,
    'businessId',
    'Appointments referencing deleted or non-existent businesses',
    'Appointment'
  );

  // 3. Staff referencing non-existent Users
  await findOrphanIds(
    Staff,
    User.collection.name,
    'userId',
    'Staff records referencing deleted or non-existent user accounts',
    'Staff'
  );

  // 4. Staff referencing non-existent Businesses
  await findOrphanIds(
    Staff,
    Business.collection.name,
    'businessId',
    'Staff records referencing deleted or non-existent businesses',
    'Staff'
  );

  // 5. Services referencing non-existent Categories
  await findOrphanIds(
    Service,
    Category.collection.name,
    'categoryId',
    'Services referencing deleted or non-existent categories',
    'Service'
  );

  // 6. Services referencing non-existent Businesses
  await findOrphanIds(
    Service,
    Business.collection.name,
    'businessId',
    'Services referencing deleted or non-existent businesses',
    'Service'
  );

  // 7. Customers referencing non-existent Businesses
  await findOrphanIds(
    Customer,
    Business.collection.name,
    'businessId',
    'Customers referencing deleted or non-existent businesses',
    'Customer'
  );

  // 8. CustomStatus referencing non-existent Businesses
  await findOrphanIds(
    CustomStatus,
    Business.collection.name,
    'businessId',
    'CustomStatus records referencing deleted or non-existent businesses',
    'CustomStatus'
  );

  // 9. CustomField referencing non-existent Businesses
  await findOrphanIds(
    CustomField,
    Business.collection.name,
    'businessId',
    'CustomField records referencing deleted or non-existent businesses',
    'CustomField'
  );

  // 10. Categories referencing non-existent Businesses
  await findOrphanIds(
    Category,
    Business.collection.name,
    'businessId',
    'Categories referencing deleted or non-existent businesses',
    'Category'
  );

  // 11. Locations referencing non-existent Businesses
  await findOrphanIds(
    Location,
    Business.collection.name,
    'businessId',
    'Locations referencing deleted or non-existent businesses',
    'Location'
  );

  const totalOrphans = breakdown.reduce((sum, item) => sum + item.count, 0);

  return {
    totalOrphans,
    breakdown,
    timestamp: new Date(),
  };
}

// ---------------------------------------------------------------------------
// 3. Database Vacuum & Maintenance Pruning Engine
// ---------------------------------------------------------------------------

export async function vacuumDatabase(options: VacuumOptions = {}): Promise<VacuumExecutionResult> {
  const startTime = Date.now();
  await connectToDatabase();

  const dryRun = options.dryRun !== false; // defaults to true for safety
  const scope = options.scope || 'all';
  const businessId = options.businessId;
  const businessObjectId = businessId ? new Types.ObjectId(businessId) : null;

  const retention = {
    loginLogsDays: options.retention?.loginLogsDays ?? 90,
    webhooksDays: options.retention?.webhooksDays ?? 60,
    notificationsDays: options.retention?.notificationsDays ?? 30,
  };

  let scanned = 0;
  let purged = 0;
  const breakdown: Record<string, number> = {};
  const errors: string[] = [];

  // Helper for scanning and purging orphan lists
  const processOrphanCategory = async (
    model: AnyModel,
    lookupCollection: string,
    localField: string,
    entityKey: string
  ) => {
    try {
      const pipeline: mongoose.PipelineStage[] = [];
      if (businessObjectId) {
        pipeline.push({ $match: { businessId: businessObjectId } });
      }
      pipeline.push(
        {
          $lookup: {
            from: lookupCollection,
            localField,
            foreignField: '_id',
            as: 'matchedParent',
          },
        },
        {
          $match: {
            matchedParent: { $size: 0 },
          },
        },
        {
          $project: { _id: 1 },
        }
      );

      const docs = await model.aggregate(pipeline);
      const orphanIds = docs.map((d: { _id: Types.ObjectId }) => d._id);
      scanned += orphanIds.length;

      if (orphanIds.length > 0) {
        breakdown[entityKey] = orphanIds.length;
        if (!dryRun) {
          const deleteRes = await model.deleteMany({ _id: { $in: orphanIds } });
          purged += deleteRes.deletedCount;
        } else {
          purged += orphanIds.length;
        }
      } else {
        breakdown[entityKey] = 0;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Error vacuuming ${entityKey}: ${msg}`);
    }
  };

  // Phase A: Orphan Records (executed in reverse topological dependency order)
  if (scope === 'all' || scope === 'orphans') {
    // 1. AppointmentPayments before Appointments
    await processOrphanCategory(
      AppointmentPayment,
      Appointment.collection.name,
      'appointmentId',
      'orphanedAppointmentPayments'
    );

    // 2. Appointments before Business
    await processOrphanCategory(
      Appointment,
      Business.collection.name,
      'businessId',
      'orphanedAppointments'
    );

    // 3. Staff before Users
    await processOrphanCategory(
      Staff,
      User.collection.name,
      'userId',
      'orphanedStaffUsers'
    );

    // 4. Staff before Business
    await processOrphanCategory(
      Staff,
      Business.collection.name,
      'businessId',
      'orphanedStaffBusinesses'
    );

    // 5. Services before Categories
    await processOrphanCategory(
      Service,
      Category.collection.name,
      'categoryId',
      'orphanedServicesCategories'
    );

    // 6. Services before Business
    await processOrphanCategory(
      Service,
      Business.collection.name,
      'businessId',
      'orphanedServicesBusinesses'
    );

    // 7. Customers before Business
    await processOrphanCategory(
      Customer,
      Business.collection.name,
      'businessId',
      'orphanedCustomers'
    );

    // 8. CustomStatus before Business
    await processOrphanCategory(
      CustomStatus,
      Business.collection.name,
      'businessId',
      'orphanedCustomStatuses'
    );

    // 9. CustomField before Business
    await processOrphanCategory(
      CustomField,
      Business.collection.name,
      'businessId',
      'orphanedCustomFields'
    );

    // 10. Categories before Business
    await processOrphanCategory(
      Category,
      Business.collection.name,
      'businessId',
      'orphanedCategories'
    );

    // 11. Locations before Business
    await processOrphanCategory(
      Location,
      Business.collection.name,
      'businessId',
      'orphanedLocations'
    );
  }

  // Phase B: Stale Login Audit Logs
  if (scope === 'all' || scope === 'stale_logs') {
    try {
      const loginCutoff = new Date(Date.now() - retention.loginLogsDays * 86400000);
      const query: Record<string, unknown> = { createdAt: { $lt: loginCutoff } };
      if (businessObjectId) {
        query.businessId = businessObjectId;
      }

      const count = await LoginDetail.countDocuments(query);
      scanned += count;
      breakdown.staleLoginDetails = count;

      if (count > 0) {
        if (!dryRun) {
          const deleteRes = await LoginDetail.deleteMany(query);
          purged += deleteRes.deletedCount;
        } else {
          purged += count;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Error pruning LoginDetails: ${msg}`);
    }
  }

  // Phase C: Stale Processed / Ignored Webhook Events
  if (scope === 'all' || scope === 'stale_webhooks') {
    try {
      const webhookCutoff = new Date(Date.now() - retention.webhooksDays * 86400000);
      const query: Record<string, unknown> = {
        status: { $in: ['processed', 'ignored'] },
        createdAt: { $lt: webhookCutoff },
      };

      const count = await WebhookEvent.countDocuments(query);
      scanned += count;
      breakdown.staleWebhookEvents = count;

      if (count > 0) {
        if (!dryRun) {
          const deleteRes = await WebhookEvent.deleteMany(query);
          purged += deleteRes.deletedCount;
        } else {
          purged += count;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Error pruning WebhookEvents: ${msg}`);
    }
  }

  // Phase D: Stale Read Notifications
  if (scope === 'all' || scope === 'read_notifications') {
    try {
      const notificationCutoff = new Date(Date.now() - retention.notificationsDays * 86400000);
      const query: Record<string, unknown> = {
        isRead: true,
        createdAt: { $lt: notificationCutoff },
      };
      if (businessObjectId) {
        query.businessId = businessObjectId;
      }

      const count = await Notification.countDocuments(query);
      scanned += count;
      breakdown.staleReadNotifications = count;

      if (count > 0) {
        if (!dryRun) {
          const deleteRes = await Notification.deleteMany(query);
          purged += deleteRes.deletedCount;
        } else {
          purged += count;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Error pruning Notifications: ${msg}`);
    }
  }

  const durationMs = Date.now() - startTime;

  return {
    dryRun,
    durationMs,
    scanned,
    purged,
    breakdown,
    errors,
    timestamp: new Date(),
  };
}
