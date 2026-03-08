'use client';

import React from 'react';
import { TeamMemberCard, TeamMember } from './TeamMemberCard';

interface TeamGridProps {
  members: TeamMember[];
  getMemberData: (key: string) => {
    name: string;
    role: string;
    description: string;
    skills: string[];
  };
}

export function TeamGrid({ members, getMemberData }: TeamGridProps) {
  return (
    <section className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {members.map((member) => {
            const memberData = getMemberData(member.key);
            return (
              <TeamMemberCard
                key={member.id}
                member={member}
                name={memberData.name}
                role={memberData.role}
                description={memberData.description}
                skills={memberData.skills}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
