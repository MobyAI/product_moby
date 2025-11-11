import { useState } from "react";
import { Plus, Minus } from "lucide-react";

const FAQItem = ({
  question,
  answer,
  defaultOpen = false,
}: {
  question: string;
  answer: string;
  defaultOpen?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      itemScope
      itemProp="mainEntity"
      itemType="https://schema.org/Question"
      className="border-b border-black pb-4"
    >
      <details open={isOpen}>
        <summary
          onClick={(e) => {
            e.preventDefault(); // Prevent default details behavior
            setIsOpen(!isOpen);
          }}
          className="w-full text-left flex justify-between items-center gap-4 py-4 group hover:cursor-pointer list-none"
          aria-expanded={isOpen}
        >
          <h3
            itemProp="name"
            className="text-lg sm:text-xl lg:text-2xl font-crimson font-semibold text-black"
          >
            {question}
          </h3>
          <div className="flex-shrink-0 relative w-6 h-6">
            <Plus
              className={`absolute inset-0 w-6 h-6 text-black transition-all duration-300 ${
                isOpen ? "rotate-90 opacity-0" : "rotate-0 opacity-100"
              }`}
            />
            <Minus
              className={`absolute inset-0 w-6 h-6 text-black transition-all duration-300 ${
                isOpen ? "rotate-0 opacity-100" : "rotate-90 opacity-0"
              }`}
            />
          </div>
        </summary>
        <div
          itemScope
          itemProp="acceptedAnswer"
          itemType="https://schema.org/Answer"
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <p
            itemProp="text"
            className="text-sm sm:text-base lg:text-lg text-black leading-relaxed pt-2 pb-4"
          >
            {answer}
          </p>
        </div>
      </details>
    </div>
  );
};

export default FAQItem;
