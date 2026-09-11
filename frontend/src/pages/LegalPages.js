import React from 'react';
import { useParams, Link } from 'react-router-dom';

const BUSINESS = {
  name: 'Masterliqours',
  entity: 'HarNova Technology',
  email: 'hello@masterliqours.my',
  address: 'Kuala Lumpur, Malaysia',
  updated: '12 September 2026',
};

const PAGES = {
  privacy: {
    title: 'Privacy Policy',
    content: [
      { h: 'Introduction', p: `${BUSINESS.name} operated by ${BUSINESS.entity} is committed to protecting your personal data in accordance with Malaysia's Personal Data Protection Act 2010 (PDPA). This policy explains what data we collect, why, and your rights.` },
      { h: 'Data We Collect', p: 'We collect: (1) Account information — name, email address, phone number when you register. (2) Order information — delivery address, items ordered, payment status. (3) Technical data — IP address, browser type, pages visited, via Cloudflare analytics. (4) Communications — messages you send us via WhatsApp or email.' },
      { h: 'Why We Collect It', p: 'We use your data to: process and deliver your orders; send order confirmations and updates; manage your loyalty points and rewards tier; respond to your enquiries; improve the website. We do not sell your data to third parties.' },
      { h: 'Legal Basis (PDPA)', p: 'We process your data with your consent given at registration, and for the performance of a contract (your order). You may withdraw consent at any time by contacting us, though this may affect your ability to use our services.' },
      { h: 'Third Parties', p: 'We share necessary data with: Supabase (database hosting, servers in Asia Pacific); Cloudflare (CDN, analytics — no cookies by default); WhatsApp Business (order communications). All processors are bound by data processing agreements.' },
      { h: 'Data Retention', p: 'We retain account data for as long as your account is active. Order records are kept for 7 years as required by Malaysian accounting law. You may request deletion of your account at any time.' },
      { h: 'Your Rights', p: 'Under the PDPA you have the right to: access your personal data; correct inaccurate data; withdraw consent; request deletion. Contact us at hello@masterliqours.my to exercise these rights.' },
      { h: 'Cookies', p: 'We use only a session cookie (HttpOnly, Secure) required for login. We do not use advertising or tracking cookies. See our Cookie Policy for details.' },
      { h: 'Contact', p: `For privacy enquiries: ${BUSINESS.email}` },
    ],
  },
  terms: {
    title: 'Terms & Conditions',
    content: [
      { h: 'Agreement', p: `By using ${BUSINESS.name} you agree to these Terms. If you do not agree, do not use our services. We reserve the right to update these Terms; continued use constitutes acceptance.` },
      { h: 'Eligibility', p: 'You must be 21 years of age or older to purchase alcohol. By placing an order you confirm you are of legal drinking age. We reserve the right to cancel orders and request age verification. It is illegal to purchase alcohol for minors.' },
      { h: 'Orders & Payment', p: 'Orders are placed through the website. Payment is confirmed via WhatsApp before delivery. Prices are in Malaysian Ringgit (MYR) and inclusive of any applicable taxes. We reserve the right to decline any order.' },
      { h: 'Delivery', p: 'We deliver within Kuala Lumpur and Klang Valley only. Delivery times are estimates and not guaranteed. A recipient of legal drinking age must be present to accept delivery. We may refuse delivery if the recipient appears intoxicated or underage.' },
      { h: 'Product Descriptions', p: 'We endeavour to display products accurately. Minor differences in packaging or appearance may occur. Product descriptions are for guidance only and do not constitute a warranty.' },
      { h: 'Responsible Service', p: `${BUSINESS.name} promotes responsible drinking. We support Drink Aware Malaysia. Do not drink and drive. If you or someone you know has a problem with alcohol, please seek help from Alcoholics Anonymous Malaysia (+603-7873 8138).` },
      { h: 'Intellectual Property', p: `All content on this website — text, images, logos — is owned by ${BUSINESS.entity} or its licensors unless stated otherwise. You may not reproduce or redistribute content without written permission.` },
      { h: 'Limitation of Liability', p: `To the fullest extent permitted by Malaysian law, ${BUSINESS.entity} shall not be liable for indirect, incidental, or consequential damages arising from use of our services.` },
      { h: 'Governing Law', p: 'These Terms are governed by the laws of Malaysia. Any disputes shall be subject to the exclusive jurisdiction of the courts of Malaysia.' },
      { h: 'Contact', p: `Questions about these Terms: ${BUSINESS.email}` },
    ],
  },
  cookies: {
    title: 'Cookie Policy',
    content: [
      { h: 'What are cookies?', p: 'Cookies are small text files stored on your device by your browser. They help websites remember your preferences and login state.' },
      { h: 'Cookies We Use', p: 'We use ONE cookie: a session cookie named "session_token" that keeps you logged in. It is HttpOnly (cannot be accessed by JavaScript), Secure (HTTPS only), and SameSite=None. It expires when you log out or after a period of inactivity. We do not use advertising, marketing, or analytics cookies.' },
      { h: 'Third-Party Cookies', p: 'Cloudflare may set technical cookies necessary for security and performance (DDoS protection, bot detection). These are strictly necessary and cannot be opted out of without blocking the service. See Cloudflare\'s Cookie Policy for details.' },
      { h: 'No Cookie Consent Banner Needed', p: 'Under Malaysia\'s PDPA and our current cookie usage (strictly necessary cookies only), a cookie consent banner is not legally required. We do not use advertising or tracking cookies that would require consent under GDPR or similar regulations.' },
      { h: 'Managing Cookies', p: 'You can delete cookies at any time through your browser settings. Deleting the session cookie will log you out. Blocking all cookies will prevent login from working.' },
      { h: 'Changes', p: 'If we introduce new cookies in future, this policy will be updated and, if required, consent will be sought.' },
      { h: 'Contact', p: `Cookie questions: ${BUSINESS.email}` },
    ],
  },
  refund: {
    title: 'Refund & Returns Policy',
    content: [
      { h: 'Our Policy', p: 'We want you to be completely satisfied with your purchase. Due to the nature of alcohol products and Malaysian law, we can only accept returns in specific circumstances.' },
      { h: 'Eligible for Refund/Replacement', p: 'We will replace or refund products that are: (1) Damaged or broken on delivery — contact us within 24 hours with photo evidence; (2) Incorrect items delivered — wrong product or quantity; (3) Expired products — where applicable; (4) Significantly different from the description.' },
      { h: 'Not Eligible', p: 'We cannot accept returns for: change of mind; products that have been opened or consumed; incorrect order placed by the customer (though we will try to assist); products damaged due to customer mishandling after delivery.' },
      { h: 'How to Request', p: `WhatsApp or email us at ${BUSINESS.email} within 24 hours of delivery. Include your order number, photos of the issue, and your preferred resolution (replacement or refund). We aim to resolve all issues within 2 business days.` },
      { h: 'Refund Method', p: 'Approved refunds are processed via the original payment method or as store credit, at your preference. Processing time is 3-5 business days.' },
      { h: 'Consumer Rights', p: 'Nothing in this policy limits your rights under the Malaysian Consumer Protection Act 1999.' },
      { h: 'Contact', p: `Refund enquiries: ${BUSINESS.email} or WhatsApp +60182085097` },
    ],
  },
};

