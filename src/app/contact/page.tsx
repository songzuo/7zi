import { redirect } from 'next/navigation';

export default function ContactPage() {
  // Redirect to the default locale version
  redirect('/zh/contact');
}