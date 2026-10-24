// import React from 'react';

const SUPPORT_EMAIL = 'infranovatechofficial@gmail.com';

const refundSections = [
  {
    title: '1. Overview',
    paragraphs: [
      'TurfBooking provides an online platform for discovering turfs and booking available courts or time slots. This Refund & Cancellation Policy explains how booking cancellations, payment failures and refund requests are handled.',
      'Refund eligibility may depend on the cancellation terms displayed during booking, the applicable turf owner’s policy and the circumstances of the request. Please review the booking details and cancellation terms before confirming payment.',
    ],
  },
  {
    title: '2. Booking Cancellation',
    paragraphs: [
      'Customers should review the cancellation terms applicable to their selected turf and time slot before making a booking.',
    ],
    bullets: [
      'If cancellation is permitted, customers should submit the cancellation request through the available booking options or contact support.',
      'Any cancellation deadline, cancellation charge or refund amount will depend on the terms disclosed for that booking.',
      'A booking may not be eligible for a refund if the applicable cancellation deadline has passed or the disclosed booking terms exclude refunds.',
      'Submitting a cancellation request does not automatically mean that a refund has been approved.',
    ],
  },
  {
    title: '3. Refund Eligibility',
    paragraphs: [
      'A refund may be considered in circumstances such as the following, subject to verification and the applicable booking terms:',
    ],
    bullets: [
      'The turf owner cancels a confirmed booking and the customer is eligible for a refund under the applicable terms.',
      'A booking cannot be provided because of an issue attributable to the turf or platform.',
      'A payment is successfully collected but the booking is not confirmed.',
      'The same booking payment is collected more than once and the duplicate transaction is verified.',
      'A payment is completed incorrectly or an amount requires correction after verification.',
    ],
    extra:
      'Refunds are not guaranteed in every situation. Requests are reviewed based on the transaction, booking status, applicable terms and available evidence.',
  },
  {
    title: '4. Non-Refundable Situations',
    paragraphs: [
      'Where permitted by applicable law and the terms disclosed before booking, a refund may not be available in situations such as:',
    ],
    bullets: [
      'The customer does not arrive for the booking or does not use the reserved time slot.',
      'The customer requests cancellation after the permitted cancellation deadline.',
      'The customer changes their plans after a booking becomes non-cancellable under the disclosed terms.',
      'The booking has already been used or completed.',
    ],
    extra:
      'These situations are subject to the specific booking terms and applicable consumer-protection laws. Exceptions may be considered where the turf owner or platform is responsible for the failure to provide the service.',
  },
  {
    title: '5. Failed, Pending and Duplicate Payments',
    paragraphs: [
      'If money is debited from your account but the booking is not confirmed, first check the booking status and payment status. Some transactions may remain pending while the payment provider or bank completes verification.',
      'If a duplicate payment is detected, or a payment remains unresolved, contact support with the transaction reference, booking details and payment date. Do not share your UPI PIN, card PIN, password or OTP.',
    ],
  },
  {
    title: '6. Refund Processing Time',
    paragraphs: [
      'Once a refund is approved, it will be initiated through the relevant payment provider or payment method, where supported.',
      'The time taken for the refunded amount to appear in your account depends on the payment provider, bank and payment method. Processing times can vary, and TurfBooking cannot guarantee an exact credit date.',
      'If an approved refund has not appeared within the timeline communicated by the payment provider, contact support with your booking and transaction reference.',
    ],
  },
  {
    title: '7. How to Request a Refund',
    paragraphs: [
      'To request a cancellation review or refund, contact TurfBooking using the support email below. Include the following details so that the request can be reviewed:',
    ],
    bullets: [
      'Your registered name and contact details.',
      'Booking ID or booking reference, if available.',
      'Turf name and booking date and time.',
      'Payment transaction reference and amount paid.',
      'A short explanation of the issue and relevant supporting evidence, if available.',
    ],
    extra:
      'Please do not include passwords, OTPs, UPI PINs or full payment-card details in your message.',
  },
  {
    title: '8. Turf Owner Cancellations and Service Issues',
    paragraphs: [
      'If a turf owner cancels a confirmed booking or the reserved service cannot be provided, contact TurfBooking promptly. We may verify the booking with the turf owner and payment provider before determining the appropriate resolution under the applicable terms.',
      'Depending on the circumstances and applicable law, the resolution may include a refund or another mutually agreed solution. An alternative booking will not be imposed without your agreement.',
    ],
  },
  {
    title: '9. Refund Status and Disputes',
    paragraphs: [
      'TurfBooking may request additional information to verify a refund request. We aim to communicate the outcome once the relevant details have been reviewed.',
      'If you disagree with the outcome or a refund is delayed, contact support with your existing case details. You may also contact your payment provider or bank regarding a transaction dispute, subject to their procedures and applicable law.',
    ],
  },
  {
    title: '10. Policy Updates',
    paragraphs: [
      'TurfBooking may update this policy when its services, payment processes or legal obligations change. The updated version will be published on this page with a revised “Last updated” date. The terms applicable to an existing booking will be considered alongside applicable law.',
    ],
  },
];

