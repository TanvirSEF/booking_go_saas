'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  IconStarFilled,
  IconStar,
  IconChevronLeft,
  IconChevronRight,
  IconQuote,
  IconCircleCheckFilled,
} from '@tabler/icons-react';
import { getPublicTestimonialsAction } from '@/actions/testimonial';
import type { TestimonialDTO } from '@/types/testimonial';

interface TestimonialsSliderProps {
  businessSlug?: string;
  testimonials?: TestimonialDTO[];
  title?: string;
  subtitle?: string;
  className?: string;
  autoplay?: boolean;
  autoplayInterval?: number;
}

function getInitials(name: string): string {
  if (!name.trim()) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function renderStars(rating: number) {
  return (
    <div className="flex items-center gap-1" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        star <= rating ? (
          <IconStarFilled key={star} size={16} className="text-amber-500" />
        ) : (
          <IconStar key={star} size={16} className="text-muted-foreground/30" />
        )
      ))}
    </div>
  );
}

export function TestimonialsSlider({
  businessSlug,
  testimonials: initialTestimonials,
  title = 'What Our Clients Say',
  subtitle = 'Genuine reviews from verified appointments and satisfied clients.',
  className = '',
  autoplay = true,
  autoplayInterval = 6000,
}: TestimonialsSliderProps) {
  const [fetchedReviews, setFetchedReviews] = useState<TestimonialDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(
    !initialTestimonials && Boolean(businessSlug)
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch reviews if not provided via props
  useEffect(() => {
    if (initialTestimonials || !businessSlug) return;

    let isMounted = true;
    async function loadTestimonials() {
      setLoading(true);
      try {
        const res = await getPublicTestimonialsAction(businessSlug as string);
        if (isMounted && res.success && res.data) {
          setFetchedReviews(res.data.filter((r) => r.isActive));
        }
      } catch {
        // Graceful fallback
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadTestimonials();
    return () => {
      isMounted = false;
    };
  }, [businessSlug, initialTestimonials]);

  const reviews = initialTestimonials
    ? initialTestimonials.filter((r) => r.isActive)
    : fetchedReviews;

  const count = reviews.length;

  const nextSlide = useCallback(() => {
    if (count <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % count);
  }, [count]);

  const prevSlide = useCallback(() => {
    if (count <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + count) % count);
  }, [count]);

  // Autoplay management
  useEffect(() => {
    if (!autoplay || count <= 1 || isHovered) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      nextSlide();
    }, autoplayInterval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoplay, count, isHovered, autoplayInterval, nextSlide]);

  if (loading) {
    return (
      <div className={`w-full py-8 space-y-4 ${className}`}>
        <div className="h-6 w-48 bg-muted rounded-md animate-pulse mx-auto" />
        <div className="h-4 w-72 bg-muted/60 rounded-md animate-pulse mx-auto" />
        <div className="h-44 w-full max-w-2xl bg-card border border-border rounded-2xl animate-pulse mx-auto mt-6" />
      </div>
    );
  }

  if (count === 0) {
    return null;
  }

  const current = reviews[currentIndex];

  return (
    <section
      aria-label="Customer Testimonials"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative w-full overflow-hidden rounded-2xl border border-border/80 bg-linear-to-b from-card to-card/60 p-6 sm:p-8 shadow-xs ${className}`}
    >
      {/* Header */}
      <div className="text-center max-w-xl mx-auto mb-6 space-y-1">
        {title && (
          <h3 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
            {title}
          </h3>
        )}
        {subtitle && (
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      {/* Main Slider Carousel */}
      <div className="relative max-w-2xl mx-auto">
        <Card className="border-border bg-card/90 backdrop-blur-xs shadow-xs rounded-xl overflow-hidden transition-all duration-300">
          <CardContent className="p-6 sm:p-8 space-y-5">
            {/* Top Row: Quote Icon & Star Rating */}
            <div className="flex items-center justify-between">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <IconQuote size={18} />
              </div>
              <div className="flex items-center gap-2">
                {renderStars(current.rating || 5)}
                <Badge
                  variant="secondary"
                  className="text-[10px] font-medium px-2 py-0 h-5 inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                >
                  <IconCircleCheckFilled size={11} />
                  <span>Verified Client</span>
                </Badge>
              </div>
            </div>

            {/* Review Description */}
            <blockquote className="text-sm sm:text-base font-normal text-foreground/90 italic leading-relaxed min-h-[72px]">
              &ldquo;{current.description}&rdquo;
            </blockquote>

            {/* Reviewer Details */}
            <div className="pt-4 border-t border-border flex items-center gap-3">
              <Avatar className="size-10 border border-border">
                {current.image ? (
                  <AvatarImage src={current.image} alt={current.name} />
                ) : null}
                <AvatarFallback className="text-xs font-bold bg-primary text-primary-foreground">
                  {getInitials(current.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground truncate">
                  {current.name}
                </div>
                {current.title ? (
                  <div className="text-xs text-muted-foreground truncate">
                    {current.title}
                  </div>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation Arrows (shown if more than 1 review) */}
        {count > 1 && (
          <>
            <Button
              variant="outline"
              size="icon"
              onClick={prevSlide}
              aria-label="Previous testimonial"
              className="absolute -left-3 sm:-left-5 top-1/2 -translate-y-1/2 size-8 sm:size-9 rounded-full bg-background/90 shadow-md border border-border cursor-pointer hover:bg-background transition-all"
            >
              <IconChevronLeft size={16} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={nextSlide}
              aria-label="Next testimonial"
              className="absolute -right-3 sm:-right-5 top-1/2 -translate-y-1/2 size-8 sm:size-9 rounded-full bg-background/90 shadow-md border border-border cursor-pointer hover:bg-background transition-all"
            >
              <IconChevronRight size={16} />
            </Button>
          </>
        )}
      </div>

      {/* Pagination Dots */}
      {count > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-5" role="tablist">
          {reviews.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              aria-selected={currentIndex === idx}
              role="tab"
              className={`transition-all rounded-full cursor-pointer ${
                currentIndex === idx
                  ? 'h-2 w-6 bg-primary'
                  : 'size-2 bg-muted-foreground/30 hover:bg-muted-foreground/60'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
