import fs from 'node:fs'
import path from 'node:path'
import { renderReportPdf } from '../backend/src/services/pdf.service'
import { buildJurisdiction } from '../backend/src/fairexit/jurisdictions'
import { sourcesFor, latestCheckedDate } from '../backend/src/fairexit/regionData'
import type { ReportJson, RenderMeta } from '../backend/src/fairexit/reportOutput'

// Set driver to sparticuz for local execution with local Chrome
process.env.PDF_BROWSER = 'sparticuz'

async function generateCanadaReport() {
  const j = buildJurisdiction('CA-ON')!
  const sources = sourcesFor(j)
  const rulesAsOf = latestCheckedDate(sources)

  const meta: RenderMeta = {
    reportId: 'RPT-2026-CA-9941',
    jurisdiction: j,
    sources,
    rulesAsOf,
    attestedAt: '2026-10-31T14:30:00Z',
    generatedAt: '2026-10-31T14:35:00Z',
    numbers: {
      country: 'CA',
      minimum: {
        amount: 48606,
        weeks: 22.5,
        none: false,
        statute_short: 'ESA',
        arithmetic: '8 weeks termination notice ($17,215) + 14.5 weeks statutory severance ($31,391) = $48,606',
      },
      range: {
        low: 140625,
        high: 206250,
        lowMonths: 15,
        highMonths: 22,
        basis: 'Ontario Superior Court common-law notice precedents based on Bardal factors',
      },
      offer: 24000,
      gauge: {
        low: 140625,
        high: 206250,
        offer: 24000,
        position: 0.12,
        label: 'Your offer: $24,000',
      },
      factorValues: {
        service: '14.5 years of continuous service with Lakeshore Precision Inc.',
        age: '52 years old at time of termination',
        job_level: 'Quality Assurance Supervisor (mid-management)',
        similar_jobs: 'Specialized manufacturing QA roles in Southwestern Ontario',
      },
    },
    answers: {
      name: 'Gurpreet Sandhu',
      full_name: 'Gurpreet Sandhu',
      employer: 'Lakeshore Precision Inc.',
      role: 'Quality Assurance Supervisor',
      salary: 112500,
      years: 14.5,
      age: 52,
      offer: 24000,
      hr_name: 'Denise Faulkner',
    },
  }

  const report: ReportJson = {
    cover: {
      role_line: 'Quality Assurance Supervisor · 14.5 years of service',
      place_line: 'Ontario',
    },
    glance:
      'Your offer of $24,000 is significantly below the Employment Standards Act (ESA) minimum of $48,606 (8 weeks notice plus 14.5 weeks severance). Furthermore, under Ontario common law, individuals in your position typically receive 15 to 22 months of total compensation ($140,625 to $206,250). Your letter asks you to sign within 14 days, but statutory minimums cannot be made conditional on signing a release.',
    confirmed_line: 'Built on the details you confirmed on October 31, 2026.',
    checks: [
      {
        topic: 'Money offered',
        letter_says: '$24,000 lump sum',
        contract_says: 'ESA statutory minimums only',
        rule_says: 'ESA minimum is $48,606 (22.5 weeks total)',
        status: 'bad',
        why: 'The offer is $24,606 below what the ESA legally guarantees you regardless of any agreement.',
        source_id: sources[0]?.id,
      },
      {
        topic: 'Working notice',
        letter_says: '8 weeks salary in lieu of notice ($17,215)',
        contract_says: 'Notice per ESA',
        rule_says: 'ESA s. 57: 8 weeks notice for 8+ years service',
        status: 'ok',
        why: 'Notice calculation matches the statutory minimum weeks, but statutory severance was omitted.',
        source_id: sources[0]?.id,
      },
      {
        topic: 'Statutory severance pay',
        letter_says: 'Not included in offer letter',
        contract_says: 'Silent',
        rule_says: 'ESA s. 64: 1 week/yr up to 26 weeks ($31,391 for 14.5 yrs)',
        status: 'bad',
        why: 'Lakeshore Precision meets the $2.5M Ontario payroll threshold; severance pay is mandatory.',
        source_id: sources[0]?.id,
      },
      {
        topic: 'Benefits continuation',
        letter_says: 'Ends on last day of active employment',
        contract_says: 'Standard group benefit coverage',
        rule_says: 'ESA s. 60(1)(c): All benefits must continue through statutory notice period (8 weeks)',
        status: 'bad',
        why: 'Cutting off health, dental, and life insurance on your last day violates ESA minimum standards.',
        source_id: sources[0]?.id,
      },
      {
        topic: 'Accrued vacation pay',
        letter_says: 'Accrued vacation paid to termination date',
        contract_says: '4 weeks annual vacation',
        rule_says: 'ESA s. 61(1)(b): Vacation pay (6%) also applies to statutory notice pay',
        status: 'bad',
        why: 'Vacation pay must be calculated and paid on your notice pay period as well.',
        source_id: sources[0]?.id,
      },
      {
        topic: 'Release condition',
        letter_says: 'Full and final release required before any payment',
        contract_says: 'Release required upon termination',
        rule_says: 'ESA s. 5: No contracting out; minimums must be paid unconditionally',
        status: 'bad',
        why: 'Your employer cannot withhold your $48,606 statutory minimum if you refuse to sign the release.',
        source_id: sources[0]?.id,
      },
      {
        topic: 'Deadline to sign',
        letter_says: '14 calendar days from delivery',
        contract_says: 'N/A',
        rule_says: 'No statutory deadline; 2-year limitation period under Limitations Act, 2002',
        status: 'ask',
        why: '14-day deadlines are an employer-imposed tactic; you are entitled to reasonable time for review.',
        source_id: sources[1]?.id,
      },
    ],
    factors: {
      service: 0.75,
      age: 0.8,
      job_level: 0.5,
      similar_jobs: 0.5,
      reasons: {
        service:
          '14.5 years is long service under Ontario law, representing over a decade of dedicated commitment. Long tenure is one of the strongest factors increasing notice periods.',
        age:
          'At 52 years of age, Ontario courts recognize that older workers face documented systemic obstacles when seeking equivalent replacement employment.',
        job_level:
          'Supervisory oversight of quality control teams involves specialized management responsibilities that warrant extended transition support.',
        similar_jobs:
          'Automotive and advanced manufacturing QA supervisory roles in Southwestern Ontario are currently facing contraction, lengthening search times.',
      },
    },
    myths: [
      {
        myth: 'One week per year of service is the standard common-law severance rule.',
        fact: 'The Supreme Court of Canada and Ontario Court of Appeal have repeatedly rejected the "rule of thumb" of one week (or one month) per year. Notice depends on your age, character of employment, length of service, and market availability.',
      },
      {
        myth: 'If you do not sign within 14 days, you lose your right to any severance.',
        fact: 'Statutory minimum notice and severance ($48,606 in your case) can never be withheld. You have up to two years from your termination date to bring a common-law claim.',
      },
    ],
    clauses: [
      {
        title: 'Termination Clause (Employment Agreement, Section 8)',
        status: 'ask',
        what_it_says:
          '"In the event of termination without cause, the Employer may terminate employment by providing only the minimum notice and severance required by the Employment Standards Act, 2000."',
        what_it_means:
          'This clause attempts to limit your payout strictly to ESA minimums and waive common-law reasonable notice. However, Ontario courts (e.g., Waksdale v. Swegon North America) frequently find such clauses unenforceable if any part of the contract breaches the ESA.',
        question_to_ask:
          'Has this clause been reviewed against recent Ontario appellate case law, and is the employer prepared to stand on an unmitigated common-law settlement?',
      },
      {
        title: 'Full and Final Release & Waiver of Claims',
        status: 'ask',
        what_it_says:
          '"The Employee releases and forever discharges the Company and its affiliates from any and all claims, complaints, or causes of action arising out of employment or termination."',
        what_it_means:
          'Signing this gives up your right to claim statutory severance, common-law pay in lieu of notice, and any human rights or pension claims. A release must be supported by fresh consideration beyond what you are already owed by law.',
        question_to_ask:
          'Can the employer confirm that all statutory minimums ($48,606) will be paid immediately on payroll without requiring a signed release?',
      },
      {
        title: 'Non-Competition and Non-Solicitation Covenant',
        status: 'ask',
        what_it_says:
          '"The Employee agrees not to engage in any competing business within a 50 km radius for a period of twelve (12) months following the termination date."',
        what_it_means:
          'Under Ontario ESA amendments enacted in 2021 (Bill 27, Working for Workers Act), non-compete clauses for non-executive employees entered into after October 2021 are void by statute. For earlier contracts, geographic and temporal restrictions must be strictly reasonable.',
        question_to_ask:
          'Will the company provide written confirmation that it will not enforce the post-employment non-compete restriction in Ontario?',
      },
      {
        title: 'Immediate Benefits Cessation Provision',
        status: 'bad',
        what_it_says:
          '"All group life, medical, dental, and disability insurance benefits shall terminate immediately on the employee’s final day of active duty."',
        what_it_means:
          'This provision directly contravenes Section 60(1)(c) of the Employment Standards Act, 2000, which requires the employer to maintain all benefits for the full statutory notice period.',
        question_to_ask:
          'When will the company confirm in writing that comprehensive medical and dental coverage will continue uninterrupted for the required 8-week statutory notice period?',
      },
    ],
    questions: [
      'Can you provide a detailed written itemization breaking down how the $24,000 offer was calculated?',
      'Since my length of service exceeds 5 years and the company payroll exceeds $2.5M, why was statutory severance under ESA Section 64 omitted from the package?',
      'Will you confirm in writing that all group health, dental, and life insurance benefits will remain active throughout the 8-week statutory notice period?',
      'Can you confirm that the statutory minimum payments will be processed unconditionally on the next regular pay date while we discuss the common-law notice terms?',
    ],
    next_steps: [
      'Do not sign the release or severance agreement under the artificial 14-day timeline.',
      'Request an immediate 30-day extension in writing using our calm, professional email template.',
      'Request unconditional payout of your $48,606 statutory minimum amounts.',
      'Schedule a consultation with an Ontario employment lawyer to evaluate common-law entitlement of $140k–$206k.',
    ],
    citations_used: sources.map((s) => s.id),
  }

  console.log('Rendering Canada PDF...')
  const pdfBuffer = await renderReportPdf(report, meta)
  const outPath = path.resolve('tmp/output_canada.pdf')
  fs.writeFileSync(outPath, pdfBuffer)
  console.log(`Canada PDF written successfully: ${outPath} (${pdfBuffer.length} bytes)`)
}

