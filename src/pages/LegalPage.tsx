import { ArrowLeft, FileText, ShieldCheck } from 'lucide-react';

type LegalPageType = 'privacy' | 'terms' | 'refund';

interface LegalPageProps {
  type: LegalPageType;
}

const privacySections = [
  {
    title: 'Who we are',
    paragraphs: ['Our website address is: https://sthenofy.com/'],
  },
  {
    title: 'Comments',
    paragraphs: [
      'When visitors leave comments on the site we collect the data shown in the comments form, and also the visitor’s IP address and browser user agent string to help spam detection.',
      'An anonymized string created from your email address (also called a hash) may be provided to the Gravatar service to see if you are using it. The Gravatar service privacy policy is available at https://automattic.com/privacy/. After approval of your comment, your profile picture is visible to the public in the context of your comment.',
    ],
  },
  {
    title: 'Media',
    paragraphs: ['If you upload images to the website, you should avoid uploading images with embedded location data (EXIF GPS) included. Visitors to the website can download and extract any location data from images on the website.'],
  },
  {
    title: 'Cookies',
    paragraphs: [
      'If you leave a comment on our site you may opt-in to saving your name, email address, and website in cookies. These are for your convenience so that you do not have to fill in your details again when you leave another comment. These cookies will last for one year.',
      'If you visit our login page, we will set a temporary cookie to determine if your browser accepts cookies. This cookie contains no personal data and is discarded when you close your browser.',
      'When you log in, we will also set up cookies to save your login information and screen display choices. Login cookies last for two days, screen option cookies last for a year, and “Remember Me” cookies last for two weeks. Logging out removes login cookies.',
      'If you edit or publish an article, an additional cookie will be saved in your browser. It includes no personal data, indicates the post ID, and expires after one day.',
    ],
  },
  {
    title: 'Embedded content from other websites',
    paragraphs: ['Articles on this site may include embedded content such as videos, images, or articles. Embedded content from other websites behaves in the same way as if the visitor had visited that website. Those websites may collect data, use cookies, embed third-party tracking, and monitor your interaction according to their own policies.'],
  },
  {
    title: 'Who do we share your data with',
    paragraphs: ['If you request a password reset, your IP address will be included in the reset email.'],
  },
  {
    title: 'How long we retain your data',
    paragraphs: ['If you leave a comment, the comment and its metadata are retained indefinitely so follow-up comments can be recognized and approved automatically. For users who register on this website, we store the personal information provided in their user profile. Users can see, edit, or delete their personal information, except their username. Website administrators can also see and edit that information.'],
  },
  {
    title: 'What rights do you have over your data?',
    paragraphs: ['If you have an account on this site, or have left comments, you can request an exported file of the personal data we hold about you, including data you have provided. You can also request that we erase personal data we hold about you, except data we are obliged to keep for administrative, legal, or security purposes.'],
  },
  {
    title: 'Where your data is sent',
    paragraphs: ['Visitor comments may be checked through an automated spam detection service.'],
  },
];

const termsSections = [
  {
    title: 'General',
    paragraphs: ['This website, https://sthenofy.com, is owned and operated by STHENOS WELLNESS LLP d/b/a “STHENOFY” (“STHENOFY,” “we,” or “us”). By using the Site, you agree to these Terms of Service, our Privacy Policy, and any additional terms that apply to specific services. We may update these Terms from time to time by posting a revised version on this website. Continued use of the Site after changes are posted constitutes acceptance of the revised Terms.'],
  },
  {
    title: 'Intellectual Property Rights',
    paragraphs: ['The Site and all materials available on it are owned by us and/or our affiliates or licensors and are protected by copyright, trademark, and other intellectual property laws. The Site is provided for personal, noncommercial use. Unless expressly authorized, you may not modify, copy, reproduce, republish, upload, transmit, translate, sell, create derivative works from, exploit, or distribute Site materials. You may download or print one copy of an individual page for personal, noncommercial use if all proprietary notices remain intact.'],
  },
  {
    title: 'Your submissions',
    paragraphs: ['By posting or submitting material to us through the Site, social media, email, text, or otherwise, you represent that you own it or have permission to submit it and that you are at least thirteen years old. You grant STHENOFY a royalty-free, perpetual, irrevocable, non-exclusive, worldwide license to use, copy, modify, transmit, distribute, publicly display, and create derivative works from that material in any medium. We may choose whether to use or display submissions and may stop using them at any time.'],
  },
  {
    title: 'Disclaimers and limitation of liability',
    paragraphs: ['Links to third-party websites do not imply endorsement, and STHENOFY does not control third-party content or services. The Site, its information, products, and services are provided “as is” without warranties of any kind to the fullest extent permitted by law. We do not warrant that the Site will be uninterrupted, error-free, or free of harmful components. To the fullest extent permitted by law, STHENOFY and its affiliates will not be liable for direct, indirect, incidental, special, or consequential damages arising from use of the Site, products, services, or third-party materials.'],
  },
  {
    title: 'Online commerce',
    paragraphs: ['Purchases of products or services may be subject to additional terms. You are responsible for providing accurate information, using the Site and purchasing services for legitimate personal purposes, and all purchases made by you or someone acting on your behalf. Third-party merchants may have separate privacy and refund practices, for which they are responsible.'],
  },
  {
    title: 'Acceptable use',
    paragraphs: ['You must not interfere with the Site, gain unauthorized access, impersonate another person, transmit unlawful or abusive content, infringe another person’s rights, transmit malicious software, use the Site for unauthorized commercial solicitation, or collect other visitors’ personal information for marketing.'],
  },
  {
    title: 'Registration and passwords',
    paragraphs: ['If registration is required for a feature, you agree to provide true, accurate, current, and complete information and to keep your password confidential. You are responsible for activity under your account and must notify us promptly of unauthorized use.'],
  },
  {
    title: 'Termination',
    paragraphs: ['We may cancel or terminate your right to use the Site or any part of it at any time without notice. Restrictions on downloaded materials, disclaimers, and liability limitations survive termination.'],
  },
  {
    title: 'Governing law and contact',
    paragraphs: ['These Terms are governed by the laws of Telangana, India, and disputes are subject to binding arbitration in Telangana, India. Copyright concerns may be sent to bharathn@strengthgenesys.com. Questions about our privacy practices may be sent to support@sthenofy.com.'],
  },
];

