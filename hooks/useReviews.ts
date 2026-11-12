'use client';

import { useEffect, useRef, useState } from 'react';
import type { Review } from '@/lib/ai/types';

const KEY = 'phoneReviews';
type Reviews = Record<string, Review[]>;

export function useReviews() {
  const [reviews, setReviews] = useState<Reviews>({});
  const current = useRef<Reviews>({});
  const [storageError, setStorageError] = useState('');
  useEffect(() => {
    try {
      const value: unknown = JSON.parse(localStorage.getItem(KEY) || '{}');
      const valid: Reviews = Object.create(null);
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        for (const [name, items] of Object.entries(value)) {
          if (Array.isArray(items)) valid[name] = items.filter((item): item is Review =>
            item && typeof item.author === 'string' && typeof item.comment === 'string' &&
            Number.isInteger(item.rating) && item.rating >= 1 && item.rating <= 5);
        }
      }
      current.current = valid;
      setReviews(valid);
    } catch { setStorageError('Saved reviews could not be read. New reviews will stay in this session.'); }
  }, []);

  function addReview(phoneName: string, review: Review) {
    if (!phoneName.trim() || !review.comment.trim() || !Number.isInteger(review.rating) || review.rating < 1 || review.rating > 5) return false;
    const existing = Object.hasOwn(current.current, phoneName) ? current.current[phoneName] : [];
    const next = { ...current.current, [phoneName]: [...existing, { ...review, comment: review.comment.trim(), author: review.author.trim() || 'Anonymous' }] };
    current.current = next;
    setReviews(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); setStorageError(''); }
    catch { setStorageError('Browser storage is unavailable. Your review is kept for this session only.'); }
    return true;
  }

  const getReviewsForPhone = (name: string) => Object.hasOwn(reviews, name) ? reviews[name] : [];
  const getAverageRatingForPhone = (name: string) => {
    const items = getReviewsForPhone(name);
    return items.length ? items.reduce((total, item) => total + item.rating, 0) / items.length : 0;
  };
  return { reviews, addReview, getReviewsForPhone, getAverageRatingForPhone, storageError };
}
