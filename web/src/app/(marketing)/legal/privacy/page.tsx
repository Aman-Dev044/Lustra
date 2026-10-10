import { Container, Glass } from "@/components/spatial";
import { Breadcrumbs } from "@/components/marketing/sections";
import { breadcrumbLd, buildMetadata, JsonLd } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata = buildMetadata({
  title: "Privacy Policy",
  description: "How Lustra collects, uses, shares and protects personal information for shops and their customers.",
  path: "/legal/privacy",
});

const crumbs = [
  { name: "Home", path: "/" },
  { name: "Privacy Policy", path: "/legal/privacy" },
];

export default function PrivacyPage() {
  return (
    <section className="pt-32 pb-12 sm:pt-40">
      <Container className="max-w-3xl">
        <Breadcrumbs items={crumbs} />
        <h1 className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Privacy Policy</h1>
        <p className="mt-3 text-sm text-ink-3">Effective date: March 1, 2026 · Last updated: August 1, 2026</p>
        <Glass className="mt-10 p-6 sm:p-10">
          <div className="prose-spatial">
            <p>
              This Privacy Policy explains how {site.legalName} (“Lustra,” “we,” “us”) collects, uses and protects information when
              you visit our websites, use the Lustra applications on web, iOS and Android (the “Service”), or interact with a business
              that uses Lustra. We built Lustra for shop owners who care about their customers, and we treat your data with the same
              care.
            </p>

            <h2>1. Our two roles</h2>
            <p>
              <strong>Controller.</strong> For information about our own customers (shop owners and their staff) and website visitors,
              Lustra is the controller.
            </p>
            <p>
              <strong>Processor.</strong> When a shop uses Lustra to manage its own customers — names, contact details, vehicles,
              appointments, photos, invoices — the shop is the controller and Lustra processes that data on the shop’s behalf under our
              Terms of Service and Data Processing Addendum. If you are a customer of a shop, please contact that shop with privacy
              requests; we will assist them.
            </p>

            <h2>2. Information we collect</h2>
            <ul>
              <li><strong>Account information:</strong> name, email, phone, business name, password (stored as a salted hash) and role.</li>
              <li><strong>Business content:</strong> customers, vehicles, services, quotes, jobs, inspection photos and videos, messages, invoices and certificates you enter or upload.</li>
              <li><strong>Payment information:</strong> handled by our PCI-DSS compliant payment partners. Lustra does not store full card numbers.</li>
              <li><strong>Usage information:</strong> device and browser type, IP address, pages viewed, features used and diagnostic logs.</li>
              <li><strong>Communications:</strong> support chats, emails, demo requests and survey responses.</li>
              <li><strong>Cookies:</strong> strictly necessary cookies for authentication and security, and — with consent where required — analytics cookies.</li>
            </ul>

            <h2>3. How we use information</h2>
            <ul>
              <li>Provide, secure and maintain the Service, including real-time sync between devices.</li>
              <li>Process payments, subscriptions and payouts.</li>
              <li>Send transactional messages such as confirmations, reminders and receipts on a shop’s behalf.</li>
              <li>Provide support, onboarding and data migration.</li>
              <li>Improve the Service using aggregated, de-identified usage data.</li>
              <li>Detect and prevent fraud, abuse and security incidents.</li>
              <li>Comply with legal obligations.</li>
            </ul>
            <p>We do not sell personal information, and we do not use shops’ customer data to market to those customers.</p>

            <h2>4. AI features</h2>
            <p>
              Features such as the AI Quote Copilot analyze the text you provide together with your own service catalog to suggest
              quote line items. Suggestions are generated for your account only; we do not use your business content to train
              models offered to other customers.
            </p>

            <h2>5. How we share information</h2>
            <ul>
              <li><strong>Service providers</strong> who host infrastructure, deliver SMS and email, process payments and provide support tooling — bound by contract to protect your data.</li>
              <li><strong>Integrations you enable</strong>, such as accounting or payment platforms.</li>
              <li><strong>Legal requirements</strong>, when required by law or to protect rights, property or safety.</li>
              <li><strong>Business transfers</strong>, in connection with a merger or acquisition, subject to this policy.</li>
            </ul>

            <h2>6. Data retention</h2>
            <p>
              We keep account and business content for as long as your account is active. After cancellation, data is retained for 90
              days so you can reactivate or export it, then deleted or anonymized within a further 30 days, except where we must keep
              records for legal, tax or fraud-prevention purposes.
            </p>

            <h2>7. Security</h2>
            <p>
              Data is encrypted in transit (TLS 1.2+) and at rest. Access is role-based and logged, passwords are hashed, customer
              portal links use unguessable tokens, and we run regular security reviews. No system is perfectly secure, so please use a
              strong, unique password.
            </p>

            <h2>8. Your rights</h2>
            <p>
              Depending on where you live, you may have rights to access, correct, delete or port your personal information, and to
              object to or restrict certain processing. California residents have rights under the CCPA/CPRA, including the right to
              know and to delete. To exercise your rights, email <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>. We
              will not discriminate against you for exercising them.
            </p>

            <h2>9. Text messaging</h2>
            <p>
              Shops using Lustra send appointment and service messages to customers who have provided their number. Message frequency
              varies. Reply STOP to opt out and HELP for help. Message and data rates may apply.
            </p>

            <h2>10. Children</h2>
            <p>The Service is not directed to children under 16, and we do not knowingly collect their information.</p>

            <h2>11. International transfers</h2>
            <p>
              Lustra is based in the United States. When data is transferred internationally we use appropriate safeguards such as
              Standard Contractual Clauses.
            </p>

            <h2>12. Changes</h2>
            <p>
              We may update this policy. For material changes we will notify account owners by email or in the app at least 30 days
              before they take effect.
            </p>

            <h2>13. Contact</h2>
            <p>
              {site.legalName}, {site.address.street}, {site.address.city}, {site.address.region} {site.address.postalCode} ·{" "}
              <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>
            </p>
          </div>
        </Glass>
      </Container>
      <JsonLd data={breadcrumbLd(crumbs)} />
    </section>
  );
}
