/**
 * FeedbackWidget Component
 * User feedback and rating widget
 */

'use client';

import { useState } from 'react';

export function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const handleSubmit = () => {
    // Submit feedback logic
    console.log({ rating, comment });
    setIsOpen(false);
    setRating(0);
    setComment('');
  };

  if (!isOpen) {
    return (
      <button onClick={() => setIsOpen(true)}>Feedback</button>
    );
  }

  return (
    <div>
      <div>Rate your experience:</div>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => setRating(star)}
        >
          {star <= rating ? '★' : '☆'}
        </button>
      ))}
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Share your feedback..."
      />
      <button onClick={handleSubmit}>Submit</button>
      <button onClick={() => setIsOpen(false)}>Cancel</button>
    </div>
  );
}
