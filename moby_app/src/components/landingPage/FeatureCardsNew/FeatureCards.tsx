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
  features = fallbackFeatures,
  className,
}: FeatureShowcaseProps) {
  return (
    <section
      className={["min-h-screen", "py-16 sm:py-20 lg:py-30", className]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Section header - horizontal layout */}
      <div className="w-[80%] md:w-[75%] mx-auto flex flex-col xl:flex-row xl:items-start xl:justify-between gap-8 lg:gap-16">
        {/* Headline - left side */}
        <div className="flex-shrink-0">
          <h2 className="text-6xl sm:text-7xl lg:text-[125px] font-crimson font-[300] tracking-tight text-black">
            Elevate
            <br />
            performance
          </h2>
        </div>

        {/* Description - right side */}
        <p className="text-black text-base font-semibold sm:text-lg lg:text-xl max-w-xl lg:self-end lg:mb-[-2rem]">
          From rehearsing lines with your own personal scene partner, to
          tracking each step of your acting career — own every performance from
          script to stage.
        </p>
      </div>

      {/* Cards grid */}
      <div
        className="
          w-[75%] mx-auto mt-[7rem]
          grid gap-6
          grid-cols-[repeat(auto-fit,minmax(16rem,1fr))]
          justify-items-center
        "
      >
        {features.map((f) => (
          <FeatureCard key={f.id} feature={f} />
        ))}
      </div>
    </section>
  );
}

function FeatureCard({ feature }: { feature: Feature }) {
  const { title, description, media } = feature;

  return (
    <motion.article
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 250, damping: 24 }}
      className="h-[20rem] md:h-[22rem] w-full max-w-[20rem]"
    >
      <Card className="h-full overflow-hidden rounded-2xl border-none bg-[#f7f9f4] shadow-sm hover:shadow-lg transition-shadow duration-300">
        <CardContent className="px-7 h-full flex flex-col items-start justify-start">
          <div className="space-y-2">
            {media?.node}
            <h3 className="text-md md:text-lg font-semibold text-black text-logo mt-4">
              {title}
            </h3>
            <p className="text-sm leading-relaxed text-gray-600">
              {description}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.article>
  );
}

/** Placeholder icons */
function MaskPreview() {
  return <VenetianMask className="w-8 h-8 xl:w-10 xl:h-10 text-black" />;
}

function LinePreview() {
  return <TrendingUp className="w-8 h-8 xl:w-10 xl:h-10 text-black" />;
}

function GaugePreview() {
  return <Gauge className="w-8 h-8 xl:w-10 xl:h-10 text-black" />;
}

function VoicePreview() {
  return <AudioWaveform className="w-8 h-8 xl:w-10 xl:h-10 text-black" />;
}