async function generateUSReport() {
  const j = buildJurisdiction('US-TX')!
  const sources = sourcesFor(j)
  const rulesAsOf = latestCheckedDate(sources)

  const meta: RenderMeta = {
    reportId: 'RPT-2026-US-8820',
    jurisdiction: j,
    sources,
    rulesAsOf,
    attestedAt: '2026-10-31T15:00:00Z',
    generatedAt: '2026-10-31T15:05:00Z',
    numbers: {
      country: 'US',
      minimum: {
        amount: null,
        weeks: null,
        none: true,
        statute_short: 'US / Texas Law',
        arithmetic: 'Neither Texas law nor federal law mandates severance pay unless agreed by contract.',
      },
      range: null,
      offer: 22154,
      gauge: null,
      factorValues: {
        service: '11 years and 7 months of continuous employment with Apex Global Technologies.',
        age: '48 years of age (covered under federal ADEA and OWBPA statutory protections).',
        job_level: 'Senior Systems Engineer (individual technical contributor).',
        similar_jobs: 'Enterprise cloud systems and infrastructure engineering in the Austin-Round Rock metro area.',
      },
    },
    answers: {
      name: 'Raymond Okafor-Lindqvist',
      full_name: 'Raymond Okafor-Lindqvist',
      employer: 'Apex Global Technologies LLC',
      role: 'Senior Systems Engineer',
      salary: 77000,
      years: 11.6,
      age: 48,
      offer: 22154,
      hr_name: 'Patricia Vance',
    },
  }

  const report: ReportJson = {
    cover: {
      role_line: 'Senior Systems Engineer · 11 years 7 months of service',
      place_line: 'Texas',
    },
    glance:
      'Your offer of $22,154 equals approximately 15 weeks of base salary. In the United States and Texas, there is no statutory minimum severance required by law. However, because you are over 40 and part of a group termination, federal law (the Older Workers Benefit Protection Act - OWBPA) requires specific legal disclosures, a minimum 45-day review period, and a 7-day revocation window. Your agreement currently specifies only 21 days to decide and lacks the mandatory demographic disclosures.',
    confirmed_line: 'Built on the details you confirmed on October 31, 2026.',
    checks: [
      {
        topic: 'Money offered',
        letter_says: '$22,154 severance payment',
        contract_says: 'At-will employment; discretionary severance policy',
        rule_says: 'No federal or Texas statutory minimum severance',
        status: 'info',
        why: 'Severance in the US is primarily contractual and negotiated.',
        source_id: sources[0]?.id,
      },
      {
        topic: 'Release requirement',
        letter_says: 'Requires full general release of all claims',
        contract_says: 'Standard separation covenants',
        rule_says: 'Release requires valid consideration above earned wages',
        status: 'ok',
        why: 'The $22,154 represents valid consideration in exchange for releasing potential claims.',
        source_id: sources[0]?.id,
      },
      {
        topic: 'Review period (OWBPA)',
        letter_says: '21 calendar days to sign',
        contract_says: 'N/A',
        rule_says: '29 U.S.C. § 626(f)(1)(F)(ii): 45 days required for group layoffs of workers 40+',
        status: 'bad',
        why: 'Because multiple employees were separated in this reduction, you are legally entitled to 45 days, not 21 days.',
        source_id: sources[0]?.id,
      },
      {
        topic: 'Revocation period',
        letter_says: '7 calendar days following execution',
        contract_says: 'N/A',
        rule_says: '29 U.S.C. § 626(f)(1)(G): Mandatory 7-day revocation period cannot be waived',
        status: 'ok',
        why: 'The 7-day revocation clause complies with federal statutory requirements.',
        source_id: sources[0]?.id,
      },
      {
        topic: 'Demographic disclosure',
        letter_says: 'No list of affected ages/titles attached',
        contract_says: 'N/A',
        rule_says: '29 U.S.C. § 626(f)(1)(H): Mandatory job titles and ages of selected and non-selected employees',
        status: 'bad',
        why: 'Without the required OWBPA informational attachment, any age discrimination release is legally invalid.',
        source_id: sources[0]?.id,
      },
      {
        topic: 'Accrued PTO payout',
        letter_says: 'All accrued, unused vacation paid on final payroll',
        contract_says: 'PTO accrual policy per handbook',
        rule_says: 'Texas Labor Code § 61.014: Paid according to written company policy',
        status: 'ok',
        why: 'The employer has committed to paying earned vacation time in accordance with policy.',
        source_id: sources[1]?.id,
      },
      {
        topic: 'Health coverage (COBRA)',
        letter_says: 'COBRA continuation election notice sent separately',
        contract_says: 'N/A',
        rule_says: 'Federal COBRA: Up to 18 months continuation at employee expense',
        status: 'ask',
        why: 'Company has not offered to subsidize COBRA premiums during your severance period.',
        source_id: sources[2]?.id,
      },
    ],
    release_check: [
      {
        status: 'bad',
        point: '45 days to consider (group layoff)',
        detail:
          'You were given 21 days. Under the Older Workers Benefit Protection Act (OWBPA), group reductions in force involving employees 40 years of age or older require at least 45 days to consider.',
        source_id: sources[0]?.id,
      },
      {
        status: 'ok',
        point: '7 days to revoke',
        detail:
          'Your agreement correctly gives you 7 days after signing to revoke your acceptance in writing. This period cannot be shortened or waived.',
        source_id: sources[0]?.id,
      },
      {
        status: 'bad',
        point: 'Decisional unit disclosure (ages and titles)',
        detail:
          'The agreement does not include Exhibit A listing the job titles and ages of all employees in your decisional unit who were selected and not selected for layoff.',
        source_id: sources[0]?.id,
      },
      {
        status: 'ok',
        point: 'Advice to consult an attorney',
        detail:
          'The agreement contains explicit written language advising you to consult with an independent attorney prior to executing the agreement.',
        source_id: sources[0]?.id,
      },
      {
        status: 'ok',
        point: 'Valid consideration provided',
        detail:
          'The severance payment of $22,154 is in addition to anything of value to which you are already entitled (such as earned wages or accrued PTO).',
        source_id: sources[0]?.id,
      },
      {
        status: 'ok',
        point: 'Preservation of EEOC filing rights',
        detail:
          'The release preserves your legal right to file an administrative charge with or participate in an investigation by the EEOC or Texas Workforce Commission.',
        source_id: sources[0]?.id,
      },
    ],
    myths: [
      {
        myth: 'Employers are required by federal law to pay two weeks of severance for every year worked.',
        fact: 'Neither the Fair Labor Standards Act (FLSA) nor Texas state law requires employers to pay severance pay upon separation unless previously agreed in an employment contract.',
      },
      {
        myth: 'Signing a severance release means you can never report illegal conduct to federal authorities.',
        fact: 'Under federal law and SEC/EEOC regulations, confidentiality agreements cannot restrict you from speaking with or reporting violations to government regulatory agencies.',
      },
    ],
    clauses: [
      {
        title: 'General Release and Waiver of Claims (Section 3)',
        status: 'ask',
        what_it_says:
          '"Employee releases the Company from any and all claims, including Title VII of the Civil Rights Act, the ADEA, the ADA, and the Texas Labor Code."',
        what_it_means:
          'You are waiving all legal claims regarding your termination. Because the agreement fails to provide 45 days and demographic disclosures under OWBPA, the release of ADEA age discrimination claims may be legally invalid.',
        question_to_ask:
          'Will the company issue an amended separation agreement extending the consideration period to 45 days and attaching the required OWBPA Exhibit A demographic list?',
      },
      {
        title: 'Non-Disparagement and Confidentiality (Section 5)',
        status: 'ask',
        what_it_says:
          '"Employee agrees not to make any disparaging or defamatory statements regarding the Company, its executives, or its products in any public or private forum."',
        what_it_means:
          'Under recent NLRB rulings (McLaren Macomb), overly broad severance confidentiality and non-disparagement provisions that interfere with Section 7 rights are unlawful. Furthermore, this provision should be strictly mutual.',
        question_to_ask:
          'Can the company agree to make the non-disparagement covenant mutual so that company managers are equally barred from making disparaging remarks about me?',
      },
      {
        title: 'Post-Employment Restrictive Covenants (Section 7)',
        status: 'ask',
        what_it_says:
          '"Employee shall not directly or indirectly provide cloud engineering services to any competitor in the State of Texas for a period of one (1) year."',
        what_it_means:
          'Texas Business and Commerce Code § 15.50 requires non-compete agreements to be reasonable in scope, geography, and duration. An industry-wide statewide ban on technical contributors is often considered overly broad by Texas courts.',
        question_to_ask:
          'Will the company agree to release me from the non-competition restriction or narrow it strictly to direct solicitation of my assigned client accounts?',
      },
      {
        title: 'Return of Company Property & Intellectual Property',
        status: 'ok',
        what_it_says:
          '"Employee confirms return of all company laptops, credentials, software licenses, customer records, and confidential technical documentation."',
        what_it_means:
          'Standard operational provision ensuring proprietary materials and hardware are returned upon separation.',
        question_to_ask:
          'Can HR provide a written receipt acknowledging the physical return and audit of all company hardware and access cards upon handover?',
      },
    ],
    questions: [
      'Will the company correct the consideration period from 21 days to the federally required 45-day window under OWBPA?',
      'Can HR provide the OWBPA Exhibit A disclosure document listing the job classifications and ages of all employees selected and not selected in this reduction?',
      'Is the company willing to provide three months of subsidized COBRA health insurance coverage as part of the separation package?',
      'Will the company agree to mutual non-disparagement and provide an agreed neutral reference letter for prospective employers?',
    ],
    next_steps: [
      'Do not sign the 21-day agreement before receiving the mandatory federal demographic disclosures.',
      'Submit a formal written request for a 45-day review period citing OWBPA statutory compliance.',
      'Request subsidized COBRA health benefits and mutual non-disparagement terms in writing.',
      'Consult with an employment attorney licensed in Texas to evaluate severance negotiation leverage.',
    ],
    citations_used: sources.map((s) => s.id),
  }

  console.log('Rendering US PDF...')
  const pdfBuffer = await renderReportPdf(report, meta)
  const outPath = path.resolve('tmp/output_us.pdf')
  fs.writeFileSync(outPath, pdfBuffer)
  console.log(`US PDF written successfully: ${outPath} (${pdfBuffer.length} bytes)`)
}

async function run() {
  try {
    await generateCanadaReport()
    await generateUSReport()
    console.log('ALL PDF GENERATION COMPLETE!')
  } catch (err) {
    console.error('Generation failed:', err)
    process.exit(1)
  }
}

run()
