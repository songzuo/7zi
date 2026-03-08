'use client';

import React from 'react';

export interface TeamMember {
  id: number;
  emoji: string;
  color: string;
  key: string;
  category: string;
}

interface TeamMemberCardProps {
  member: TeamMember;
  name: string;
  role: string;
  description: string;
  skills: string[];
}

export function TeamMemberCard({ member, name, role, description, skills }: TeamMemberCardProps) {
  return (
    <div
      className="group relative bg-white dark:bg-zinc-900 rounded-3xl p-8 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
    >
      {/* Gradient border effect */}
      <div className={`absolute inset-0 rounded-3xl bg-gradient-to-r ${member.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-sm`} aria-hidden="true" />
      <div className="absolute inset-0 rounded-3xl bg-white dark:bg-zinc-900 group-hover:bg-zinc-50 dark:group-hover:bg-zinc-800 transition-colors duration-300 -z-10" aria-hidden="true" />
      
      <div className="text-5xl mb-4" aria-hidden="true">{member.emoji}</div>
      <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-1">
        {name}
      </h3>
      <p className={`text-sm font-medium bg-gradient-to-r ${member.color} bg-clip-text text-transparent mb-4`}>
        {role}
      </p>
      <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
        {description}
      </p>
      
      {/* Skills */}
      <div className="flex flex-wrap gap-2 mt-4">
        {skills?.map((skill: string, i: number) => (
          <span
            key={i}
            className={`text-xs px-2 py-1 rounded-full bg-gradient-to-r ${member.color} text-white/90`}
          >
            {skill}
          </span>
        ))}
      </div>
    </div>
  );
}
