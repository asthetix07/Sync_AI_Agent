import React from "react";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white/80 p-8 md:p-16">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 font-sync-ai">Privacy Policy</h1>
          <p className="text-lg text-white/60">Your privacy matters to us. Here is exactly what we collect and why.</p>
          <p className="text-sm text-white/40 mt-1">Effective Date: May 12, 2026 | Sync-ai.dev</p>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">1. Introduction</h2>
          <p>Welcome to Sync-ai.dev ("we," "us," or "our"). This Privacy Policy explains how we collect, use, and protect information when you use our service. By using Sync-ai.dev, you agree to the terms of this policy.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">2. Information We Collect</h2>
          <h3 className="text-lg font-medium text-white/90">2.1 Information from Google OAuth</h3>
          <p>When you sign in using Google OAuth, we receive only the following data from Google, strictly for the purpose of creating your profile:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Email address — used as your unique account identifier and for transactional communications.</li>
            <li>Display name — used to personalize your in-app experience.</li>
            <li>Profile photo — displayed as your avatar within the platform.</li>
          </ul>
          <p>We do not request access to your Google Drive, Gmail, Contacts, Calendar, or any other Google service. Our OAuth scope is limited to the minimum required for profile creation.</p>
          
          <h3 className="text-lg font-medium text-white/90 mt-6">2.2 Information We Do Not Collect</h3>
          <p>We do not collect:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Passwords (Google manages authentication entirely)</li>
            <li>Payment or financial information</li>
            <li>Location data</li>
            <li>Browsing history or behavioral tracking data</li>
            <li>Any data beyond what is listed in Section 2.1</li>
          </ul>

          <h3 className="text-lg font-medium text-white/90 mt-6">2.3 Automatically Collected Data</h3>
          <p>Like most web services, we may automatically collect limited technical data such as your IP address, browser type, and usage timestamps. This data is used solely for security, abuse prevention, and service reliability.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">3. How We Use Your Information</h2>
          <p>The data we collect is used exclusively for:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Creating and maintaining your user account</li>
            <li>Displaying your name and photo within the platform</li>
            <li>Sending essential service communications (e.g., account security alerts)</li>
            <li>Improving the reliability and performance of our service</li>
          </ul>
          <p>We do not use your information for advertising, profiling, or any purpose not listed above.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">4. Data Sharing and Third Parties</h2>
          <p>We do not sell, rent, or share your personal data with third parties for marketing purposes. We may share limited data only in the following circumstances:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Service providers: We may use trusted infrastructure providers (e.g., hosting, analytics) that process data on our behalf under strict confidentiality agreements.</li>
            <li>Legal compliance: We may disclose information if required by law, court order, or to protect the rights and safety of our users.</li>
            <li>Business transfers: In the event of a merger or acquisition, user data may be transferred. We will notify you in advance if this occurs.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">5. Data Retention</h2>
          <p>We retain your profile data (email, name, photo) for as long as your account is active. If you delete your account, all associated personal data is permanently removed from our systems within 30 days.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">6. Your Rights</h2>
          <p>You have the right to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Access the personal data we hold about you</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your account and all associated data</li>
            <li>Withdraw consent at any time by disconnecting Google OAuth from your Google account settings</li>
          </ul>
          <p>To exercise any of these rights, contact us at: privacy@sync-ai.dev</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">7. Security</h2>
          <p>We implement industry-standard security measures including HTTPS encryption in transit and access controls to protect your data. However, no system is 100% secure, and we cannot guarantee absolute security.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">8. Children's Privacy</h2>
          <p>Sync-ai.dev is not directed at children under the age of 13. We do not knowingly collect personal information from children. If you believe a child has provided us with information, please contact us and we will promptly delete it.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">9. Changes to This Policy</h2>
          <p>We may update this Privacy Policy from time to time. We will notify you of material changes by posting a notice on our platform or by email. Continued use of the service after changes constitutes acceptance of the updated policy.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">10. Contact Us</h2>
          <p>If you have any questions about this Privacy Policy, please contact us at:</p>
          <p>Email:{" "}<a href="mailto:contact@sync-ai.dev" className="text-blue-400 hover:underline">contact@sync-ai.dev</a><br />Website:{" "}<a href="https://sync-ai.dev" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline"> https://sync-ai.dev</a></p>
        </section>
      </div>
    </div>
  );
}
