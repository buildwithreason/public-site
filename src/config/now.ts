/**
 * The /now page content, kept as data so the homepage "Currently" block and the
 * full page never drift apart. This is the file to edit most often — a two
 * minute update every few weeks is the whole point of a /now page.
 */
export const now = {
  /** ISO date. Rendered as "Last updated ...". */
  updated: "2026-09-06",

  intro:
    "A short, honest snapshot of what has my attention right now — updated every few weeks rather than kept perpetually current.",

  sections: [
    {
      heading: "Building",
      items: [
        "An agentic pipeline for discovering and reasoning over technical content, with a focus on how much of the orchestration actually needs to be an agent.",
        "This site — a place to think in public about software, systems, cloud and AI.",
      ],
    },
    {
      heading: "Writing about",
      items: [
        "Ordering and delivery guarantees in distributed messaging systems.",
        "What retrieval-augmented generation actually is once you stop calling it a database.",
        "The reasoning habits that separate senior engineering judgement from senior job titles.",
      ],
    },
    {
      heading: "Thinking about",
      items: [
        "How AI changes the economics of writing software, and which parts of the job it leaves untouched.",
        "Why abstractions leak in predictable places, and what that predicts about system design.",
        "Where multi-agent architectures earn their complexity, and where a single well-scoped loop wins.",
      ],
    },
  ],
} as const;
