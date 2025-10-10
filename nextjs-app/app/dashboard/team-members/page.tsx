import { redirect } from 'next/navigation';

export default function TeamMembersRedirect() {
  redirect('/dashboard/teams');
}
