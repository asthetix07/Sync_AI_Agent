import React from "react";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white/80 p-8 md:p-16">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 font-sync-ai">Terms of Service</h1>
          <p className="text-lg text-white/60">Please read these terms carefully before using our platform.</p>
          <p className="text-sm text-white/40 mt-1">Effective Date: May 12, 2026 | Sync-ai.dev</p>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">1. Acceptance of Terms</h2>
          <p>By accessing or using Sync-ai.dev ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree, do not use the Service. These Terms apply to all users of the platform.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">2. Eligibility</h2>
          <p>You must be at least 13 years of age to use this Service. By using the Service, you represent that you meet this age requirement and that your use complies with all applicable laws in your jurisdiction.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">3. Your Account</h2>
          <h3 className="text-lg font-medium text-white/90">3.1 Google OAuth Sign-In</h3>
          <p>Account creation requires signing in with a valid Google account. You are responsible for maintaining the security of your Google account and for all activity that occurs under your account on our platform.</p>
          
          <h3 className="text-lg font-medium text-white/90 mt-6">3.2 Accurate Information</h3>
          <p>You agree that the information provided through Google OAuth (name, email, photo) is accurate and current. We are not responsible for issues arising from inaccurate information associated with your Google account.</p>
          
          <h3 className="text-lg font-medium text-white/90 mt-6">3.3 Account Termination</h3>
          <p>We reserve the right to suspend or terminate your account at our sole discretion if you violate these Terms, engage in abusive behavior, or if required by law.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">4. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Use the Service for any unlawful purpose or in violation of any regulations</li>
            <li>Attempt to gain unauthorized access to any part of the Service or its infrastructure</li>
            <li>Interfere with or disrupt the integrity or performance of the Service</li>
            <li>Transmit any harmful, offensive, or malicious content through the platform</li>
            <li>Impersonate any person or entity or misrepresent your affiliation with any person or entity</li>
            <li>Reverse-engineer, decompile, or attempt to extract the source code of the Service</li>
            <li>Use automated bots, scrapers, or tools to access the Service without our prior written consent</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">5. Intellectual Property</h2>
          <p>All content, trademarks, logos, software, and other materials associated with Sync-ai.dev are the exclusive property of Sync-ai.dev or its licensors. You are granted a limited, non-exclusive, non-transferable license to use the Service for personal, non-commercial purposes. You may not reproduce, distribute, or create derivative works from our content without express written permission.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">6. User Content</h2>
          <p>If you submit any content through the Service (e.g., comments, data, or files), you grant us a non-exclusive, worldwide, royalty-free license to use, store, and display that content solely for the purpose of operating and improving the Service. You retain all ownership rights to your content.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">7. Privacy</h2>
          <p>Your use of the Service is also governed by our Privacy Policy, which is incorporated into these Terms by reference. Please review our Privacy Policy at https://Sync-ai.dev/privacy to understand our data practices.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">8. Third-Party Services</h2>
          <p>Our Service integrates with Google OAuth for authentication. Your use of Google's services is subject to Google's own Terms of Service and Privacy Policy, which we encourage you to review. We are not responsible for the practices of any third-party services.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">9. Disclaimers</h2>
          <p className="uppercase text-sm leading-relaxed">The Service is provided "as is" and "as available" without warranties of any kind, either express or implied. To the fullest extent permitted by law, Sync-ai.dev disclaims all warranties, including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that the Service will be uninterrupted, error-free, or secure.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">10. Limitation of Liability</h2>
          <p className="uppercase text-sm leading-relaxed">To the maximum extent permitted by applicable law, Sync-ai.dev shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of the Service, even if advised of the possibility of such damages. Our total liability shall not exceed the amount you paid to use the Service in the past three (3) months.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">11. Indemnification</h2>
          <p>You agree to indemnify and hold harmless Sync-ai.dev, its officers, directors, employees, and agents from any claims, damages, losses, or expenses (including reasonable legal fees) arising out of your use of the Service, your violation of these Terms, or your infringement of any third-party rights.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">12. Modifications to the Service or Terms</h2>
          <p>We reserve the right to modify or discontinue the Service at any time without notice. We may also update these Terms from time to time. Material changes will be communicated via email or an in-app notification. Continued use of the Service after changes are posted constitutes your acceptance of the revised Terms.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">13. Governing Law</h2>
          <p>These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which Sync-ai.dev operates, without regard to its conflict of law provisions. Any disputes shall be resolved in the competent courts of that jurisdiction.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">14. Severability</h2>
          <p>If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary, and the remaining Terms shall remain in full force and effect.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">15. Contact Us</h2>
          <p>If you have any questions about these Terms of Service, please contact us at:</p>
          <p>Email:{" "}<a href="mailto:contact@sync-ai.dev" className="text-blue-400 hover:underline">contact@sync-ai.dev</a><br />Website:{" "}<a href="https://sync-ai.dev" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline"> https://sync-ai.dev</a></p>
        </section>
      </div>
    </div>
  );
}
