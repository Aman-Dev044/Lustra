import Link from "next/link";
import { Container, Glass } from "@/components/spatial";
import { Breadcrumbs } from "@/components/marketing/sections";
import { breadcrumbLd, buildMetadata, JsonLd } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata = buildMetadata({
  title: "Terms of Service",
  description: "The terms that govern use of the Lustra shop management platform, subscriptions, payments and add-ons.",
  path: "/legal/terms",
});

const crumbs = [
  { name: "Home", path: "/" },
  { name: "Terms of Service", path: "/legal/terms" },
];

export default function TermsPage() {
  return (
    <section className="pt-32 pb-12 sm:pt-40">
      <Container className="max-w-3xl">
        <Breadcrumbs items={crumbs} />
        <h1 className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Terms of Service</h1>
        <p className="mt-3 text-sm text-ink-3">Effective date: March 1, 2026 · Last updated: August 1, 2026</p>
        <Glass className="mt-10 p-6 sm:p-10">
          <div className="prose-spatial">
            <p>
              These Terms of Service (“Terms”) form an agreement between you (the business or person creating an account, “you”) and{" "}
              {site.legalName} (“Lustra,” “we,” “us”) governing your use of the Lustra platform, apps and related services (the
              “Service”). By creating an account or using the Service you agree to these Terms.
            </p>

            <h2>1. Accounts</h2>
            <ul>
              <li>You must be at least 18 and authorized to bind your business.</li>
              <li>You are responsible for your users, their roles and keeping credentials secure.</li>
              <li>Every plan includes unlimited users; each user must have their own login.</li>
            </ul>

            <h2>2. Plans, trials and billing</h2>
            <p>
              Current plans are Express ($70/month or $840/year), Pro ($110/month or $1,320/year) and Enterprise ($183/month or
              $2,200/year). The optional 3D Visualizer add-on is $150/month. Prices exclude applicable taxes. See{" "}
              <Link href="/pricing">Pricing</Link> for features included in each plan.
            </p>
            <ul>
              <li><strong>Free trial:</strong> new accounts receive a 14-day trial. No charge occurs unless you choose a plan.</li>
              <li><strong>No long-term contracts:</strong> monthly plans renew monthly; yearly plans renew yearly. You may cancel at any time, effective at the end of the current billing period.</li>
              <li><strong>Changes:</strong> upgrades take effect immediately and are prorated; downgrades take effect at the next renewal.</li>
              <li><strong>Price changes:</strong> we will give at least 30 days’ notice before any price change affects your subscription.</li>
              <li><strong>Refunds:</strong> fees are non-refundable except as required by law or under our 60-day switching guarantee described on our website.</li>
            </ul>

            <h2>3. Payment processing</h2>
            <p>
              LustraPay payment processing is provided by our licensed payment partners and is subject to their terms, which you
              accept when you activate payments. Published rates are 2.6% + 10¢ for in-person and 2.9% + 30¢ for online
              transactions unless otherwise agreed in writing. Chargebacks, refunds and disputes are your responsibility as the
              merchant.
            </p>

            <h2>4. Your data</h2>
            <p>
              You own your business content and your customers’ data. You grant Lustra a limited license to host, process and
              display it solely to provide and improve the Service. You can export your data at any time. Our handling of personal
              information is described in the <Link href="/legal/privacy">Privacy Policy</Link>.
            </p>

            <h2>5. Your responsibilities</h2>
            <ul>
              <li>Obtain any consents required to message your customers by SMS or email, and honor opt-outs.</li>
              <li>Comply with laws that apply to your business, including consumer protection, warranty and vehicle regulations such as window tint limits.</li>
              <li>Ensure prices, warranties and certificates you issue through the Service are accurate.</li>
            </ul>

            <h2>6. Acceptable use</h2>
            <p>You may not:</p>
            <ul>
              <li>Send spam or unlawful messages, or upload malicious code.</li>
              <li>Attempt to access other accounts or probe, scan or overload the Service.</li>
              <li>Resell or sublicense the Service without written permission.</li>
              <li>Use the Service to issue fraudulent certificates, invoices or records.</li>
            </ul>

            <h2>7. AI-assisted features</h2>
            <p>
              Features such as the AI Quote Copilot provide suggestions based on your catalog and inputs. Suggestions may be
              incomplete or inaccurate; you are responsible for reviewing quotes before sending them to customers.
            </p>

            <h2>8. Availability and support</h2>
            <p>
              We aim for 99.9% monthly uptime excluding scheduled maintenance, and provide live chat support on all plans.
              Enterprise customers receive a dedicated account executive.
            </p>

            <h2>9. Intellectual property</h2>
            <p>
              The Service, including its software, design and trademarks, is owned by Lustra. Feedback you provide may be used to
              improve the Service without obligation to you.
            </p>

            <h2>10. Termination</h2>
            <p>
              You may cancel at any time from Settings. We may suspend or terminate accounts that violate these Terms or fail to pay,
              with notice where practical. After termination, your data remains available for export for 90 days.
            </p>

            <h2>11. Disclaimers and limitation of liability</h2>
            <p>
              Except as expressly stated, the Service is provided “as is.” To the maximum extent permitted by law, Lustra’s total
              liability for any claim is limited to the fees you paid in the 12 months before the claim, and Lustra is not liable for
              indirect, incidental, special or consequential damages, or lost profits.
            </p>

            <h2>12. Indemnity</h2>
            <p>
              You will defend and indemnify Lustra against claims arising from your business content, your messages to customers, or
              your violation of these Terms or applicable law.
            </p>

            <h2>13. Governing law</h2>
            <p>
              These Terms are governed by the laws of the State of Texas, without regard to conflict-of-law rules. Disputes will be
              resolved in the state or federal courts located in Travis County, Texas.
            </p>

            <h2>14. Changes to these Terms</h2>
            <p>We may update these Terms. Material changes will be notified at least 30 days in advance.</p>

            <h2>15. Contact</h2>
            <p>
              Questions? Email <a href={`mailto:${site.email}`}>{site.email}</a> or write to {site.legalName}, {site.address.street},{" "}
              {site.address.city}, {site.address.region} {site.address.postalCode}.
            </p>
          </div>
        </Glass>
      </Container>
      <JsonLd data={breadcrumbLd(crumbs)} />
    </section>
  );
}
