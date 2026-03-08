'use client';

import React from 'react';
import { Link } from '@/i18n/routing';

interface CTASectionProps {
  title: string;
  description: string;
  buttonText: string;
}

export function CTASection({ title, description, buttonText }: CTASectionProps) {
  return (
    <section className="py-20 px-6 bg-gradient-to-r from-cyan-500 to-purple-600">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">{title}</h2>
        <p className="text-xl text-white/80 mb-8">{description}</p>
        <Link href="/contact" className="group inline-flex items-center gap-3 bg-white text-cyan-600 px-10 py-5 rounded-full font-semibold text-lg hover:bg-cyan-50 transition-all duration-300 hover:shadow-2xl hover:scale-105">
          {buttonText}<span className="group-hover:translate-x-2 transition-transform duration-300" aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}