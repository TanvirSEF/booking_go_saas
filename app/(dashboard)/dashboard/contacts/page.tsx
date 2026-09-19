import { Metadata } from "next";
import { getCompanyContactInquiriesAction } from "@/actions/contact-us";
import { ContactInboxTable } from "@/components/dashboard/contacts/contact-inbox-table";
import type { PaginatedContactInquiriesResult } from "@/types/contact-us";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Customer Inquiries | Dashboard",
  description: "View, reply, and manage customer messages and leads received from your public contact forms.",
};

const defaultData: PaginatedContactInquiriesResult = {
  inquiries: [],
  pagination: {
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  },
  counts: {
    total: 0,
    new: 0,
    read: 0,
    replied: 0,
    archived: 0,
  },
};

export default async function DashboardContactsPage() {
  const res = await getCompanyContactInquiriesAction({ page: 1, limit: 15 });
  const initialData: PaginatedContactInquiriesResult = res.data || defaultData;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Customer Inquiries Inbox
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review incoming visitor requests, leave internal staff notes, and track reply follow-ups.
        </p>
      </div>

      <ContactInboxTable initialData={initialData} />
    </div>
  );
}