const refundSections = [
  {
    title: 'Service-based nature',
    paragraphs: ['Our offerings are professional services, including strength training, conditioning, nutrition guidance, and coaching. Refunds are limited and apply only under the conditions below.'],
  },
  {
    title: 'Non-refundable services',
    paragraphs: ['Once a training session, nutrition consultation, or coaching service has been delivered, it is non-refundable.'],
  },
  {
    title: 'Advance payments',
    paragraphs: ['Payments made for personalized programs, packages, or sessions are final. Refunds are not provided for a change of mind or inability to commit due to personal reasons.'],
  },
  {
    title: 'Cancellations before service start',
    paragraphs: ['If you cancel before the first session or program begins, you may request a partial refund. Processing charges may apply.'],
  },
  {
    title: 'Missed sessions',
    paragraphs: ['Missed or unattended sessions will not be refunded. Rescheduling may be allowed when notice is provided within the specified time, such as 24 hours in advance.'],
  },
  {
    title: 'Technical issues',
    paragraphs: ['If a technical issue on our end prevents an online session from happening, we will reschedule it at no extra cost.'],
  },
  {
    title: 'Exceptional circumstances',
    paragraphs: ['Refunds may be considered in exceptional cases such as medical emergencies, with valid proof and subject to review.'],
  },
  {
    title: 'Refund timeline',
    paragraphs: ['Approved refunds, where applicable, will be processed within 7–14 business days to the original payment method.'],
  },
];

const pageContent: Record<LegalPageType, { title: string; intro: string; sections: typeof privacySections }> = {
  privacy: {
    title: 'PRIVACY POLICY',
    intro: 'This policy explains what information may be collected through the STHENOFY website and how it may be used.',
    sections: privacySections,
  },
  terms: {
    title: 'TERMS OF SERVICE',
    intro: 'Please read these Terms before using the STHENOFY website or purchasing services through it.',
    sections: termsSections,
  },
  refund: {
    title: 'REFUND POLICY',
    intro: 'This policy explains when refunds may be available for STHENOFY training, nutrition, and coaching services.',
    sections: refundSections,
  },
};

export default function LegalPage({ type }: LegalPageProps) {
  const content = pageContent[type];

  return (
    <div className="noise-overlay min-h-screen pt-20">
      <section className="py-12 sm:py-16 lg:py-20 text-center">
        <div className="max-w-4xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="section-label justify-center mb-4">
            {type === 'privacy' ? <ShieldCheck className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            <span>STHENOFY INFORMATION</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl md:text-7xl tracking-tight mb-4">
            {content.title}
          </h1>
          <p className="text-ink-200 text-base sm:text-lg max-w-2xl mx-auto">{content.intro}</p>
        </div>
      </section>

      <section className="pb-24">
        <div className="max-w-4xl mx-auto px-5 sm:px-6 lg:px-8">
          <article className="glass rounded-2xl p-6 sm:p-10 lg:p-12 space-y-8">
            {content.sections.map((section) => (
              <section key={section.title}>
                <h2 className="font-display text-2xl sm:text-3xl uppercase tracking-wide text-gold-400 mb-3">
                  {section.title}
                </h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="text-ink-200 leading-relaxed mb-3 last:mb-0">
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}
          </article>
          <button
            onClick={() => window.history.length > 1 ? window.history.back() : undefined}
            className="mt-8 inline-flex items-center gap-2 text-sm text-ink-300 hover:text-gold-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>
      </section>
    </div>
  );
}
