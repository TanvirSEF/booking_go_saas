'use client';

import React, { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { DeleteConfirmDialog } from '@/components/dashboard/services/delete-confirm-dialog';
import { AddEditFieldDialog } from './add-edit-field-dialog';
import { FieldPreviewCard } from './field-preview-card';
import {
  IconPlus,
  IconGripVertical,
  IconArrowUp,
  IconArrowDown,
  IconPencil,
  IconTrash,
  IconForms,
  IconAsterisk,
  IconLoader2,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import {
  deleteCustomFieldAction,
  reorderCustomFieldsAction,
} from '@/actions/custom-field';
import type { CustomFieldDTO, CustomFieldType } from '@/types/custom-field';

interface CustomFieldBuilderProps {
  initialFields: CustomFieldDTO[];
}

const TYPE_BADGE_STYLES: Record<CustomFieldType, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  text: { label: 'Text', variant: 'outline' },
  number: { label: 'Number', variant: 'outline' },
  email: { label: 'Email', variant: 'outline' },
  date: { label: 'Date', variant: 'outline' },
  select: { label: 'Dropdown', variant: 'secondary' },
  textarea: { label: 'Multiline Text', variant: 'outline' },
  radio: { label: 'Radio Button', variant: 'secondary' },
  checkbox: { label: 'Checkbox Set', variant: 'secondary' },
};

export function CustomFieldBuilder({ initialFields }: CustomFieldBuilderProps) {
  const [fields, setFields] = useState<CustomFieldDTO[]>(initialFields);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);

  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomFieldDTO | null>(null);

  // Deletion state
  const [fieldToDelete, setFieldToDelete] = useState<CustomFieldDTO | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reordering states
  const [isReordering, startReorderTransition] = useTransition();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Reorder persist helper
  const persistOrder = (newFields: CustomFieldDTO[]) => {
    setFields(newFields);
    startReorderTransition(async () => {
      const orderedIds = newFields.map((f) => f.id);
      const res = await reorderCustomFieldsAction({ orderedIds });
      if (!res.success) {
        toast.error(res.error || 'Failed to save field order.');
      }
    });
  };

  // Move Up
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...fields];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    persistOrder(updated);
  };

  // Move Down
  const handleMoveDown = (index: number) => {
    if (index === fields.length - 1) return;
    const updated = [...fields];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    persistOrder(updated);
  };

  // Drag-and-drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const updated = [...fields];
    const draggedItem = updated[draggedIndex];
    updated.splice(draggedIndex, 1);
    updated.splice(index, 0, draggedItem);
    setDraggedIndex(index);
    setFields(updated);
  };

  const handleDragEnd = () => {
    if (draggedIndex !== null) {
      persistOrder(fields);
      setDraggedIndex(null);
    }
  };

  // Delete handler
  const handleDeleteConfirm = async () => {
    if (!fieldToDelete) return;
    setIsDeleting(true);

    try {
      const res = await deleteCustomFieldAction(fieldToDelete.id);
      if (res.success) {
        toast.success(res.message || 'Custom field deleted.');
        setFields((prev) => prev.filter((f) => f.id !== fieldToDelete.id));
        setFieldToDelete(null);
      } else {
        toast.error(res.error || 'Failed to delete field.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error deleting field.';
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  // Field saved callback from dialog
  const handleFieldSaved = (saved: CustomFieldDTO) => {
    setFields((prev) => {
      const exists = prev.some((f) => f.id === saved.id);
      if (exists) {
        return prev.map((f) => (f.id === saved.id ? saved : f));
      }
      return [...prev, saved];
    });
    setActiveFieldId(saved.id);
  };

  return (
    <div className="space-y-6">
      {/* Action Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 sm:p-5 rounded-2xl border border-border shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-foreground">
              Configured Booking Intake Fields ({fields.length})
            </span>
            {isReordering && (
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 gap-1 text-primary border-primary/30">
                <IconLoader2 size={11} className="animate-spin" />
                <span>Saving order...</span>
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Arrange questions in the exact order clients will complete them during online appointment booking.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => {
            setEditingField(null);
            setIsDialogOpen(true);
          }}
          className="rounded-xl text-xs font-semibold gap-1.5 shrink-0 shadow-2xs"
        >
          <IconPlus size={16} />
          <span>Add Custom Field</span>
        </Button>
      </div>

      {/* Grid: Left Column = Field List | Right Column = Live Wizard Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Reorderable List */}
        <div className="lg:col-span-7 space-y-3">
          {fields.length === 0 ? (
            <Card className="rounded-2xl border-dashed border-border bg-card p-12 text-center shadow-none">
              <CardContent className="p-0 flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
                <div className="size-14 rounded-2xl bg-muted/80 flex items-center justify-center text-muted-foreground border border-border/60">
                  <IconForms size={28} />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-base text-foreground">
                    No Intake Questions Yet
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Custom fields allow you to ask for client information (like VIN, dietary requirements, or emergency contacts) during booking.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setEditingField(null);
                    setIsDialogOpen(true);
                  }}
                  className="rounded-xl text-xs font-semibold gap-1.5 mt-2"
                >
                  <IconPlus size={15} />
                  <span>Create Your First Field</span>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2.5">
              {fields.map((field, index) => {
                const badgeInfo = TYPE_BADGE_STYLES[field.type] || {
                  label: field.type,
                  variant: 'outline',
                };
                const isFirst = index === 0;
                const isLast = index === fields.length - 1;

                return (
                  <div
                    key={field.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    onMouseEnter={() => setActiveFieldId(field.id)}
                    className={`flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl border bg-card shadow-2xs transition-all ${
                      activeFieldId === field.id
                        ? 'border-primary/60 ring-1 ring-primary/20'
                        : 'border-border/80 hover:border-border'
                    } ${draggedIndex === index ? 'opacity-50 scale-[0.99]' : ''}`}
                  >
                    {/* Drag Grip Handle */}
                    <div
                      title="Drag to reorder"
                      className="cursor-grab active:cursor-grabbing text-muted-foreground/60 hover:text-foreground p-1 shrink-0"
                    >
                      <IconGripVertical size={18} />
                    </div>

                    {/* Order Index */}
                    <span className="size-6 rounded-lg bg-muted text-muted-foreground font-mono text-xs font-bold flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>

                    {/* Field Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs sm:text-sm text-foreground truncate">
                          {field.label}
                        </span>
                        {field.isRequired && (
                          <Badge
                            variant="destructive"
                            className="text-[10px] font-bold py-0 px-1.5 rounded-md gap-0.5"
                          >
                            <IconAsterisk size={9} />
                            <span>Required</span>
                          </Badge>
                        )}
                        <Badge
                          variant={badgeInfo.variant}
                          className="text-[10px] font-semibold py-0 px-2 rounded-md"
                        >
                          {badgeInfo.label}
                        </Badge>
                      </div>

                      {field.placeholder && (
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          Placeholder: &quot;{field.placeholder}&quot;
                        </p>
                      )}

                      {field.options && field.options.length > 0 && (
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          Choices: {field.options.join(', ')}
                        </p>
                      )}
                    </div>

                    {/* Up / Down Order Buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleMoveUp(index)}
                        disabled={isFirst || isReordering}
                        className="size-7 rounded-lg text-muted-foreground hover:text-foreground"
                        title="Move Up"
                      >
                        <IconArrowUp size={14} />
                        <span className="sr-only">Move Up</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleMoveDown(index)}
                        disabled={isLast || isReordering}
                        className="size-7 rounded-lg text-muted-foreground hover:text-foreground"
                      >
                        <IconArrowDown size={14} />
                        <span className="sr-only">Move Down</span>
                      </Button>
                    </div>

                    {/* Edit & Delete Action Buttons */}
                    <div className="flex items-center gap-1 shrink-0 pl-1 border-l border-border/60">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingField(field);
                          setIsDialogOpen(true);
                        }}
                        className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
                        title="Edit Field"
                      >
                        <IconPencil size={15} />
                        <span className="sr-only">Edit</span>
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setFieldToDelete(field)}
                        className="size-8 rounded-lg text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                        title="Delete Field"
                      >
                        <IconTrash size={15} />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Live Booking Engine Step 4 Preview */}
        <div className="lg:col-span-5">
          <FieldPreviewCard fields={fields} activeFieldId={activeFieldId} />
        </div>
      </div>

      {/* Add / Edit Dialog */}
      <AddEditFieldDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        fieldToEdit={editingField}
        onFieldSaved={handleFieldSaved}
      />

      {/* Delete Confirmation Alert */}
      <DeleteConfirmDialog
        open={!!fieldToDelete}
        onOpenChange={(open) => !open && setFieldToDelete(null)}
        title="Delete Custom Field"
        description="Are you sure you want to delete this intake question? Existing answers from previous bookings will remain preserved in historical records."
        itemName={fieldToDelete?.label}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </div>
  );
}
