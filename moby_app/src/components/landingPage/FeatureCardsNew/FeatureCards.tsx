import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui";
import { BarChart3, Gauge, LineChart } from "lucide-react";

/**
 * FeatureShowcase
 * ---------------------------------------------------------------------------
 * A drop‑in, responsive section that mirrors the clean card styling from the
 * screenshot: a small eyebrow label, a bold headline, and three soft, elevated
 * cards with image/icon, tiny category, title, description, and a "Learn more"
 * button.
 *
 * - Tailwind for layout & style
 * - Subtle hover lift + shadow using Framer Motion
 * - Accepts data via props, but also exports a sensible default
 */

export type Feature = {
  id: string;
  // You can pass either a src string for an image or a React node (icon, chart, etc.)
  media?: { src?: string; alt?: string; node?: React.ReactNode };
  badge?: string; // e.g., "PROGRESSION"
  title: string;
  description: string;
  cta?: { label: string; onClick?: () => void; href?: string };
};

export type FeatureShowcaseProps = {
  eyebrow?: string; // e.g., "OUR BEST FEATURES 🔥"
  headline?: string; // e.g., "Unleash the full financial potential..."
  features?: Feature[];
  className?: string;
};

const fallbackFeatures: Feature[] = [
  {
    id: "practice",
    media: { node: <BarPreview /> },
    badge: "",
    title: "Practice whenever and wherever",
    description:
      "Upload any script and you have a scene reader ready to go",
    // cta: { label: "Learn more" },
  },
  {
    id: "speech",
    media: { node: <LinePreview /> },
    badge: "",
    title: "Get human-level execution",
    description:
      "Add emotional description to lines anywhere in the script and our scene reader will adjust their delivery so you stay locked-in",
    // cta: { label: "Learn more" },
  },
  {
    id: "control",
    media: { node: <GaugePreview /> },
    badge: "",
    title: "Absolute control",
    description:
      "Make any changes - down to the amount of seconds you need before the next line starts",
    cta: { label: "Learn more" },
  },
   {
    id: "track",
    media: { node: <GaugePreview /> },
    badge: "",
    title: "Track & manage with ease",
    description:
      "Track and manage all of your auditions so you can see your progress and growth at a glance.\nNever lose track of when your next audition is due with notifications so you stay on top of your game.",
    // cta: { label: "Learn more" },
  },
];

export default function FeatureShowcase({
//   eyebrow = "FEATURES",
  headline = "Practice smarter, perform better",
  features = fallbackFeatures,
  className,
}: FeatureShowcaseProps) {
  return (
    <section
      className={[
        "w-screen",
        // "py-12 sm:py-16 lg:py-20",
        // "rounded-xl",
        "py-12",
        "bg-[#363c54]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto">
          {/* <div className="inline-flex items-center text-[11px] tracking-wider uppercase font-semibold text-white px-3 py-1 rounded-full bg-slate-100/80 dark:bg-white/5 ring-1 ring-slate-200 dark:ring-white/10">
            {eyebrow}
          </div> */}
          <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-white text-header">
            {headline}
          </h2>
          <p className="text-white mt-2">Everything you need to rehearse, control delivery, and track your progress</p>
        </div>

        {/* Cards grid */}
        <div className="mt-8 sm:mt-10 grid gap-4 sm:gap-5 lg:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {features.map((f) => (
            <FeatureCard key={f.id} feature={f} />)
          )}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ feature }: { feature: Feature }) {
  const { media, badge, title, description, cta } = feature;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="h-full"
    >
      <Card className="h-full overflow-hidden rounded-2xl border-slate-200/70 dark:border-white/10 bg-white dark:bg-slate-950 shadow-sm hover:shadow-md">
        <CardContent className="p-5 sm:p-6 flex flex-col gap-3">
          {/* Media */}
          <div className="aspect-[16/9] w-full rounded-xl bg-slate-100 dark:bg-white/5 grid place-items-center overflow-hidden ring-1 ring-slate-200/60 dark:ring-white/10">
            {media?.node ? (
              media.node
            ) : media?.src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={media.src}
                alt={media.alt ?? ""}
                className="max-h-full max-w-full object-contain"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <span className="text-slate-400 text-xs">Media</span>
            )}
          </div>

          {/* Text */}
          <div className="space-y-1.5">
            <p className="text-[11px] tracking-wider font-semibold uppercase text-slate-500 dark:text-slate-300/80">
              {badge}
            </p>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {title}
            </h3>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300/90">
              {description}
            </p>
          </div>

          {/* CTA */}
          {/* {cta?.href ? (
            <Button asChild variant="secondary" className="mt-2 w-fit">
              <a href={cta.href}>{cta.label}</a>
            </Button>
          ) : cta?.onClick ? (
            <Button variant="secondary" className="mt-2 w-fit" onClick={cta.onClick}>
              {cta.label}
            </Button>
          ) : (
            <Button variant="secondary" className="mt-2 w-fit">
              {cta?.label ?? "Learn more"}
            </Button>
          )} */}
        </CardContent>
      </Card>
    </motion.div>
  );
}

/** Simple placeholder media blocks (icons + shapes) */
function BarPreview() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <BarChart3 className="w-10 h-10" />
    </div>
  );
}

function LinePreview() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <LineChart className="w-10 h-10" />
    </div>
  );
}

function GaugePreview() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <Gauge className="w-10 h-10" />
    </div>
  );
}
