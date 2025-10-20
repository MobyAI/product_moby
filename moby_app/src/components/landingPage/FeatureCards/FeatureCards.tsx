import React from 'react';
import { BarChart3, Users, Globe, Clock } from 'lucide-react';
import Lottie from 'lottie-react';
import Conversation from '@/lotties/Conversation.json';
import Calendar from '@/lotties/Calendar.json';
import Control from '@/lotties/Control.json';
import laptop from '@/lotties/laptop.json';

const FeatureCard = ({
  icon: Icon,
  lottieData,
  title,
  description,
  bgColor = 'bg-orange-50',
  autoplay = true,
  loop = true,
}) => {
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  return (
    <div className={`${bgColor} rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="mb-6">
        <div className="w-32 h-32 bg-white rounded-2xl flex items-center justify-center mx-auto relative">
          {lottieData ? (
            <Lottie
              animationData={lottieData}
              autoplay={prefersReduced ? false : autoplay}
              loop={prefersReduced ? false : loop}
              className="absolute inset-0 m-auto w-20 h-20"
              aria-label={`${title} animation`}
            />
          ) : Icon ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Icon className="w-12 h-12 text-orange-500" strokeWidth={2} />
            </div>
          ) : null}
        </div>
      </div>

      <h3 className="text-xl font-semibold text-white mb-3">{title}</h3>
      <p className="text-white/90 leading-relaxed whitespace-pre-line">{description}</p>
    </div>
  );
};

const FeatureGrid = () => {
  const features = [
    {
    //   icon: Clock,
        lottieData: Calendar,
        title: 'Practice whenever and wherever',
        description: 'Upload any script and you have a scene reader ready to go',
        bgColor: 'bg-[#9369ff]/80',
    },
    {
      // icon: BarChart3, // optional when using lottie
        lottieData: Conversation,
        title: 'Get human-level execution',
        description:
            'Add emotional description to lines anywhere in the script and our scene reader will adjust their delivery so you stay locked-in',
        bgColor: 'bg-[#ef86c1]/80',
    },
    {
    //   icon: Users,
        lottieData: Control,
        title: 'Absolute control',
        description:
            'Make any changes — down to the amount of seconds you need before the next line starts',
        bgColor: 'bg-[#ffab39]/80',
    },
    {
    //   icon: Globe,
        lottieData: laptop,
        title: 'Track & manage with ease',
        description:
            'Track and manage all of your auditions so you can see your progress and growth at a glance.\nNever lose track of when your next audition is due with notifications so you stay on top of your game.',
        bgColor: 'bg-[#5170ff]/80',
    },
  ];

  return (
    <div className="min-h-screen ">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard {...features[0]} />
          <div className="md:col-span-2">
            <FeatureCard {...features[1]} />
          </div>
          <div className="md:col-span-2">
            <FeatureCard {...features[2]} />
          </div>
          <FeatureCard {...features[3]} />
        </div>
      </div>
    </div>
  );
};

export default FeatureGrid;
