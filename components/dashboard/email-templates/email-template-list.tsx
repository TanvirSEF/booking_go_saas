"use client";

import * as React from "react";
import Link from "next/link";
import {
  IconEdit,
  IconMail,
  IconRefresh,
  IconSend,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TestEmailModal } from "@/components/dashboard/email-templates/test-email-modal";
import { getEmailTemplatesAction } from "@/actions/email-template";
import type { EmailTemplateListItemDTO } from "@/types/email-template";
import { toast } from "sonner";

interface EmailTemplateListProps {
  initialTemplates: EmailTemplateListItemDTO[];
}

export function EmailTemplateList({
  initialTemplates,
}: EmailTemplateListProps) {
  const [templates, setTemplates] = React.useState<EmailTemplateListItemDTO[]>(initialTemplates);
  const [isLoading, setIsLoading] = React.useState(false);

  // Test Email Modal State
  const [testModalState, setTestModalState] = React.useState<{
    open: boolean;
    templateId: string;
    templateName: string;
    availableLanguages: string[];
  }>({
    open: false,
    templateId: "",
    templateName: "",
    availableLanguages: [],
  });

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const res = await getEmailTemplatesAction();
      if (res.success && res.data) {
        setTemplates(res.data);
      }
    } catch {
      toast.error("Failed to reload email templates.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <h2 className="text-base font-bold text-foreground">
            Notification Templates ({templates.length})
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Personalize messaging for new users, booking confirmations, status updates, and reminders.
          </p>
        </div>

        <Button
          onClick={fetchTemplates}
          variant="outline"
          size="sm"
          disabled={isLoading}
          className="h-8 text-xs font-medium gap-1.5 shadow-2xs shrink-0"
        >
          <IconRefresh size={14} className={isLoading ? "animate-spin" : ""} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Grid of 4 Core Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {templates.map((tpl) => (
          <div
            key={tpl.id}
            className="group relative rounded-2xl border border-border/70 bg-card p-5 shadow-2xs hover:border-border hover:shadow-xs transition-all flex flex-col justify-between space-y-4"
          >
            {/* Header: Icon, Name & Status Badge */}
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shadow-2xs">
                    <IconMail size={20} />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <h3 className="font-bold text-sm text-foreground truncate">
                      {tpl.name}
                    </h3>
                    <p className="text-[11px] text-muted-foreground font-mono truncate">
                      Module: <span className="font-semibold text-foreground capitalize">{tpl.moduleName}</span>
                    </p>
                  </div>
                </div>

                {tpl.isCustomized ? (
                  <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 h-5 shrink-0">
                    Customized
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px] font-medium px-2 py-0.5 h-5 shrink-0">
                    System Default
                  </Badge>
                )}
              </div>

              {/* Default Subject line snippet */}
              <div className="rounded-xl border border-border/50 bg-muted/30 p-3 space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  Default Subject
                </span>
                <p className="text-xs font-medium text-foreground truncate">
                  {tpl.defaultSubject || tpl.name}
                </p>
              </div>
            </div>

            {/* Badges: Languages & Variables */}
            <div className="space-y-3 pt-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground font-medium mr-1">
                  Languages:
                </span>
                {tpl.availableLanguages?.map((lang) => (
                  <Badge
                    key={lang}
                    variant="outline"
                    className="text-[10px] font-bold uppercase border-border/60"
                  >
                    {lang}
                  </Badge>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setTestModalState({
                      open: true,
                      templateId: tpl.id,
                      templateName: tpl.name,
                      availableLanguages: tpl.availableLanguages,
                    })
                  }
                  className="h-8 text-xs font-semibold gap-1.5 shadow-2xs"
                >
                  <IconSend size={13} />
                  <span>Send Test</span>
                </Button>

                <Button asChild size="sm" className="h-8 text-xs font-semibold gap-1.5 shadow-2xs">
                  <Link href={`/dashboard/settings/email-templates/${tpl.slug}`}>
                    <IconEdit size={13} />
                    <span>Edit Template</span>
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Send Test Email Dialog */}
      <TestEmailModal
        open={testModalState.open}
        onOpenChange={(open) =>
          setTestModalState((prev) => ({ ...prev, open }))
        }
        templateId={testModalState.templateId}
        templateName={testModalState.templateName}
        availableLanguages={testModalState.availableLanguages}
      />
    </div>
  );
}
