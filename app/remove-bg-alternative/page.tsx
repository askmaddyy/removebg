import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/chrome";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "remove.bg alternative: free, unlimited, runs in your browser",
  description:
    "remove.bg closes its standalone site on 1 December 2026. removebg.fyi is a free, open-source replacement: unlimited cuts at full resolution, no account, no watermark, and nothing ever uploaded.",
  alternates: { canonical: "/remove-bg-alternative" },
  openGraph: {
    title: "The free remove.bg alternative",
    description:
      "The standalone site closes 1 December 2026. A plain comparison of where to go next, API included.",
    url: "https://removebg.fyi/remove-bg-alternative",
    type: "article",
  },
};

/** Every claim on this page is dated and sourced — the shutdown facts came from
 *  remove.bg's own FAQ and contemporaneous reporting, not from us. */
const FACTS = [
  { k: "Standalone site closes", v: "1 December 2026, 09:00 CET" },
  { k: "Unused credits", v: "Expire at that same moment" },
  { k: "Where it goes", v: "Background removal moves into Canva" },
  { k: "The API", v: "Moves to Leonardo.Ai, also Canva-owned" },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "Is remove.bg really shutting down?",
    a: "The standalone remove.bg website is being discontinued on 1 December 2026 at 09:00 CET. The background removal itself is not disappearing, it is being folded into Canva, which has owned remove.bg since 2021. What goes away is the separate site you visit, and the separate account and credits attached to it.",
  },
  {
    q: "What happens to my unused remove.bg credits?",
    a: "Credits expire at the shutdown moment, 1 December 2026 at 09:00 CET. If you hold pay-as-you-go credits, spend them or check your billing settings well before that date rather than on the day.",
  },
  {
    q: "What replaces the remove.bg API?",
    a: "API background removal moves to Leonardo.Ai, another Canva company, from 1 December 2026. If you have a production integration calling the remove.bg API, that migration is the supported path and you should plan it now.",
  },
  {
    q: "Is removebg.fyi free, and is there a catch?",
    a: "It is free with no account, no watermark, no credits and no upload limit, because there is no server doing the work. The model runs in your own browser on your own hardware, so the only cost of a cut is your own electricity. The code is open source under the MIT licence.",
  },
  {
    q: "Are my images uploaded anywhere?",
    a: "No. The model downloads to your browser once and every cut after that happens locally. The images never leave your device, which also means it keeps working with the network off.",
  },
  {
    q: "Does it work on things other than people?",
    a: "Yes. It is a general matting model, not a person segmenter, so products, cars, animals, furniture, plants and graphics all work. Hair and fur are the hard cases and it handles them reasonably; a refine brush is there for the edges it misses.",
  },
];

const ROWS = [
  {
    name: "removebg.fyi",
    price: "Free, unlimited",
    where: "Your browser",
    api: "No API",
    best: "One-off cuts at full resolution, private images",
    us: true,
  },
  {
    name: "Canva",
    price: "Paid plan",
    where: "Canva's servers",
    api: "Via Canva",
    best: "You already design in Canva",
  },
  {
    name: "Leonardo.Ai",
    price: "Paid, per call",
    where: "Their servers",
    api: "Yes, the official API path",
    best: "You had a remove.bg API integration",
  },
  {
    name: "rembg (self-hosted)",
    price: "Free, your infra",
    where: "Your own machine",
    api: "You host it",
    best: "Batch jobs and pipelines you control",
  },
];

