import { redirect } from 'next/navigation';

export default function ExpiringDocumentsRedirect() {
  redirect('/dashboard/documents?status=expiring');
}
