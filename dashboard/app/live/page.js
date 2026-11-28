import { redirect } from 'next/navigation';

/** The dashboard moved to "/". Old /live links still work. */
export default function LiveRedirect() {
  redirect('/');
}
