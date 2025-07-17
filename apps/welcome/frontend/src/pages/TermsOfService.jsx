import React from 'react';

function TermsOfService() {
  return (
    <div className="max-w-4xl mx-auto p-8 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Terms of Service</h1>
      
      <div className="space-y-6 text-gray-700">
        <section>
          <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
          <p>
            By accessing and using this website, you accept and agree to be bound by the terms and provision of this agreement.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
          <p>
            This website provides AI-powered maintenance planning tools and services for equipment management. The service includes features for creating maintenance schedules, safety procedures, and asset management.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">3. User Responsibilities</h2>
          <p>
            Users are responsible for maintaining the confidentiality of their account information and for all activities that occur under their account. Users must provide accurate and complete information when using the service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">4. Acceptable Use</h2>
          <p>
            Users must use this service in accordance with all applicable laws and regulations. The service may not be used for any unlawful, harmful, or fraudulent purposes.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">5. Intellectual Property</h2>
          <p>
            All content, features, and functionality on this website are owned by the company and are protected by international copyright, trademark, and other intellectual property laws.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">6. Disclaimer of Warranties</h2>
          <p>
            The service is provided on an "as is" and "as available" basis. We make no warranties, expressed or implied, and hereby disclaim all warranties including without limitation, implied warranties of merchantability, fitness for a particular purpose, or non-infringement.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">7. Limitation of Liability</h2>
          <p>
            In no event shall the company be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">8. Termination</h2>
          <p>
            We may terminate or suspend access to our service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">9. Changes to Terms</h2>
          <p>
            We reserve the right to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 30 days notice prior to any new terms taking effect.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">10. Contact Information</h2>
          <p>
            If you have any questions about these Terms of Service, please contact us through the appropriate channels provided on our website.
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

export default TermsOfService;