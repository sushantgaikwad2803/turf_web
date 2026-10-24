import React from 'react';

const TermsConditions: React.FC = () => {
  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.hash = 'home';
    }
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: '28px',
  };

  const headingStyle: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: 700,
    color: '#172033',
    marginBottom: '10px',
  };

  const paragraphStyle: React.CSSProperties = {
    fontSize: '15px',
    lineHeight: 1.8,
    color: '#526071',
    margin: '0 0 12px',
  };

  const listStyle: React.CSSProperties = {
    ...paragraphStyle,
    paddingLeft: '22px',
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#f7f9fc',
        padding: '32px 16px 60px',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <button
          type="button"
          onClick={goBack}
          style={{
            border: '1px solid #dce3ed',
            background: '#ffffff',
            color: '#172033',
            padding: '10px 16px',
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
            marginBottom: '24px',
          }}
        >
          ← Go Back
        </button>

        <article
          style={{
            background: '#ffffff',
            border: '1px solid #e7ebf2',
            borderRadius: '18px',
            padding: 'clamp(20px, 5vw, 44px)',
            boxShadow: '0 8px 30px rgba(23, 32, 51, 0.05)',
            overflowWrap: 'anywhere',
          }}
        >
          <header style={{ marginBottom: '32px' }}>
            <p
              style={{
                color: '#64748b',
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '2px',
                textTransform: 'uppercase',
                marginBottom: '10px',
              }}
            >
              TURFBOOKING
            </p>

            <h1
              style={{
                fontSize: 'clamp(30px, 5vw, 42px)',
                lineHeight: 1.2,
                color: '#172033',
                margin: '0 0 14px',
                fontWeight: 800,
              }}
            >
              Terms &amp; Conditions
            </h1>

            <p style={paragraphStyle}>
              Please read these Terms &amp; Conditions carefully before using
              TurfBooking to discover, reserve, or pay for a sports facility.
            </p>

            <p style={{ ...paragraphStyle, fontSize: '13px' }}>
              Effective date: 19 October 2026
            </p>
          </header>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>1. About TurfBooking</h2>
            <p style={paragraphStyle}>
              TurfBooking is an online platform that helps customers discover
              and book sports turfs and related facilities listed by
              independent turf owners. The platform facilitates bookings and
              online payments. Unless expressly stated otherwise, TurfBooking
              does not own, operate, or directly manage the listed facilities.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>2. Acceptance of These Terms</h2>
            <p style={paragraphStyle}>
              By accessing or using TurfBooking, creating an account, making a
              booking, or listing a facility, you agree to these Terms
              &amp; Conditions and our Privacy Policy. If you do not agree,
              please do not use the platform.
            </p>
            <p style={paragraphStyle}>
              You must provide accurate information and use the platform only
              for lawful purposes. You are responsible for maintaining the
              confidentiality of your login credentials and for activity
              carried out through your account, subject to applicable law.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>3. Customer Accounts and Eligibility</h2>
            <ul style={listStyle}>
              <li>
                Provide truthful, complete, and up-to-date registration and
                booking details.
              </li>
              <li>
                Do not impersonate another person, misuse another account, or
                provide false information.
              </li>
              <li>
                Do not use TurfBooking for fraud, unlawful activity, harassment,
                or disruption of the platform.
              </li>
              <li>
                You must have the legal capacity to enter into a binding
                agreement. Where required, a parent or legal guardian must
                arrange use of the service for a minor.
              </li>
            </ul>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>4. Turf Listings and Availability</h2>
            <p style={paragraphStyle}>
              Turf facilities are listed by independent owners or authorized
              representatives. Facility descriptions, photographs, amenities,
              prices, operating rules, and availability should be checked
              before booking.
            </p>
            <p style={paragraphStyle}>
              A booking is subject to the availability shown on the platform
              and confirmation communicated by TurfBooking. If a facility is
              unavailable or a booking cannot be honoured, the customer should
              contact support promptly for assistance and any applicable
              refund.
            </p>
            <p style={paragraphStyle}>
              Turf owners are responsible for ensuring that their listings are
              accurate and that they are authorized to offer the facilities
              listed.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>5. Booking Rules</h2>
            <ul style={listStyle}>
              <li>
                Review the facility, date, time slot, duration, price, and
                applicable rules before confirming a booking.
              </li>
              <li>
                Make bookings using accurate contact and payment details.
              </li>
              <li>
                Arrive on time and follow the facility owner's reasonable
                safety, access, and usage rules.
              </li>
              <li>
                Do not exceed the booked duration or use the facility for
                unauthorized activities.
              </li>
              <li>
                Any extension, additional charge, or change to a booking must
                be agreed through the applicable booking process or directly
                with the authorized facility representative.
              </li>
            </ul>
            <p style={paragraphStyle}>
              A booking confirmation or payment receipt should be retained
              until the reservation is completed or any dispute is resolved.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>6. Prices, Payments, and Cashfree</h2>
            <p style={paragraphStyle}>
              Prices and any applicable charges will be displayed during the
              booking process. The amount shown before payment is the amount
              the customer authorizes for that transaction, subject to any
              clearly disclosed applicable terms.
            </p>
            <p style={paragraphStyle}>
              Online payments are intended to be processed through Cashfree
              Payments or the payment method presented at checkout. Payment
              transactions may be subject to the payment provider's terms,
              verification processes, and security checks.
            </p>
            <ul style={listStyle}>
              <li>
                A booking should be treated as paid only when the payment
                status has been successfully verified by the platform.
              </li>
              <li>
                Do not share your password, OTP, or other authentication
                credentials with anyone claiming to represent TurfBooking.
              </li>
              <li>
                If money is debited but your booking is not confirmed, contact
                support with your booking details and payment reference.
              </li>
              <li>
                Refund processing times may depend on the payment provider and
                the customer's bank or payment method.
              </li>
            </ul>
            <p style={paragraphStyle}>
              Cashfree processes payment transactions under its applicable
              terms and policies. TurfBooking's actual payment, refund, and
              settlement arrangements will be those disclosed in the live
              checkout and applicable platform policies.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>7. Cancellation, Rescheduling, and Refunds</h2>
            <p style={paragraphStyle}>
              Cancellation and rescheduling eligibility depends on the
              cancellation rules disclosed for the booking and the
              circumstances of the request. Please review those rules before
              making payment.
            </p>
            <ul style={listStyle}>
              <li>
                Customers should submit cancellation or rescheduling requests
                through the available booking process or contact support.
              </li>
              <li>
                Refund eligibility and any permitted deductions must follow
                the disclosed booking policy and applicable law.
              </li>
              <li>
                If the turf owner cancels, the facility is unavailable, or a
                confirmed booking cannot be provided, contact TurfBooking for
                resolution and any refund that is due.
              </li>
              <li>
                Refunds, when approved, are generally returned through the
                original payment method where supported, subject to the payment
                provider's process.
              </li>
            </ul>
            <p style={paragraphStyle}>
              No fixed cancellation window, penalty, or refund timeline is
              promised by this section. The final policy should be clearly
              disclosed to customers before payment and applied consistently.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>8. Responsibilities of Turf Owners</h2>
            <p style={paragraphStyle}>
              Owners and authorized listing partners using TurfBooking agree
              to:
            </p>
            <ul style={listStyle}>
              <li>
                Provide accurate information about facilities, availability,
                prices, and applicable restrictions.
              </li>
              <li>
                Keep availability and booking information up to date and honour
                confirmed reservations, except where a valid reason prevents
                this.
              </li>
              <li>
                Maintain the facility in a reasonably safe and usable
                condition and comply with applicable laws and permissions.
              </li>
              <li>
                Communicate material changes, closures, or cancellations
                promptly.
              </li>
              <li>
                Handle customers respectfully and avoid discriminatory,
                fraudulent, or unlawful conduct.
              </li>
              <li>
                Cooperate with booking disputes, complaints, and refund
                resolution.
              </li>
            </ul>
            <p style={paragraphStyle}>
              Turf owners are independent providers and are responsible for
              their facilities, staff, permissions, and services. Any owner
              onboarding agreement or separate written arrangement may also
              apply.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>9. Safety, Conduct, and Property Damage</h2>
            <p style={paragraphStyle}>
              Customers and their guests must follow posted safety
              instructions and reasonable directions from authorized facility
              staff. Users must not damage property, threaten others, engage in
              unlawful conduct, or use a facility in a manner that creates an
              unreasonable safety risk.
            </p>
            <p style={paragraphStyle}>
              Users may be responsible, as determined under applicable law, for
              damage or loss caused by their actions. Any incident, injury, or
              safety concern should be reported promptly to the facility owner
              and, where appropriate, the relevant authorities.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>10. Prohibited Activities</h2>
            <ul style={listStyle}>
              <li>Fraudulent bookings, payment abuse, or false claims.</li>
              <li>
                Unauthorized access to accounts, systems, or other users'
                information.
              </li>
              <li>
                Attempts to disrupt, overload, reverse-engineer, or compromise
                the platform unlawfully.
              </li>
              <li>
                Posting misleading, unlawful, abusive, or infringing content.
              </li>
              <li>
                Reselling bookings or using automated methods to misuse
                availability or booking functions without authorization.
              </li>
            </ul>
            <p style={paragraphStyle}>
              We may investigate suspected misuse and restrict or suspend
              access where reasonably necessary and legally permitted.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>11. Platform Availability and Changes</h2>
            <p style={paragraphStyle}>
              We aim to keep TurfBooking available and accurate, but we do not
              guarantee uninterrupted access, error-free operation, or
              permanent availability of every listing or feature. Maintenance,
              technical issues, or events outside our reasonable control may
              temporarily affect the service.
            </p>
            <p style={paragraphStyle}>
              We may update platform features or these Terms from time to
              time. Updated terms will be published on this page with a revised
              effective date where appropriate. Continued use after an update
              takes effect is subject to applicable law and any required
              consent.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>12. Third-Party Services</h2>
            <p style={paragraphStyle}>
              TurfBooking may rely on third-party services, including payment
              providers and hosting services, to operate certain features.
              Those services may be governed by their own terms and privacy
              policies. We are not responsible for independent third-party
              services beyond responsibilities imposed on us by applicable law.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>13. Disclaimers and Limitation of Liability</h2>
            <p style={paragraphStyle}>
              TurfBooking facilitates discovery and booking of facilities
              provided by independent owners. To the extent permitted by law,
              the platform does not guarantee the condition, suitability, or
              quality of every third-party facility and is not the operator of
              those facilities merely because they are listed on the platform.
            </p>
            <p style={paragraphStyle}>
              Nothing in these Terms excludes or limits a right, remedy,
              guarantee, or liability that cannot lawfully be excluded or
              limited. Any limitation of liability applies only to the extent
              permitted by applicable law.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>14. Privacy</h2>
            <p style={paragraphStyle}>
              Our collection and use of personal information is described in
              the TurfBooking Privacy Policy. By using the platform, you should
              review that policy to understand how your information is handled.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>15. Suspension or Termination</h2>
            <p style={paragraphStyle}>
              We may suspend or restrict an account or listing where there is
              suspected fraud, a material breach of these Terms, a security
              concern, or a legal requirement. Where appropriate and permitted,
              we will provide information about the issue and a way to contact
              support. This does not remove any rights a user has under
              applicable law.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>16. Governing Law and Disputes</h2>
            <p style={paragraphStyle}>
              These Terms are subject to the laws of India. Disputes should
              first be raised with TurfBooking so that the parties can attempt
              to resolve them in good faith. Nothing in this section removes
              any mandatory legal rights or jurisdiction protections available
              to a consumer under applicable law.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>17. Contact Us</h2>
            <p style={paragraphStyle}>
              For questions about these Terms, bookings, payments, or
              complaints, contact TurfBooking:
            </p>
            <p style={paragraphStyle}>
              <strong>Email: </strong>
              <a
                href="mailto:mavinmarvishal601@gmail.com"
                style={{ color: '#2563eb', textDecoration: 'none' }}
              >
                mavinmarvishal601@gmail.com
              </a>
            </p>
          </section>

          <footer
            style={{
              borderTop: '1px solid #e7ebf2',
              paddingTop: '20px',
              marginTop: '36px',
            }}
          >
            <p style={{ ...paragraphStyle, fontSize: '13px', marginBottom: 0 }}>
              By using TurfBooking, you acknowledge that you have read these
              Terms &amp; Conditions.
            </p>
          </footer>
        </article>
      </div>
    </main>
  );
};

export default TermsConditions;
