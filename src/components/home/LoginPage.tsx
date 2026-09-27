"use client";

import { FamilyrLogo } from "@/components/FamilyrLogo";
import { GoogleSignInButton } from "@/components/home/GoogleSignInButton";
import type { PublicSupabaseConfig } from "@/lib/supabase/public";
import Link from "next/link";

export function LoginPage({
  next,
  authError,
  supabaseConfig,
}: {
  next: string;
  authError: boolean;
  supabaseConfig: PublicSupabaseConfig | null;
}) {
  return (
    <div className="flex min-h-full flex-col bg-ground">
      <header className="border-b border-line bg-surface px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-md items-center justify-between gap-4">
          <FamilyrLogo />
        </div>
      </header>

      <main id="main-content" className="mx-auto w-full max-w-md flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="text-2xl font-bold text-ink">Sign in</h1>
        <p className="mt-2 text-sm leading-6 text-mute">
          Welcome back. Google sign-in opens your circle. Calendar is optional, we wont grab it unless you connect it.
        </p>

        <section className="mt-8 border border-line bg-surface p-5">
          {authError ? (
            <p className="mb-3 text-sm text-ember" role="alert">
              Sign-in did not finish. Try again.
            </p>
          ) : null}
          <GoogleSignInButton
            next={next}
            supabaseConfig={supabaseConfig}
            authFlow="login"
            variant="primary"
            label="Sign in with Google"
          />
        </section>

        <p className="mt-6 text-sm text-mute">
          New to Familyr?{" "}
          <Link href={`/signup?next=${encodeURIComponent(next)}`} className="font-medium text-clinic underline-offset-4 hover:underline">
            Sign up
          </Link>
        </p>
        <p className="mt-3 text-sm text-mute">
          <Link href="/" className="font-medium text-clinic underline-offset-4 hover:underline">
            Back to home
          </Link>
        </p>
      </main>
    </div>
  );
}
