import { redirect } from 'next/navigation';

export default function TeamPage() {
  // Redirect to the default locale version
  redirect('/zh/team');
}