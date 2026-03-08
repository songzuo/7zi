'use client';

import React from 'react';
import { TeamMemberCard } from './TeamMemberCard';

interface TeamMemberWithContent {
  id: number;
  emoji: string;
  color: string;
  key: string;
  category: string;
  name: string;
  role: string;
  description: string;
  skills: string[];
}

interface TeamGridProps {
  members: TeamMemberWithContent[];
}

export function TeamGrid({ members }: TeamGridProps) {
  return (
    <section className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {members.map((member) => (
            <TeamMemberCard
              key={member.id}
              member={member}
              name={member.name}
              role={member.role}
              description={member.description}
              skills={member.skills}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
