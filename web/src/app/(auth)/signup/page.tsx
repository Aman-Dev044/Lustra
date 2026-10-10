import { Suspense } from "react";
import { Skeleton } from "@/components/spatial";
import { SignupForm } from "@/components/marketing/auth-forms";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Start your free trial",
  description: "Create your Lustra workspace in under a minute. 14-day free trial, unlimited users, no credit card required.",
  path: "/signup",
  noIndex: true,
});

export default function SignupPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[560px] w-full max-w-lg rounded-[30px]" />}>
      <SignupForm />
    </Suspense>
  );
}
