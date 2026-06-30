/**
 * Root page — redirects to /dashboard if signed in, /login if not.
 * Actual auth gate logic lives in the (auth) layout.
 */

import { redirect } from "next/navigation";

export default function HomePage() {
  // The app shell handles auth routing. The root just redirects.
  redirect("/dashboard");
}
