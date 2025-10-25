import React, { useRef, useState, useEffect } from "react";
import { motion, useInView } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface AnimatedCardProps {
  children: React.ReactNode;
  delay?: number;
  index: number;
}

const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  delay = 0,
  index,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3, once: false });

  return (
    <motion.div
      ref={ref}
      data-index={index}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={inView ? { scale: 1, opacity: 1 } : { scale: 0.8, opacity: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      {children}
    </motion.div>
  );
};

interface CardCarouselProps {
  cards: React.ReactNode[];
  cardsPerPage?: number;
  showArrows?: boolean;
  showDots?: boolean;
  className?: string;
}

export const CardCarousel: React.FC<CardCarouselProps> = ({
  cards = [],
  cardsPerPage = 3,
  showArrows = true,
  showDots = true,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [responsiveCardsPerPage, setResponsiveCardsPerPage] =
    useState(cardsPerPage);

  // Handle responsive cards per page based on screen size
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 900) {
        setResponsiveCardsPerPage(1);
      } else if (width < 1440) {
        setResponsiveCardsPerPage(2);
      } else {
        setResponsiveCardsPerPage(cardsPerPage);
      }
    };

    handleResize(); // Initial check
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [cardsPerPage]);

  const totalPages = Math.ceil(cards.length / responsiveCardsPerPage);

  const scrollToPage = (pageIndex: number) => {
    if (!containerRef.current) return;
    const newPage = Math.max(0, Math.min(pageIndex, totalPages - 1));
    setCurrentPage(newPage);

    const container = containerRef.current;
    const scrollAmount = (container.scrollWidth / totalPages) * newPage;
    container.scrollTo({ left: scrollAmount, behavior: "smooth" });
  };

  const handlePrevious = () => {
    scrollToPage(currentPage - 1);
  };

  const handleNext = () => {
    scrollToPage(currentPage + 1);
  };

  const handleScroll = () => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const scrollPercentage =
      container.scrollLeft / (container.scrollWidth - container.clientWidth);
    const newPage = Math.round(scrollPercentage * (totalPages - 1));
    setCurrentPage(newPage);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrevious();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // Group cards into pages
  const pages = [];
  for (let i = 0; i < cards.length; i += responsiveCardsPerPage) {
    pages.push(cards.slice(i, i + responsiveCardsPerPage));
  }

  return (
    <div className={`w-[95%] mx-auto ${className}`}>
      <div className="relative">
        {/* Arrow Buttons */}
        {showArrows && (
          <>
            <button
              onClick={handlePrevious}
              disabled={currentPage === 0}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 z-10 hover:bg-black/5 disabled:opacity-50 disabled:cursor-not-allowed text-black rounded-full p-3 transition-all"
              aria-label="Previous page"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={handleNext}
              disabled={currentPage === totalPages - 1}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 z-10 hover:bg-black/5 disabled:opacity-50 disabled:cursor-not-allowed text-black rounded-full p-3 transition-all"
              aria-label="Next page"
            >
              <ChevronRight size={24} />
            </button>
          </>
        )}

        {/* Cards Container */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="overflow-x-auto hide-scrollbar scroll-smooth"
          style={{ scrollSnapType: "x mandatory" }}
        >
          <div className="flex" style={{ width: `${totalPages * 100}%` }}>
            {pages.map((page, pageIndex) => (
              <div
                key={pageIndex}
                className="flex justify-center items-center flex-shrink-0"
                style={{
                  scrollSnapAlign: "start",
                  width: `${100 / totalPages}%`,
                  padding: "0 2rem",
                }}
              >
                {page.map((card, cardIndex) => {
                  const absoluteIndex =
                    pageIndex * responsiveCardsPerPage + cardIndex;
                  return (
                    <div key={absoluteIndex} className="flex-1 px-2 flex justify-center">
                      <AnimatedCard
                        index={absoluteIndex}
                        delay={cardIndex * 0.1}
                      >
                        {card}
                      </AnimatedCard>
                    </div>
                  );
                })}
                {/* Add empty placeholders if page is not full */}
                {page.length < responsiveCardsPerPage &&
                  Array.from({
                    length: responsiveCardsPerPage - page.length,
                  }).map((_, i) => (
                    <div key={`placeholder-${i}`} className="flex-1 px-2" />
                  ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dot Indicators */}
      {showDots && totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: totalPages }).map((_, index) => (
            <button
              key={index}
              onClick={() => scrollToPage(index)}
              className={`h-2.5 rounded-full transition-all ${
                index === currentPage
                  ? "w-8 bg-[#a5a098]"
                  : "w-2.5 bg-[#e1ddcf] hover:bg-[#a5a098]"
              }`}
              aria-label={`Go to page ${index + 1}`}
            />
          ))}
        </div>
      )}

      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};
