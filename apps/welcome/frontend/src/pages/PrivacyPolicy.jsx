import React from 'react';

function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto p-8 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Privacy Policy</h1>
      
      <div className="space-y-6 text-gray-700">
        <section>
          <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
          <p>
            This Privacy Policy describes how we collect, use, and protect your personal information when you use our AI-powered maintenance planning platform and services.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>
          <div className="space-y-3">
            <div>
              <h3 className="font-medium">Personal Information:</h3>
              <p>Name, email address, contact information, and account credentials.</p>
            </div>
            <div>
              <h3 className="font-medium">Usage Data:</h3>
              <p>Information about how you use our service, including maintenance plans created, equipment data, and system interactions.</p>
            </div>
            <div>
              <h3 className="font-medium">Technical Information:</h3>
              <p>IP address, browser type, device information, and cookies.</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>To provide and maintain our service</li>
            <li>To notify you about changes to our service</li>
            <li>To provide customer support</li>
            <li>To gather analysis or valuable information to improve our service</li>
            <li>To monitor the usage of our service</li>
            <li>To detect, prevent and address technical issues</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">4. Data Sharing and Disclosure</h2>
          <p>
            We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy. We may share information in the following circumstances:
          </p>
          <ul className="list-disc pl-6 space-y-2 mt-3">
            <li>With service providers who assist us in operating our website</li>
            <li>To comply with legal obligations</li>
            <li>To protect and defend our rights and property</li>
            <li>With your consent</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">5. Data Security</h2>
          <p>
            We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">6. Data Retention</h2>
          <p>
            We retain your personal information only for as long as necessary to fulfill the purposes for which it was collected, including for the purposes of satisfying any legal, regulatory, tax, accounting, or reporting requirements.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">7. Your Rights</h2>
          <p>
            Depending on your location, you may have certain rights regarding your personal information, including:
          </p>
          <ul className="list-disc pl-6 space-y-2 mt-3">
            <li>The right to access your personal information</li>
            <li>The right to rectification of inaccurate data</li>
            <li>The right to erasure of your personal information</li>
            <li>The right to restrict processing</li>
            <li>The right to data portability</li>
            <li>The right to object to processing</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">8. Cookies and Tracking</h2>
          <p>
            We use cookies and similar tracking technologies to track activity on our service and store certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">9. Children's Privacy</h2>
          <p>
            Our service is not intended for use by children under the age of 13. We do not knowingly collect personal information from children under 13.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">10. Changes to This Privacy Policy</h2>
          <p>
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">11. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us through the appropriate channels provided on our website.
          </p>
        </section>
      </div>
      
      <div className="mt-8 pt-6 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}

export default PrivacyPolicy;