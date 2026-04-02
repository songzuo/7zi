/**
 * TeamMemberCard - Individual team member card component
 */

import type { TeamMember } from './types'

interface TeamMemberCardProps {
  member: TeamMember
  translations: {
    name: string
    role: string
    description: string
    skills: string[]
  }
}

export function TeamMemberCard({ member, translations }: TeamMemberCardProps) {
  return (
    <div className="group relative rounded-2xl bg-white p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl dark:bg-zinc-900">
      {/* Gradient border effect */}
      <div
        className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${member.color} -z-10 opacity-0 blur-sm transition-opacity duration-300 group-hover:opacity-100`}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 -z-10 rounded-2xl bg-white transition-colors duration-300 group-hover:bg-zinc-50 dark:bg-zinc-900 dark:group-hover:bg-zinc-800"
        aria-hidden="true"
      />

      <div className="mb-4 text-5xl" aria-hidden="true">
        {member.emoji}
      </div>
      <h3 className="mb-1 text-xl font-bold text-zinc-900 dark:text-white">{translations.name}</h3>
      <p
        className={`bg-gradient-to-r text-sm font-medium ${member.color} mb-4 bg-clip-text text-transparent`}
      >
        {translations.role}
      </p>
      <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        {translations.description}
      </p>

      {/* Skills */}
      <div className="mt-4 flex flex-wrap gap-2">
        {translations.skills.map((skill: string, i: number) => (
          <span
            key={`${member.key}-skill-${i}`}
            className={`rounded-full bg-gradient-to-r px-2 py-1 text-xs ${member.color} text-white/90`}
          >
            {skill}
          </span>
        ))}
      </div>
    </div>
  )
}
