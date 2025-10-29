import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { VenetianMask, Gauge, TrendingUp, AudioWaveform } from "lucide-react";

export type Feature = {
  id: string;
  media?: { src?: string; alt?: string; node?: React.ReactNode };
  badge?: string;
  title: string;
  description: string;
  cta?: { label: string; onClick?: () => void; href?: string };
};

export type FeatureShowcaseProps = {
  eyebrow?: string;
  headline?: string;
  features?: Feature[];
  className?: string;
};

const fallbackFeatures: Feature[] = [
  {
    id: "practice",
    media: { node: <MaskPreview /> },
    badge: "",
    title: "Practice anytime, anywhere",
    description:
      "Upload your script and step right into your scene. Rehearse on demand with a lifelike reader that’s always ready when you are.",
  },
  {
    id: "speech",
    media: { node: <VoicePreview /> },
    badge: "",
    // title: "Perform with human-level emotion",
    title: "Bring every line to life",
    description:
      "Add emotional notes to any line and watch your reader bring it to life—perfect tone, perfect timing, every single take.",
  },
  {
    id: "control",
    media: { node: <GaugePreview /> },
    badge: "",
    title: "Command every moment",
    description:
      "Shape every beat of your scene. Control pauses, pacing, and delivery down to the second for flawless, personalized performance.",
  },
  {
    id: "track",
    media: { node: <LinePreview /> },
    badge: "",
    title: "Stay organized, stay ahead",
    description:
      "Track every audition in one place, monitor your progress, and get smart reminders so you never miss a cue—or a deadline.",
  },
];

export default function FeatureShowcase({
  //   headline = "Practice smarter, perform better",
  // headline = "Elevate every performance",
  features = fallbackFeatures,
  className,
}: FeatureShowcaseProps) {
  return (
    <section
      className={[
        "w-[85%] min-h-screen",
        "mx-auto py-16 sm:py-20 lg:py-30",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="px-6 sm:px-10 lg:px-12">
        {/* Section header - horizontal layout */}
        <div className="mx-auto flex flex-col lg:flex-row lg:items-start gap-8 lg:gap-16">
          {/* Headline - left side */}
          <div className="flex-shrink-0">
            <h2 className="text-5xl sm:text-6xl lg:text-[125px] font-inter font-[200] tracking-tight text-white">
              Elevate
              <br />
              <span className="ml-8 sm:ml-12 lg:ml-16">every performance</span>
            </h2>
          </div>

          {/* Description - right side */}
          <p className="text-white/90 text-base sm:text-lg lg:text-xl max-w-xl lg:self-end lg:mb-[-5rem]">
            From rehearsing your lines to mastering delivery and tracking your
            journey—own every moment on and off the script.
          </p>
        </div>

        {/* Cards grid */}
        <div className="mt-[10rem] grid gap-4 sm:gap-6 lg:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {features.map((f) => (
            <FeatureCard key={f.id} feature={f} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ feature }: { feature: Feature }) {
  const { title, description, media } = feature;

  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 250, damping: 24 }}
      className="h-full"
    >
      <Card className="h-full overflow-hidden rounded-2xl border border-slate-200/50 dark:border-white/10 bg-white dark:bg-slate-950 shadow-sm hover:shadow-lg transition-shadow duration-300">
        <CardContent className="p-6 sm:p-8 flex flex-col">
          <div className="space-y-2">
            {media?.node}
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white text-logo mt-4">
              {title}
            </h3>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300/90">
              {description}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/** Placeholder icons */
function MaskPreview() {
  return <VenetianMask className="w-10 h-10 text-slate-400" />;
}

function LinePreview() {
  return <TrendingUp className="w-10 h-10 text-slate-400" />;
}

function GaugePreview() {
  return <Gauge className="w-10 h-10 text-slate-400" />;
}

function VoicePreview() {
  return <AudioWaveform className="w-10 h-10 text-slate-400" />;
}
