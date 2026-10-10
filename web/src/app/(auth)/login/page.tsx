import { Suspense } from "react";
import { Skeleton } from "@/components/spatial";
import { LoginForm } from "@/components/marketing/auth-forms";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Log in",
  description: "Log in to your Lustra shop workspace.",
  path: "/login",
  noIndex: true,
});

export default function LoginPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[520px] w-full max-w-md rounded-[30px]" />}>
      <LoginForm />
    </Suspense>
  );
}
