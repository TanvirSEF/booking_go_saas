'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  IconDeviceMobile,
  IconSparkles,
  IconInfoCircle,
} from '@tabler/icons-react';
import type { CustomFieldDTO } from '@/types/custom-field';

interface FieldPreviewCardProps {
  fields: CustomFieldDTO[];
  activeFieldId?: string | null;
}

export function FieldPreviewCard({ fields, activeFieldId }: FieldPreviewCardProps) {
  return (
    <Card className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden sticky top-20">
      {/* Card Header resembling Step 4 of the public booking engine */}
      <CardHeader className="p-5 border-b border-border/60 bg-muted/20">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-primary">
            <IconDeviceMobile size={18} />
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Booking Engine Live Preview
            </span>
          </div>
          <Badge variant="outline" className="text-[10px] font-semibold py-0.5 px-2 rounded-md">
            Step 4: Details
          </Badge>
        </div>
        <CardTitle className="text-base font-bold text-foreground mt-1 flex items-center gap-1.5">
          <span>Customer Intake Questionnaire</span>
          <IconSparkles size={16} className="text-primary shrink-0" />
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          How intake questions appear to clients booking an appointment on your public portal.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-5 space-y-4 max-h-[calc(100vh-220px)] overflow-y-auto">
        {fields.length === 0 ? (
          <div className="py-12 text-center rounded-xl border border-dashed border-border/80 p-6 space-y-2 bg-muted/10">
            <IconInfoCircle size={24} className="text-muted-foreground mx-auto" />
            <p className="text-xs font-semibold text-foreground">No Custom Fields Configured</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Add your first intake question (e.g., license plate, specific requests, or health notes) to preview it here.
            </p>
          </div>
        ) : (
          fields.map((f, idx) => {
            const isHighlighted = activeFieldId === f.id;

            return (
              <div
                key={f.id}
                className={`p-3.5 rounded-xl border transition-all space-y-2 ${
                  isHighlighted
                    ? 'border-primary bg-primary/5 shadow-2xs'
                    : 'border-border/70 bg-card hover:border-border'
                }`}
              >
                {/* Field Label & Required tag */}
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <span className="text-muted-foreground font-mono text-[10px]">
                      #{idx + 1}
                    </span>
                    <span>{f.label}</span>
                    {f.isRequired && <span className="text-destructive">*</span>}
                  </Label>
                  <Badge variant="secondary" className="text-[10px] font-medium py-0 px-1.5 rounded-md capitalize">
                    {f.type}
                  </Badge>
                </div>

                {/* Simulated Input by Field Type */}
                {f.type === 'text' && (
                  <Input
                    placeholder={f.placeholder || 'Enter response...'}
                    defaultValue={f.defaultValue}
                    disabled
                    className="h-8 rounded-lg text-xs bg-muted/20 border-border cursor-not-allowed"
                  />
                )}

                {f.type === 'number' && (
                  <Input
                    type="number"
                    placeholder={f.placeholder || '0'}
                    defaultValue={f.defaultValue}
                    disabled
                    className="h-8 rounded-lg text-xs bg-muted/20 border-border cursor-not-allowed"
                  />
                )}

                {f.type === 'email' && (
                  <Input
                    type="email"
                    placeholder={f.placeholder || 'name@domain.com'}
                    defaultValue={f.defaultValue}
                    disabled
                    className="h-8 rounded-lg text-xs bg-muted/20 border-border cursor-not-allowed"
                  />
                )}

                {f.type === 'date' && (
                  <Input
                    type="date"
                    defaultValue={f.defaultValue}
                    disabled
                    className="h-8 rounded-lg text-xs bg-muted/20 border-border cursor-not-allowed"
                  />
                )}

                {f.type === 'textarea' && (
                  <Textarea
                    placeholder={f.placeholder || 'Enter notes or instructions...'}
                    defaultValue={f.defaultValue}
                    rows={2}
                    disabled
                    className="rounded-lg text-xs bg-muted/20 border-border resize-none cursor-not-allowed"
                  />
                )}

                {f.type === 'select' && (
                  <Select disabled defaultValue={f.defaultValue || f.options[0]}>
                    <SelectTrigger className="h-8 rounded-lg text-xs bg-muted/20 border-border cursor-not-allowed font-medium">
                      <SelectValue placeholder={f.placeholder || 'Select an option...'} />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border bg-card">
                      {f.options.map((opt) => (
                        <SelectItem key={opt} value={opt} className="text-xs">
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {f.type === 'radio' && (
                  <RadioGroup defaultValue={f.defaultValue || f.options[0]} disabled className="gap-2 pt-1">
                    {f.options.map((opt) => (
                      <div key={opt} className="flex items-center gap-2">
                        <RadioGroupItem value={opt} id={`prev-radio-${f.id}-${opt}`} />
                        <Label
                          htmlFor={`prev-radio-${f.id}-${opt}`}
                          className="text-xs text-foreground cursor-not-allowed font-normal"
                        >
                          {opt}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {f.type === 'checkbox' && (
                  <div className="space-y-1.5 pt-1">
                    {f.options.map((opt) => (
                      <div key={opt} className="flex items-center gap-2">
                        <Checkbox id={`prev-chk-${f.id}-${opt}`} disabled />
                        <Label
                          htmlFor={`prev-chk-${f.id}-${opt}`}
                          className="text-xs text-foreground cursor-not-allowed font-normal"
                        >
                          {opt}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
