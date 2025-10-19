"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import React, { useRef } from "react";

type Card = {
  title: string;
  description: string;
  icon?: React.ReactNode;
  accent?: string; // tailwind bg color like "bg-yellow-300/50"
};

const CARDS: Card[] = [
  {
    title: "Faster uploads",
    description:
      "Multi-part uploads with retries and parallelization built-in.",
    accent: "bg-yellow-300/50",
  },
  {
    title: "99.99% uptime",
    description:
      "Redundant regions with automatic failover keep you online.",
    accent: "bg-emerald-300/50",
  },
  {
    title: "Unlimited requests",
    description:
      "Scale without worrying about hard limits or surprise throttling.",
    accent: "bg-sky-300/50",
  },
  {
    title: "500+ integrations",
    description:
      "Drop into your stack with official SDKs and community adapters.",
    accent: "bg-pink-300/50",
  },
];

export default function StickyCardsSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  // overall scroll progress across the whole section (for extras if you want)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  return (
    <section ref={sectionRef} className="relative w-full">
      {/* Headline row */}
      <div className="mx-auto max-w-4xl px-6 pt-24 pb-16 text-center">
        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
          Features that stick while you scroll
        </h2>
        <p className="mt-4 text-neutral-600">
          Cards pin to the viewport and hand off as you move down the page.
        </p>
      </div>

      {/* Scroll track: make it tall so we have room to pin/swap */}
      <div className="relative mx-auto max-w-4xl px-6">
        {/* One tall lane; each item is long so the next one catches up */}
        <div className="relative">
          {CARDS.map((card, i) => (
            <StickyCard key={card.title} index={i} total={CARDS.length} {...card} />
          ))}
        </div>
      </div>

      {/* Spacer so the last card has room to unpin gracefully */}
      <div className="h-[40vh]" />
    </section>
  );
}

function StickyCard({
  title,
  description,
  accent = "bg-yellow-300/50",
  index,
  total,
}: Card & { index: number; total: number }) {
  const itemRef = useRef<HTMLDivElement>(null);

  // Track scroll for just this item’s container height
  const { scrollYProgress } = useScroll({
    target: itemRef,
    // When this item’s top hits the center of the viewport (start),
    // until its bottom leaves the center (end).
    offset: ["start 60%", "end 40%"],
  });

  // Animate each card as it becomes “active” in the sticky stack
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.96, 1, 0.98]);
  const opacity = useTransform(scrollYProgress, [0, 0.15, 1], [0.35, 1, 0.85]);
  const y = useTransform(scrollYProgress, [0, 1], [24, 0]); // subtle rise-in

  // Layering: later cards stack above earlier ones so handoff feels natural
  const z = 10 + index;

  return (
    // Each “lane” is tall; the sticky card pins within it
    <div
      ref={itemRef}
      className={`relative h-[120vh]`}
      aria-hidden={false}
    >
      <motion.article
        style={{ scale, opacity, y }}
        className={`sticky top-[12vh] z-${z} will-change-transform`}
      >
        <div
          className={[
            "rounded-2xl border border-black/10 shadow-[0_8px_30px_rgba(0,0,0,0.08)]",
            "backdrop-blur bg-white",
          ].join(" ")}
        >
          {/* Accent band */}
          <div className={`h-2 ${accent} rounded-t-2xl`} />

          <div className="p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-xl sm:text-2xl font-bold">{title}</h3>
              <span className="text-sm text-neutral-500">
                {index + 1} / {total}
              </span>
            </div>
            <p className="mt-3 text-neutral-700 leading-relaxed">
              {description}
            </p>

            <div className="mt-5 flex items-center gap-3">
              <button className="px-3 py-2 rounded-lg border border-black/10 hover:bg-black hover:text-white transition">
                Learn more
              </button>
              <button className="px-3 py-2 rounded-lg border border-transparent bg-black text-white hover:opacity-90 transition">
                Try it
              </button>
            </div>
          </div>
        </div>
      </motion.article>
    </div>
  );
}