export default function RefundPolicy() {
  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.hash = 'home';
    }
  };

  return (
    <main className="refund-page">
      <style>{`
        .refund-page {
          min-height: 100vh;
          background: #f7f8fc;
          color: #172033;
          font-family: Inter, Arial, sans-serif;
          padding: 40px 20px 60px;
          box-sizing: border-box;
        }

        .refund-container {
          width: 100%;
          max-width: 900px;
          margin: 0 auto;
        }

        .refund-back {
          margin-bottom: 24px;
          border: 1px solid #e1e5ed;
          border-radius: 10px;
          padding: 10px 15px;
          background: #fff;
          color: #172033;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }

        .refund-back:hover {
          background: #f0f2f7;
        }

        .refund-header {
          padding: 36px;
          background: #fff;
          border: 1px solid #e9edf3;
          border-radius: 22px;
          margin-bottom: 20px;
        }

        .refund-eyebrow {
          color: #56751d;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 1.6px;
          text-transform: uppercase;
          margin-bottom: 12px;
        }

        .refund-header h1 {
          font-size: clamp(30px, 5vw, 44px);
          line-height: 1.15;
          letter-spacing: -1.3px;
          margin: 0 0 14px;
        }

        .refund-header p {
          color: #606b7d;
          font-size: 15px;
          line-height: 1.8;
          margin: 0;
        }

        .refund-updated {
          display: inline-block;
          margin-top: 20px;
          background: #f0f5e7;
          color: #425d17;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 700;
        }

        .refund-notice {
          padding: 17px 20px;
          margin-bottom: 16px;
          border: 1px solid #e3ebd5;
          border-left: 4px solid #7dc25b;
          border-radius: 12px;
          background: #fbfdf7;
          color: #4d5b3b;
          font-size: 13px;
          line-height: 1.8;
        }

        .refund-section {
          padding: 25px 28px;
          margin-bottom: 14px;
          background: #fff;
          border: 1px solid #e9edf3;
          border-radius: 16px;
        }

        .refund-section h2 {
          color: #172033;
          font-size: 18px;
          line-height: 1.5;
          margin: 0 0 13px;
        }

        .refund-section p,
        .refund-section li {
          color: #596579;
          font-size: 14px;
          line-height: 1.85;
        }

        .refund-section p {
          margin: 0 0 12px;
        }

        .refund-section p:last-child {
          margin-bottom: 0;
        }

        .refund-section ul {
          padding-left: 21px;
          margin: 8px 0 12px;
        }

        .refund-section li {
          padding-left: 3px;
          margin-bottom: 7px;
        }

        .refund-contact a {
          color: #52751c;
          font-weight: 700;
          overflow-wrap: anywhere;
        }

        .refund-footer {
          margin-top: 26px;
          color: #7b8494;
          font-size: 12px;
          line-height: 1.8;
          text-align: center;
        }

        @media (max-width: 600px) {
          .refund-page {
            padding: 22px 12px 36px;
          }

          .refund-header {
            padding: 25px 20px;
            border-radius: 16px;
          }

          .refund-section {
            padding: 20px 18px;
            border-radius: 13px;
          }

          .refund-section h2 {
            font-size: 17px;
          }

          .refund-section p,
          .refund-section li {
            font-size: 13px;
          }
        }
      `}</style>

      <div className="refund-container">
        <button
          type="button"
          className="refund-back"
          onClick={goBack}
        >
          ← Back
        </button>

        <header className="refund-header">
          <div className="refund-eyebrow">TurfBooking · Legal</div>
          <h1>Refund &amp; Cancellation Policy</h1>
          <p>
            Clear information about booking cancellations, refund requests
            and payment issues when using TurfBooking.
          </p>
          <span className="refund-updated">
            Last updated: 24 October 2026
          </span>
        </header>

        <div className="refund-notice">
          <strong>Before you book:</strong> Cancellation deadlines, charges
          and refund eligibility may vary by booking. Please review the
          terms shown for your selected turf and time slot before payment.
        </div>

        {refundSections.map((section) => (
          <section className="refund-section" key={section.title}>
            <h2>{section.title}</h2>

            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}

            {section.bullets && (
              <ul>
                {section.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}

            {section.extra && <p>{section.extra}</p>}
          </section>
        ))}

        <section className="refund-section refund-contact">
          <h2>11. Contact Us</h2>
          <p>
            For refund requests, booking cancellations or payment-related
            questions, contact our support team:
          </p>
          <p>
            <strong>Email: </strong>
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          </p>
          <p>
            <strong>Website: </strong>
            <a
              href="https://turf-web-red.vercel.app/"
              target="_blank"
              rel="noreferrer"
            >
              turf-web-red.vercel.app
            </a>
          </p>
        </section>

        <footer className="refund-footer">
          © {new Date().getFullYear()} TurfBooking. All rights reserved.
        </footer>
      </div>
    </main>
  );
}
