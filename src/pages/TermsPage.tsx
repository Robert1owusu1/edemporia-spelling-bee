import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { ShieldCheck, FileText, Scale } from 'lucide-react';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h2>
      <div className="space-y-3 text-sm text-slate-600 leading-relaxed dark:text-slate-400">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col font-sans text-slate-900 antialiased dark:bg-navy-900 dark:text-slate-100">
      <Navbar />

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200/60 flex items-center justify-center dark:bg-indigo-500/10 dark:border-indigo-500/30">
            <Scale className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider dark:text-indigo-400">Legal</p>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Terms of Service</h1>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Last updated: 18 August 2026</p>

        <div className="mt-8 space-y-8 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs dark:border-navy-700 dark:bg-navy-800">
          <Section title="1. About this service">
            <p>
              Spelling Bee (“the Service”) is a gamified, voice-first spelling practice platform provided by
              Spelling Bee. It helps learners master word spelling through tiered trails,
              daily challenges, badges and a class leaderboard. These Terms of Service (“Terms”) govern your
              access to and use of the Service.
            </p>
          </Section>

          <Section title="2. Who may use the Service">
            <p>
              The Service is intended for learners, parents, guardians, teachers and schools. Children under 15 must use
              the Service through a supervised parent or teacher account, which provides a unique Student ID login.
              Students aged 15 and above may create an independent account. By using the Service you confirm that you
              are at least 18 years old, or that you have parental or guardian consent, or that your use is supervised
              by a parent or teacher.
            </p>
            <p>
              Schools and their administrators are responsible for obtaining any consent required to enrol children in
              the Service and for ensuring their use complies with applicable laws and school policies.
            </p>
          </Section>

          <Section title="3. Accounts and security">
            <p>
              You are responsible for keeping your login credentials (including student ID codes) confidential and for
              all activity that occurs under your account. You agree to notify us promptly if you believe your account
              has been compromised. You must not share, distribute, or use another person’s account without permission.
            </p>
            <p>
              We may suspend or terminate access to the Service if we reasonably believe an account is being used in
              breach of these Terms or in a way that harms other users or the integrity of the Service.
            </p>
          </Section>

          <Section title="4. Acceptable use">
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>attempt to manipulate scores, points, streaks, tiers, badges or leaderboards through automated scripts or forged submissions;</li>
              <li>access, collect or share the personal information of other learners without authorisation;</li>
              <li>attempt to gain unauthorised access to the Service, its servers, databases or other users’ accounts;</li>
              <li>upload malicious content, interfere with the Service, or attempt to overload or disrupt it;</li>
              <li>use the Service for any unlawful purpose or in violation of applicable child-safety and data-protection laws.</li>
            </ul>
          </Section>

          <Section title="5. Content and intellectual property">
            <p>
              The Service, including its software, word banks, audio, design and branding, is owned by or licensed to
              Spelling Bee. You may not copy, modify, distribute or reverse-engineer the Service except as
              permitted by law.
            </p>
          </Section>

          <Section title="6. Availability and changes">
            <p>
              We aim to keep the Service available at all times, but we do not guarantee uninterrupted availability.
              We may update, change or discontinue features, and may modify these Terms from time to time. Material
              changes will be highlighted on this page. Continued use of the Service after changes take effect means
              you accept the revised Terms.
            </p>
          </Section>

          <Section title="7. Disclaimers and limitation of liability">
            <p>
              The Service is provided “as is” and “as available” without warranties of any kind, express or implied.
              To the fullest extent permitted by law, Spelling Bee is not liable for indirect, incidental
              or consequential damages arising from your use of the Service.
            </p>
          </Section>

          <Section title="8. Contact">
            <p>
              Questions about these Terms can be sent to the school administrator who invited you, or to the Spelling Bee
              team through the support contact provided by your school.
            </p>
          </Section>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-400 bg-indigo-950/60 border border-indigo-800/80 px-2.5 py-1 rounded-md">
              <FileText className="w-3.5 h-3.5" />
              <span>Effective 18 August 2026</span>
            </span>
            <Link to="/privacy" className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 hover:underline px-2.5 py-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Read the Privacy Policy</span>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}