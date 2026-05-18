import { redirect } from "next/navigation";

// Root simply redirects to /login. AppShell will redirect to /create
// automatically if the user is already authenticated.
export default function Home() {
  redirect("/login");
}
