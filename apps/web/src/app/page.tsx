import { redirect } from 'next/navigation'

export default function Home() {
  // Always send unauthenticated visitors to the login screen when hitting the root URL.
  redirect('/auth/login')
}
