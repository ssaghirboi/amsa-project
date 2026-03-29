/**
 * Privacy Policy + Messaging Terms (static legal text).
 */
export default function PolicyPage() {
  return (
    <div className="min-h-[100dvh] min-h-screen bg-[#010101] text-slate-200">
      <main className="mx-auto max-w-3xl px-4 py-16 pb-24 pt-20 sm:px-6 sm:py-20 lg:px-8">
        <article className="space-y-10 text-[0.9375rem] leading-relaxed sm:text-base">
          <header className="space-y-3 border-b border-white/10 pb-10">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">
              Privacy Policy
            </h1>
            <p className="text-slate-400">Effective: March 29, 2026</p>
          </header>

          <section className="space-y-3" aria-labelledby="contents-heading">
            <h2 id="contents-heading" className="text-lg font-semibold text-slate-100">
              Contents
            </h2>
            <ol className="list-decimal space-y-1.5 pl-5 text-slate-300 marker:text-slate-500">
              <li>ABOUT US</li>
              <li>ABOUT THIS PRIVACY POLICY</li>
              <li>WHAT PERSONAL INFORMATION WE COLLECT AND HOW WE COLLECT IT?</li>
              <li>HOW WE USE YOUR PERSONAL INFORMATION?</li>
              <li>WHAT IS OUR LEGAL BASIS FOR PROCESSING?</li>
              <li>HOW WE SHARE YOUR PERSONAL INFORMATION?</li>
              <li>YOUR MARKETING CHOICES</li>
              <li>RETENTION OF YOUR DATA AND DELETION</li>
              <li>INTERNATIONAL TRANSFERS</li>
              <li>YOUR DATA PROTECTION RIGHTS</li>
              <li>CHANGES TO THIS PRIVACY POLICY</li>
              <li>CONTACT US</li>
            </ol>
          </section>

          <section className="space-y-3" id="about-us">
            <h2 className="text-lg font-semibold text-slate-100">1. ABOUT US</h2>
            <p>
              &ldquo;We&rdquo;, &ldquo;us&rdquo; or &ldquo;our&rdquo; means AMSA, with its principal place of
              business located at 162 Panatella View NW Calgary AB CA T3K 0N3.
            </p>
          </section>

          <section className="space-y-3" id="about-policy">
            <h2 className="text-lg font-semibold text-slate-100">2. ABOUT THIS PRIVACY POLICY</h2>
            <p>
              Your privacy is important to us, so we&rsquo;ve developed this Privacy Policy, which explains how
              we collect, use, and disclose your personal information. We collect personal information when you use
              our website(s), mobile apps, and other online and offline products, services and experiences
              (collectively, the &ldquo;Services&rdquo;). Please take a moment to read through this Policy in its
              entirety.
            </p>
            <p>
              If you have any questions, concerns or complaints regarding this Privacy Policy or how we use your
              personal information please contact us via e-mail at{' '}
              <a
                className="text-sky-400 underline decoration-sky-400/40 underline-offset-2 hover:text-sky-300"
                href="mailto:saghir.saeed@ucalgary.ca"
              >
                saghir.saeed@ucalgary.ca
              </a>
              .
            </p>
          </section>

          <section className="space-y-3" id="collect">
            <h2 className="text-lg font-semibold text-slate-100">
              3. WHAT PERSONAL INFORMATION WE COLLECT AND HOW WE COLLECT IT?
            </h2>
            <p>We collect personal information that you provide directly to us:</p>
            <p>
              <span className="font-medium text-slate-100">Contact information.</span> If you sign up to receive our
              newsletter, emails, or text messages from us, we will collect your name, email address, mailing address,
              phone number, and any other information needed to contact you about the Services.
            </p>
            <p>
              <span className="font-medium text-slate-100">Payment information.</span> To order products or services
              through the Services, you will need to provide us with payment information (like your bank account or
              credit card information). Please note that your financial information is collected and stored by a third
              party payment processing company. Use and storage of that information is governed by the third party
              payment processor&rsquo;s applicable privacy policy.
            </p>
            <p>
              <span className="font-medium text-slate-100">Survey information.</span> You may provide us with other
              personal information when you fill in a form, respond to our surveys or questionnaires, provide us with
              feedback, participate in promotions, or use other features of the Services.
            </p>
            <p>
              <span className="font-medium text-slate-100">Communications information.</span> We may also collect
              other information during our communications with you, including information that you send to us when
              interacting with our customer service agents, or when you call us or send emails or text messages. This
              may include information about how you contacted us, your marketing preferences, and other information that
              you choose to share.
            </p>
          </section>

          <section className="space-y-3" id="use">
            <h2 className="text-lg font-semibold text-slate-100">4. HOW WE USE YOUR PERSONAL INFORMATION?</h2>
            <p>We use the personal information we collect for the following reasons:</p>
            <ul className="list-disc space-y-2 pl-5 marker:text-slate-500">
              <li>
                To send you our newsletter, or other information or marketing about our Services that you think may be
                of interest to you.
              </li>
              <li>
                To reply to your questions, inquiries, or customer service requests or to send you notices, updates,
                security alerts, or support and administrative messages.
              </li>
              <li>
                To provide you with information about the Services that you request from us or which we feel may
                interest you.
              </li>
              <li>
                To monitor and analyze trends, usage and activities in connection with our Services and to improve the
                Services.
              </li>
              <li>
                To facilitate contests, sweepstakes and promotions, and to process entries and provide prizes and
                rewards.
              </li>
              <li>
                To detect, investigate and prevent fraudulent transactions and other illegal activities on the Services
                and to protect the rights and property of us and our customers.
              </li>
              <li>
                To carry out our obligations arising from any contracts entered into between you and us, including for
                billing and collection.
              </li>
            </ul>
            <p>
              We may also use your personal information to fulfill our obligations as set out by the applicable law, or
              to carry out any other purpose as described to you at the time your personal information was collected.
            </p>
          </section>

          <section className="space-y-3" id="legal-basis">
            <h2 className="text-lg font-semibold text-slate-100">5. WHAT IS OUR LEGAL BASIS FOR PROCESSING?</h2>
            <p>
              In certain countries we are required to have a legal basis for collecting and using your personal
              information. Our legal basis will depend on the personal information concerned and the specific context in
              which we collect it. We will normally collect personal information from you only where we have your
              consent to do so, where we need your information to perform a contract with you, or where the processing
              is in our legitimate interests and not overridden by your fundamental rights. In some cases, we may
              also have a legal obligation to collect personal information from you or may otherwise need the personal
              information to protect your vital interests or those of another person.
            </p>
            <p>
              If you have questions about or need further information concerning the legal basis on which we collect and
              use your personal information, please contact us using the details provided in the &ldquo;Contact
              Us&rdquo; section below.
            </p>
          </section>

          <section className="space-y-3" id="share">
            <h2 className="text-lg font-semibold text-slate-100">6. HOW WE SHARE YOUR PERSONAL INFORMATION?</h2>
            <p>We may share your personal information in the following ways:</p>
            <ul className="list-disc space-y-2 pl-5 marker:text-slate-500">
              <li>
                With vendors, consultants, and other service providers who process your personal information on our
                behalf when they provide services to us, for example data analytics, research, marketing and financial
                services.
              </li>
              <li>
                In connection with, or during negotiations of, any merger, sale of company assets, financing or
                acquisition of all or a portion of our business by another company.
              </li>
            </ul>
            <p>
              We may be legally required to disclose or share your personal information without your consent in some
              circumstances, for example to comply with a court order or law enforcement. In such circumstances, we
              will only disclose your personal information if we have a good-faith belief that such sharing is required
              under applicable legal obligations.
            </p>
          </section>

          <section className="space-y-3" id="marketing">
            <h2 className="text-lg font-semibold text-slate-100">7. YOUR MARKETING CHOICES</h2>
            <p>
              When you sign up for a promotion like a sweepstakes, or subscribe to receive our newsletter or
              marketing/promotional messages, we use your personal information to help us decide which products,
              services and offers may be of interest to you.
            </p>
            <p>
              We will send marketing messages to you if you have asked us to send you information, bought goods or
              services from us, or if you provided us with your details when you entered a competition or registered for
              a promotion. If you opt out of receiving marketing messages, we may still send you non-promotional
              emails. We will ask for your consent before we share your personal information with any third party for
              their direct marketing purposes.
            </p>
            <p>
              You may unsubscribe from marketing messages through a link we include on messages we send you. You can
              also ask us to stop sending you marketing messages at any time by contacting us at:{' '}
              <a
                className="text-sky-400 underline decoration-sky-400/40 underline-offset-2 hover:text-sky-300"
                href="mailto:saghir.saeed@ucalgary.ca"
              >
                saghir.saeed@ucalgary.ca
              </a>
              .
            </p>
          </section>

          <section className="space-y-3" id="retention">
            <h2 className="text-lg font-semibold text-slate-100">8. RETENTION OF YOUR DATA AND DELETION</h2>
            <p>
              Your personal information will not be kept longer than is necessary for the specific purpose for which it
              was collected.
            </p>
            <p>
              When we decide how long we will keep your information we consider the amount, nature, and sensitivity of
              the personal information, the potential risk of harm from unauthorized use or disclosure, why we need
              it, and any relevant legal requirements (such as legal retention and destruction periods).
            </p>
            <p>
              The foregoing will, however, not prevent us from retaining any personal information if it is necessary to
              comply with our legal obligations, in order to file a legal claim or defend ourselves against a legal
              claim, or for evidential purposes.
            </p>
            <p>
              Details of retention periods for different aspects of your personal data are available from us on request
              by contacting us using the contact details provided under the &ldquo;Contact Us&rdquo; heading below.
            </p>
          </section>

          <section className="space-y-3" id="transfers">
            <h2 className="text-lg font-semibold text-slate-100">9. INTERNATIONAL TRANSFERS</h2>
            <p>
              We will ensure that any transfer of personal information to countries outside of the United States will
              take place pursuant to the appropriate safeguards.
            </p>
          </section>

          <section className="space-y-3" id="rights">
            <h2 className="text-lg font-semibold text-slate-100">10. YOUR DATA PROTECTION RIGHTS</h2>
            <p>
              Depending on the circumstances, you may have some of the following rights under applicable data protection
              laws. To exercise any of them, please contact us using the details provided in the &ldquo;Contact
              Us&rdquo; section below
            </p>
            <ul className="list-disc space-y-2 pl-5 marker:text-slate-500">
              <li>You may access, correct, or request deletion of your personal information</li>
              <li>
                You may object to processing of your personal information, ask us to restrict processing of your personal
                information or request portability of your personal information, (i.e. your data to be transferred in a
                readable and standardized format).
              </li>
              <li>
                If we have collected and processed your personal information with your consent, then you can withdraw
                your consent at any time.
              </li>
            </ul>
            <p>
              We respond to all requests we receive from individuals wishing to exercise their data protection rights
              in accordance with applicable data protection laws.
            </p>
            <p>
              You may also have the right to complain to a supervisory authority about our collection and use of your
              personal data. For more information, please contact your local supervisory authority.
            </p>
          </section>

          <section className="space-y-3" id="changes">
            <h2 className="text-lg font-semibold text-slate-100">11. CHANGES TO THIS PRIVACY POLICY</h2>
            <p>
              From time to time, we have the right to modify this Privacy Policy. We&rsquo;re likely to update this
              Privacy Policy in the future and when we make changes. When we update this Privacy Policy, we will take
              appropriate measures to inform you, consistent with the significance of the changes we make. Please come
              back and check this page from time to time for the latest information on our privacy practices.
            </p>
          </section>

          <section className="space-y-3" id="contact">
            <h2 className="text-lg font-semibold text-slate-100">12. CONTACT US</h2>
            <p>
              The data controller of your personal information is AMSA, with its principal place of business located at
              162 Panatella View NW Calgary AB CA T3K 0N3.
            </p>
            <p>
              If you have questions or concerns about the information in this Privacy Policy, our handling of your
              personal information, or your choices and rights regarding such use, please do not hesitate to contact us
              at:
            </p>
            <address className="not-italic text-slate-300">
              AMSA
              <br />
              162 Panatella View NW Calgary AB CA T3K 0N3
              <br />
              <a
                className="text-sky-400 underline decoration-sky-400/40 underline-offset-2 hover:text-sky-300"
                href="mailto:saghir.saeed@ucalgary.ca"
              >
                saghir.saeed@ucalgary.ca
              </a>
            </address>
          </section>
        </article>

        <article
          className="mt-20 space-y-10 border-t border-white/10 pt-16 text-[0.9375rem] leading-relaxed sm:mt-24 sm:pt-20 sm:text-base"
          aria-labelledby="messaging-terms-heading"
        >
          <header className="space-y-4 border-b border-white/10 pb-10">
            <p className="text-sm font-medium uppercase tracking-wider text-slate-500">AMSA UCalgary</p>
            <p>
              <a
                className="text-sky-400 underline decoration-sky-400/40 underline-offset-2 hover:text-sky-300"
                href="https://eepurl.com/jCP-JY"
                target="_blank"
                rel="noopener noreferrer"
              >
                http://eepurl.com/jCP-JY
              </a>
            </p>
            <h1
              id="messaging-terms-heading"
              className="text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl"
            >
              Messaging Terms &amp; Conditions
            </h1>
          </header>

          <section className="space-y-3" id="msg-general">
            <h2 className="text-lg font-semibold text-slate-100">General</h2>
            <p>When you opt-in to the service, we will send you a message to confirm your signup.</p>
            <p>
              By opting into messages, you agree to receive recurring automated marketing and informational text
              messages from AMSA UCalgary. Automated messages may be sent using an automatic telephone dialing system to
              the mobile telephone number you provided when signing up or any other number that you designate.
            </p>
            <p>
              Message frequency varies, and additional mobile messages may be sent periodically based on your interaction
              with AMSA UCalgary. AMSA UCalgary reserves the right to alter the frequency of messages sent at any time
              to increase or decrease the total number of sent messages. AMSA UCalgary also reserves the right to change
              the short code or phone number or alphanumeric sender where messages are sent
            </p>
            <p>
              Your usual message and data rates may apply. If you have any questions about your text plan or data plan,
              it is best to contact your mobile provider. Your mobile provider is not liable for delayed or undelivered
              messages.
            </p>
            <p>Your consent to receive marketing messages is not a condition of purchase.</p>
          </section>

          <section className="space-y-3" id="msg-carriers">
            <h2 className="text-lg font-semibold text-slate-100">Carriers</h2>
            <p>Carriers are not liable for delayed or undelivered messages.</p>
          </section>

          <section className="space-y-3" id="msg-cancellation">
            <h2 className="text-lg font-semibold text-slate-100">Cancellation</h2>
            <p>
              Messages will provide instructions to unsubscribe either by texting STOP or through an included link. After
              you unsubscribe, we will send you a message to confirm that you have been unsubscribed and no more messages
              will be sent. If you would like to receive messages from AMSA UCalgary again, just sign up as you did the
              first time and AMSA UCalgary will start sending messages to you again.
            </p>
          </section>

          <section className="space-y-3" id="msg-info">
            <h2 className="text-lg font-semibold text-slate-100">Info</h2>
            <p>
              For support regarding our services, email us at{' '}
              <a
                className="text-sky-400 underline decoration-sky-400/40 underline-offset-2 hover:text-sky-300"
                href="mailto:saghir.saeed@ucalgary.ca"
              >
                saghir.saeed@ucalgary.ca
              </a>
              , or, if supported, text &ldquo;HELP&rdquo; to our messages at any time and we will respond with
              instructions on how to unsubscribe. If we include a link in messages we send you from AMSA UCalgary, you may
              also access instructions on how to unsubscribe and our company information by following that link.
            </p>
          </section>

          <section className="space-y-3" id="msg-transfer">
            <h2 className="text-lg font-semibold text-slate-100">Transfer of Number</h2>
            <p>
              You agree that before changing your mobile number or transferring your mobile number to another individual,
              you will either reply &ldquo;STOP&rdquo; from the original number, unsubscribe using the link included in
              our messages (if one is provided), or notify us of your old number at{' '}
              <a
                className="text-sky-400 underline decoration-sky-400/40 underline-offset-2 hover:text-sky-300"
                href="mailto:saghir.saeed@ucalgary.ca"
              >
                saghir.saeed@ucalgary.ca
              </a>
              . The duty to inform us based on the above events is a condition of using this service to receive messages.
            </p>
          </section>

          <section className="space-y-3" id="msg-privacy">
            <h2 className="text-lg font-semibold text-slate-100">Privacy</h2>
            <p>
              If you have any questions about your data or our privacy practices, please visit our{' '}
              <a
                className="text-sky-400 underline decoration-sky-400/40 underline-offset-2 hover:text-sky-300"
                href="https://eepurl.com/jCP-JY"
                target="_blank"
                rel="noopener noreferrer"
              >
                http://eepurl.com/jCP-JY
              </a>
              .
            </p>
          </section>

          <section className="space-y-3" id="msg-changes">
            <h2 className="text-lg font-semibold text-slate-100">Messaging Terms Changes</h2>
            <p>
              We reserve the right to change or terminate our messaging program at any time. We also reserve the right to
              update these Messaging Terms at any time. Such changes will be effective immediately upon posting. If you do
              not agree to a change to these Messaging Terms, you should cancel your enrollment with our messaging
              program. Your continued enrollment following such changes shall constitute your acceptance of such changes.
            </p>
          </section>
        </article>
      </main>
    </div>
  )
}
