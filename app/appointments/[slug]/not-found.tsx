import React from 'react';
import Link from 'next/link';
import { IconBuildingStore, IconArrowLeft, IconHome } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function AppointmentNotFound() {
  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-border/60 shadow-xl text-center p-6 sm:p-8">
        <CardContent className="space-y-6 pt-4">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto border border-destructive/20 shadow-sm">
            <IconBuildingStore size={32} />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Business Not Found
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We couldn&apos;t find an active booking page for this business. The link may be broken, inactive, or the business slug has changed.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild variant="outline" className="flex items-center gap-2">
              <Link href="/">
                <IconHome size={16} />
                <span>Return Home</span>
              </Link>
            </Button>
            <Button asChild className="flex items-center gap-2">
              <Link href="/login">
                <IconArrowLeft size={16} />
                <span>Member Portal</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