export default function RemoveBgAlternative() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <main className="relative min-h-dvh">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Header />

      <article className="relative mx-auto max-w-[760px] px-5 pb-8 pt-10 sm:px-8 sm:pt-16">
        <p className="mono text-[11px] uppercase tracking-[0.12em] text-text-3">
          Updated 16 September 2026
        </p>

        <h1 className="mt-5 text-[clamp(2.1rem,6vw,3.6rem)] font-medium leading-[1.02] tracking-[-0.035em] text-balance">
          remove.bg is shutting down. Here is where to go.
        </h1>

        <p className="mt-6 text-[17px] leading-relaxed text-text-2">
          On <strong className="font-medium text-text">1 December 2026</strong> the standalone
          remove.bg site closes and its background removal moves into Canva, which has owned it
          since 2021. Unused credits expire the same morning, and the API moves to Leonardo.Ai.
          If you used remove.bg for the simple thing, drop an image in and get a transparent
          PNG out, this page is about what to use instead.
        </p>

        <dl className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-edge bg-edge sm:grid-cols-2">
          {FACTS.map((f) => (
            <div key={f.k} className="bg-surface px-5 py-4">
              <dt className="mono text-[11px] uppercase tracking-[0.1em] text-text-3">{f.k}</dt>
              <dd className="mt-1.5 text-[15px] text-text">{f.v}</dd>
            </div>
          ))}
        </dl>

        <h2 className="mt-16 text-[clamp(1.5rem,3.5vw,2.1rem)] font-medium tracking-[-0.03em]">
          The options, plainly
        </h2>
        <p className="mt-4 text-[16px] leading-relaxed text-text-2">
          We build one of these, so read the table with that in mind.
        </p>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-edge">
          <table className="w-full min-w-[640px] border-collapse text-left text-[14px]">
            <thead>
              <tr className="border-b border-edge bg-surface-2">
                {["Tool", "Cost", "Runs on", "API", "Best for"].map((h) => (
                  <th key={h} className="mono px-4 py-3 text-[11px] uppercase tracking-[0.1em] font-normal text-text-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.name} className="border-b border-edge last:border-0 bg-surface">
                  <td className="px-4 py-3.5 font-medium">
                    {r.name}
                    {r.us && (
                      <span className="mono ml-2 rounded-full bg-surface-2 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.08em] text-text-3">
                        ours
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-text-2">{r.price}</td>
                  <td className="px-4 py-3.5 text-text-2">{r.where}</td>
                  <td className="px-4 py-3.5 text-text-2">{r.api}</td>
                  <td className="px-4 py-3.5 text-text-2">{r.best}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="mt-16 text-[clamp(1.5rem,3.5vw,2.1rem)] font-medium tracking-[-0.03em]">
          If you just want the transparent PNG
        </h2>
        <p className="mt-4 text-[16px] leading-relaxed text-text-2">
          That is what this site does. A matting model downloads to your browser once, then every
          cut runs on your own hardware. No account, no watermark, no credits, no upload. Because
          nothing is metered, there is no reason to limit resolution, so you get the full-size
          file. The code is MIT-licensed and on GitHub.
        </p>
        <p className="mt-4 text-[16px] leading-relaxed text-text-2">
          There is no hosted API, so if you were calling remove.bg from code, see below.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/app"
            className="inline-flex items-center gap-2.5 rounded-full bg-ink px-6 py-3.5 text-[15px] font-semibold text-on-ink transition-transform hover:-translate-y-px"
          >
            Open the editor
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
            </svg>
          </Link>
          <a
            href="https://github.com/askmaddyy/removebg"
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-edge bg-surface px-6 py-3.5 text-[15px] font-medium transition-colors hover:border-edge-bright"
          >
            Read the source
          </a>
        </div>

        <h2 className="mt-16 text-[clamp(1.5rem,3.5vw,2.1rem)] font-medium tracking-[-0.03em]">
          If you were calling the API
        </h2>
        <p className="mt-4 text-[16px] leading-relaxed text-text-2">
          Leonardo.Ai is the official migration path for the remove.bg API. If you would rather
          not depend on a vendor,{" "}
          <code className="mono rounded bg-surface-2 px-1.5 py-0.5 text-[13px]">rembg</code>{" "}
          self-hosts the same class of model, and this site&apos;s source shows how to run one
          client-side so the work happens in your users&apos; browsers instead of on your bill.
        </p>

        <h2 className="mt-16 text-[clamp(1.5rem,3.5vw,2.1rem)] font-medium tracking-[-0.03em]">
          Questions
        </h2>
        <div className="mt-6 divide-y divide-edge overflow-hidden rounded-2xl border border-edge bg-surface">
          {FAQ.map((f) => (
            <details key={f.q} className="group px-5 py-4">
              <summary className="cursor-pointer list-none text-[15px] font-medium marker:hidden">
                {f.q}
              </summary>
              <p className="mt-3 text-[15px] leading-relaxed text-text-2">{f.a}</p>
            </details>
          ))}
        </div>

        <p className="mt-12 text-[13px] leading-relaxed text-text-3">
          Shutdown dates are as announced by remove.bg and reported in September 2026. We are not
          affiliated with remove.bg, Canva or Leonardo.Ai. If the dates move, this page is wrong
          until we fix it. Check their FAQ for the current position.
        </p>
      </article>

      <SiteFooter />
    </main>
  );
}
