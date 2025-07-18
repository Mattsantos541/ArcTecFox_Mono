import React from 'react';

function PrivacyPolicy() {
  return (
    <div className="prose max-w-4xl mx-auto p-8">
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-4">Privacy Policy for ArcTecFox</h1>
        <p className="text-lg text-gray-600">
          <strong>Effective Date:</strong> July 2025
        </p>
      </div>

      <div className="space-y-12">
        <section>
          <h2 className="text-2xl font-semibold mb-6">1. Introduction</h2>
          <div className="ml-8">
            <p className="text-gray-700 leading-relaxed">
              ArcTecFox ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy outlines the types of information we collect, how we use it, how it may be shared, and your rights with respect to your data.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-6">2. Information We Collect</h2>
          <div className="ml-8">
            <ul className="space-y-3 text-gray-700">
              <li>• Contact details: full name, email address, company name</li>
              <li>• Account login credentials and user settings</li>
              <li>• Asset and maintenance-related data submitted by users</li>
              <li>• Log data such as IP address, browser type, and device information</li>
              <li>• Usage behavior within the ArcTecFox platform</li>
              <li>• Third-party service connection data (e.g., eMaint CMMS sync info)</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-6">3. Methods of Collection</h2>
          <div className="ml-8">
            <ul className="space-y-3 text-gray-700">
              <li>• User submissions through forms, uploads, and settings</li>
              <li>• Automated collection through cookies and similar technologies</li>
              <li>• Authentication systems including Google OAuth</li>
              <li>• Data from connected integrations and services</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-6">4. Purpose of Data Collection</h2>
          <div className="ml-8">
            <ul className="space-y-3 text-gray-700">
              <li>• To provide, operate, and maintain the ArcTecFox platform</li>
              <li>• To generate preventive maintenance plans and analytics</li>
              <li>• To personalize the user experience</li>
              <li>• To communicate with users about system updates, releases, and support</li>
              <li>• To ensure the security and integrity of our systems</li>
              <li>• To comply with legal obligations and client contracts</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-6">5. Data Sharing and Disclosure</h2>
          <div className="ml-8">
            <p className="text-gray-700 leading-relaxed mb-4">
              We may share personal data only as needed with:
            </p>
            <ul className="space-y-3 text-gray-700">
              <li>• Cloud infrastructure providers (e.g., Supabase, Render, Vercel)</li>
              <li>• Authentication and identity services (e.g., Google OAuth)</li>
              <li>• Analytics providers (e.g., Google Analytics)</li>
              <li>• Authorized client integrations (e.g., CMMS platforms)</li>
              <li>• Legal authorities if required under law</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-6">6. Cookies and Tracking Technologies</h2>
          <div className="ml-8">
            <p className="text-gray-700 leading-relaxed">
              We use essential and analytical cookies to improve platform performance and understand usage trends. You can control cookie settings through your browser.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-6">7. Data Retention</h2>
          <div className="ml-8">
            <p className="text-gray-700 leading-relaxed">
              We retain data only for as long as necessary to fulfill its intended purpose or comply with our legal obligations. Users may request data deletion at any time.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-6">8. Data Security</h2>
          <div className="ml-8">
            <ul className="space-y-3 text-gray-700">
              <li>• Encryption of data in transit and at rest</li>
              <li>• Role-Based Access Control (RBAC)</li>
              <li>• Row-Level Security (RLS) for multi-tenant separation</li>
              <li>• Audit logs of access, actions, and sync activity</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-6">9. Your Rights</h2>
          <div className="ml-8">
            <p className="text-gray-700 leading-relaxed mb-4">
              Depending on your jurisdiction, you may have the right to:
            </p>
            <ul className="space-y-3 text-gray-700">
              <li>• Access the data we hold about you</li>
              <li>• Correct inaccurate information</li>
              <li>• Request deletion or restriction of processing</li>
              <li>• Withdraw consent or object to data processing</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-6">10. International Transfers</h2>
          <div className="ml-8">
            <p className="text-gray-700 leading-relaxed">
              We may transfer your data to systems located in other countries with appropriate safeguards in place (e.g., standard contractual clauses).
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-6">11. Changes to This Privacy Policy</h2>
          <div className="ml-8">
            <p className="text-gray-700 leading-relaxed">
              We may update this Privacy Policy periodically. If we make material changes, we will notify you via email or a prominent notice on our platform. The effective date will always be displayed above.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-6">12. Contact Us</h2>
          <div className="ml-8">
            <p className="text-gray-700 leading-relaxed">
              For questions or requests regarding your privacy, please email: 
              <a href="mailto:support@arctecfox.com" className="text-blue-600 hover:text-blue-800 font-medium ml-1">
                support@arctecfox.com
              </a>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

export default PrivacyPolicy;