export default function LegalPage() {
  const { page } = useParams();
  const data = PAGES[page];

  if (!data) return (
    <div className="min-h-screen bg-[#030303] text-white flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-4">📄</div>
        <p className="text-white/50 mb-4">Page not found</p>
        <Link to="/" className="text-[#ff007f] hover:underline">Go home</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#030303] text-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Back */}
        <Link to="/" className="text-white/40 hover:text-white text-sm flex items-center gap-2 mb-8 transition-colors">
          ← Back to Masterliqours
        </Link>

        {/* Header */}
        <div className="mb-10">
          <h1 className="font-display text-4xl lg:text-5xl neon-pink-text mb-3">{data.title}</h1>
          <p className="text-white/40 text-sm">
            {BUSINESS.name} · {BUSINESS.entity} · Last updated: {BUSINESS.updated}
          </p>
        </div>

        {/* Content */}
        <div className="space-y-8">
          {data.content.map((section, i) => (
            <div key={i} className="border-b border-white/5 pb-8 last:border-0">
              <h2 className="text-white font-bold text-lg mb-3">{section.h}</h2>
              <p className="text-white/60 leading-relaxed text-sm">{section.p}</p>
            </div>
          ))}
        </div>

        {/* Footer links */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <p className="text-white/30 text-xs mb-4">Related policies:</p>
          <div className="flex flex-wrap gap-4">
            {Object.entries(PAGES).filter(([k]) => k !== page).map(([k, v]) => (
              <Link key={k} to={`/legal/${k}`} className="text-[#ff007f] hover:underline text-sm">{v.title}</Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
