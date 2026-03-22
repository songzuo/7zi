/**
 * Team Translation Helpers
 */

import type { TeamMember, CollaborationItem } from './types';

export interface TeamTranslations {
  hero: {
    badge: string;
    title: string;
    description: string;
    stats: {
      members: { value: string; label: string };
      coverage: { value: string; label: string };
      support: { value: string; label: string };
    };
  };
  collaboration: {
    title: string;
    description: string;
    items: Record<string, { title: string; description: string }>;
  };
  cta: {
    title: string;
    description: string;
    button: string;
  };
  members: Record<
    string,
    {
      name: string;
      role: string;
      description: string;
      skills: string[];
    }
  >;
}

 
export type GetTranslationsFunction = (config: {
  namespace: string;
  locale: string;
}) => Promise<TranslationDict>;

/** Callable translation object returned by getTranslations */
interface TranslationDict {
  (key: string): string;
  raw(key: string): unknown;
}

/**
 * Get team member translations
 */
export async function getTeamMemberTranslations(
  member: TeamMember,
  getTranslations: GetTranslationsFunction,
  locale: string
): Promise<{
  name: string;
  role: string;
  description: string;
  skills: string[];
}> {
  const tMembers = (await getTranslations({
    locale,
    namespace: 'team.members',
  })) as TranslationDict;

  return {
    name: tMembers(`${member.key}.name`),
    role: tMembers(`${member.key}.role`),
    description: tMembers(`${member.key}.description`),
    skills: (tMembers.raw(`${member.key}.skills`) as string[]) ?? [],
  };
}

/**
 * Get collaboration item translations
 */
export async function getCollaborationTranslations(
  item: CollaborationItem,
  getTranslations: GetTranslationsFunction,
  locale: string
): Promise<{ title: string; description: string }> {
  const tTeam = (await getTranslations({
    locale,
    namespace: 'team',
  })) as TranslationDict;

  return {
    title: tTeam(`collaboration.items.${item.key}.title`),
    description: tTeam(`collaboration.items.${item.key}.description`),
  };
}
