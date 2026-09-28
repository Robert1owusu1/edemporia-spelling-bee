import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Section from '../components/common/Section';
import { ShieldCheck, Lock, FileText, Mail } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col font-sans text-slate-900 antialiased dark:bg-navy-900 dark:text-slate-100">
      <Navbar />

      <main id="main-content" className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center justify-center dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-300">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider dark:text-emerald-400">Legal</p>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Privacy Policy</h1>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Last updated: 18 August 2026</p>

        <div className="mt-8 space-y-8 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs dark:border-navy-700 dark:bg-navy-800">
          <Section title="1. Overview">
            <p>
              Spelling Bee (“the Service”), provided by Spelling Bee, is designed for learners under the supervision of
              parents, guardians and schools. We are committed to protecting the privacy of children and families, and
              we comply with applicable child-privacy laws such as the Children’s Online Privacy Protection Act (COPPA)
              and the Family Educational Rights and Privacy Act (FERPA) in the United States, and equivalent local laws
              where the Service operates.
            </p>
          </Section>

          <Section title="2. Information we collect">
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Account information:</strong> name and email address for parents, teachers and administrators;
                learner names and profile settings (such as avatar, colour and accessibility preferences) for students.
              </li>
              <li>
                <strong>Learning activity:</strong> practice rounds, spelling attempts, scores, streaks, points, main
                badges, and daily challenge results.
              </li>
              <li>
                <strong>Voice input:</strong> speech used for voice-first spelling practice may be processed in real
                time to recognise spoken letters. Voice audio is not kept on the server after processing.
              </li>
              <li>
                <strong>Usage data:</strong> technical information such as device type, browser, and IP address needed
                to operate and secure the Service.
              </li>
            </ul>
          </Section>

          <Section title="3. How we use information">
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>operate, secure and improve the Service and its learning features;</li>
              <li>track learner progress so students, parents and teachers can follow achievements;</li>
              <li>approve accounts and reset passwords;</li>
              <li>detect abuse, protect against fraud, and keep the platform safe for children.</li>
            </ul>
          </Section>

          <Section title="4. Children’s privacy (COPPA)">
            <p>
              Children under 15 use the Service only through a supervised parent or teacher account. Where required by
              COPPA, the parent or teacher who creates and manages a learner profile provides the verifiable consent for
              that learner’s participation. We do not require children to disclose more information than is reasonably
              necessary to use the Service, and we do not knowingly collect personal information directly from children
              without such supervision.
            </p>
            <p>
              A parent or guardian may review the information we hold about their child, ask us to delete it, or request
              that we stop further collection or use of it, at any time.
            </p>
          </Section>

          <Section title="5. School use (FERPA)">
            <p>
              Where the Service is used by a school, student records may be subject to FERPA or similar rules. Schools
              remain responsible for their educational records and for any consent obligations arising from enrolling
              students. We process such data on behalf of the school and do not use it for purposes unrelated to the
              Service.
            </p>
          </Section>

          <Section title="6. How we share information">
            <p>We do not sell personal information. We share information only in limited, necessary circumstances:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                with service providers who help operate the Service (for example hosting and database providers) under
                appropriate safeguards;
              </li>
              <li>
                with teachers, parents and school administrators, limited to the learner profiles they are authorised to
                supervise;
              </li>
              <li>when required by law, or to protect the safety and rights of learners and the Service.</li>
            </ul>
          </Section>

          <Section title="7. Data security and retention">
            <p>
              We apply security safeguards including encrypted connections, restricted access to stored data, hashed
              passwords, and authentication controls on all learner records. We retain personal information only as long
              as needed to provide the Service and to meet legal obligations, and we delete or anonymise it when it is
              no longer needed.
            </p>
          </Section>

          <Section title="8. Your rights">
            <p>
              Depending on your location, you may have the right to access, correct, export or delete your personal
              information, and to object to certain processing. Parents and guardians may exercise these rights on
              behalf of their children. To make a request, contact us using the details below.
            </p>
          </Section>

          <Section title="9. Contact us">
            <p className="flex items-start gap-2">
              <Mail className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                For privacy questions or requests, contact your child’s school administrator, or reach the Spelling Bee
                team through the support contact provided by your school.
              </span>
            </p>
          </Section>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-1 rounded-md">
              <Lock className="w-3.5 h-3.5" />
              <span>COPPA & FERPA compliant</span>
            </span>
            <Link
              to="/terms"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 hover:underline px-2.5 py-1"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Read the Terms of Service</span>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
