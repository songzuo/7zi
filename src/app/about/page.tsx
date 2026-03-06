import { redirect } from 'next/navigation';

export default function AboutPage() {
  // Redirect to the default locale version
  redirect('/zh/about');
}