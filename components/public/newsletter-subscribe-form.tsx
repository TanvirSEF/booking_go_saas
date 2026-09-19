'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { IconMail, IconLoader2, IconSend, IconCheck } from '@tabler/icons-react';
import { toast } from 'sonner';
import { subscribeNewsletterAction } from '@/actions/subscribe';

interface NewsletterSubscribeFormProps {
  businessSlug: string;
  theme?: string;
  source?: string;
  title?: string;
  description?: string;
  className?: string;
  variant?: 'card' | 'compact' | 'inline';
}

export function NewsletterSubscribeForm({
  businessSlug,
  theme = 'default',
  source = 'footer',
  title = 'Subscribe to our newsletter',
  description = 'Get the latest updates, promotions, and announcements delivered to your inbox.',
  className = '',
  variant = 'card',
}: NewsletterSubscribeFormProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = email.trim();
    if (!trimmed) {
      toast.error('Please enter your email address.');
      return;
    }

    // Basic format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await subscribeNewsletterAction({
        businessSlug,
        email: trimmed,
        theme,
        source,
      });

      if (res.success) {
        toast.success(res.message || 'Thank you for subscribing to our newsletter!');
        setEmail('');
        setIsSubscribed(true);
        setTimeout(() => setIsSubscribed(false), 5000);
      } else {
        toast.error(res.error || 'Failed to subscribe. Please try again.');
      }
    } catch {
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (variant === 'compact' || variant === 'inline') {
    return (
      <form onSubmit={handleSubmit} className={`relative flex items-center gap-2 ${className}`}>
        <div className="relative flex-1">
          <IconMail
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            disabled={isLoading}
            required
            className="pl-9 pr-3 h-9 text-xs bg-background border-input"
            aria-label="Email for newsletter"
          />
        </div>
        <Button
          type="submit"
          size="sm"
          disabled={isLoading}
          className="h-9 text-xs gap-1.5 shrink-0 cursor-pointer font-medium"
        >
          {isLoading ? (
            <>
              <IconLoader2 size={14} className="animate-spin" />
              <span className="hidden sm:inline">Subscribing...</span>
            </>
          ) : isSubscribed ? (
            <>
              <IconCheck size={14} />
              <span className="hidden sm:inline">Subscribed!</span>
            </>
          ) : (
            <>
              <IconSend size={14} />
              <span>Subscribe</span>
            </>
          )}
        </Button>
      </form>
    );
  }

  return (
    <div
      className={`rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xs text-card-foreground ${className}`}
    >
      <div className="flex items-start gap-4">
        <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
          <IconMail size={20} />
        </div>
        <div className="space-y-1 flex-1">
          <h3 className="text-base font-semibold text-foreground tracking-tight">
            {title}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 flex flex-col sm:flex-row items-stretch gap-2.5">
        <div className="relative flex-1">
          <IconMail
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            disabled={isLoading}
            required
            className="pl-9 pr-3 h-10 text-xs bg-background border-input"
            aria-label="Email address"
          />
        </div>
        <Button
          type="submit"
          disabled={isLoading}
          className="h-10 text-xs gap-1.5 px-5 cursor-pointer font-medium"
        >
          {isLoading ? (
            <>
              <IconLoader2 size={15} className="animate-spin" />
              <span>Subscribing...</span>
            </>
          ) : isSubscribed ? (
            <>
              <IconCheck size={15} />
              <span>Subscribed</span>
            </>
          ) : (
            <>
              <IconSend size={15} />
              <span>Subscribe</span>
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
