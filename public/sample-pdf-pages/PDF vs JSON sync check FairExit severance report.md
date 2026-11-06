# PDF vs JSON sync check: FairExit severance report

*Compared check-Sync.pdf (23 pages) against the JSON response · November 5, 2026*

## Verdict

The PDF and the JSON are **not fully in sync**. The sections that come straight from the JSON match almost word for word: the glance paragraph, 12 of the 13 check rows, all 5 myths, all 3 clauses, all 11 questions, the factor explanations and the 4 sources. The problems are in parts of the PDF that look hard-coded, which contradict the JSON, and in one row lost to a layout overflow.

## Real mismatches, most serious first

### 1. Sign-by deadline

The JSON says "No deadline is written" in both the glance text and the "Deadline to sign" row. The PDF says otherwise:

- **p5:** the summary box shows "Decide by Oct 5, 5 p.m."
- **p6:** "You have a date to sign by."
- **p19:** "sign-by Oct 5, 5 p.m."

Oct 5 is also a month before the report date, November 5, 2026.

### 2. "The $8,400 doesn't depend on signing" (p19)

The JSON clause says the $8,400 is paid only if you sign the separate agreement, and the PDF's own p14 says the same. Page 19 also mentions an "extra $5,000" that appears nowhere in the JSON. This is the one most likely to mislead the reader.

### 3. Legal minimum breakdown (p12, and the "Floor =" line on p9)

The JSON says BC has no separate severance pay, so the minimum is 3 weeks, or $5,769. The PDF shows termination pay of $2,308, severance pay of 14.5 weeks ($3,461) and vacation pay of $1,038, then "Legal minimum: $5,769". That contradicts myth #2 on p6, and the numbers don't add up:

- The three lines sum to $6,807, not $5,769.
- 6% of $2,308 is $138, not $1,038.
- $2,308 for 3 weeks implies about $769 a week, not the $1,923 used everywhere else.

### 4. "This week" steps (p19) don't match the JSON's next\_steps

- The PDF says to apply for EI within 4 weeks of your last day. The JSON says to apply now and ask about late applications, which fits, since the last day was January 30, 2026.
- The PDF adds "benefits Nov 23", but the JSON says no benefits end date was given.
- The PDF adds a "2-year claim limit" and "promotion note, bonus plan", neither of which is in the JSON.
- The PDF drops three JSON steps: wait to sign, ask HR in writing for the agreement and a signed contract, and talk to a lawyer about the temporary title and complaint window.

### 5. "What your shape says" (p10)

It says the chart reaches furthest on age and length of service. The JSON scores those lowest (age 0.1, service 0.2) and job level highest (0.5). The radar chart on the same page also extends furthest toward Job level.

### 6. Missing row and footer on p7

The "Temporary job title" row (check #8 in the JSON) appears nowhere in the PDF. The table runs off the bottom of page 7, so the top edge of the row is cut off, and the page's footer and "Page 7 of 23" are gone. The header also counts "12 to ask about", but only 9 rows say "Ask about this" (the JSON has 10), because the two "Good to know" rows are lumped in.

## Smaller things

- **Duplicate text (pp14–16):** each clause prints the same text twice, once under "What the rules say" and again under "Why it matters".
- **Typo on p15:** it shows "2.What happens…" with no space.
- **Repeated line on p23:** "Rules as of October 25, 2026." appears twice.
- **JSON fields not visible in the PDF:** the from\_answers flags and the per-row source\_id in the table. This may be intentional.
- **Offer vs. floor (p9):** the JSON says the $8,400 is on top of the legal minimum, but the gauge treats $8,400 as the whole offer ("near the floor"). If it is on top, the total is about $14,169. That is a judgment call.

## Not a sync issue, but both files share it

The estimate of $22,500–$30,000 is described as "3 to 4 months of base pay". At $100,000 a year, 3 to 4 months is $25,000–$33,333. The range only works out at $90,000 a year.
