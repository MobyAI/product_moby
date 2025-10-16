import React, {
  useRef,
  useState,
  useEffect,
  ReactNode,
  MouseEventHandler,
  UIEvent,
} from "react";
import { motion, useInView } from "motion/react";
import { Trash, Star } from "lucide-react";

interface AnimatedItemProps {
  children: ReactNode;
  delay?: number;
  index: number;
  onMouseEnter?: MouseEventHandler<HTMLDivElement>;
  onClick?: MouseEventHandler<HTMLDivElement>;
}

const AnimatedItem: React.FC<AnimatedItemProps> = ({
  children,
  delay = 0,
  index,
  onMouseEnter,
  onClick,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.5, once: false });
  return (
    <motion.div
      ref={ref}
      data-index={index}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      initial={{ scale: 0.7, opacity: 0 }}
      animate={inView ? { scale: 1, opacity: 1 } : { scale: 0.7, opacity: 0 }}
      transition={{ duration: 0.2, delay }}
      style={{ marginBottom: "1rem", cursor: "pointer" }}
    >
      {children}
    </motion.div>
  );
};

interface ScriptItem {
  id: string;
  name: string;
  script: any[];
  ownerUid: string;
  createdAt: any;
  updatedAt: any;
  lastPracticed: any;
  starred?: boolean;
}

interface AnimatedListProps {
  items?: ScriptItem[];
  onItemSelect?: (item: ScriptItem, index: number) => void;
  handleDelete?: (id: string) => void;
  toggleStarred?: (id: string) => void;
  savingItemId?: string | null;
  deletingItemId?: string | null;
  showGradients?: boolean;
  enableArrowNavigation?: boolean;
  className?: string;
  itemClassName?: string;
  displayScrollbar?: boolean;
  initialSelectedIndex?: number;
  renderItem?: (item: ScriptItem, isSelected: boolean) => ReactNode;
}

export const AnimatedList: React.FC<AnimatedListProps> = ({
  items = [],
  onItemSelect,
  handleDelete,
  toggleStarred,
  savingItemId,
  deletingItemId,
  showGradients = false,
  enableArrowNavigation = true,
  className = "",
  itemClassName = "",
  displayScrollbar = true,
  initialSelectedIndex = -1,
  renderItem,
}) => {
  const listRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] =
    useState<number>(initialSelectedIndex);
  const [keyboardNav, setKeyboardNav] = useState<boolean>(false);
  const [topGradientOpacity, setTopGradientOpacity] = useState<number>(0);
  const [bottomGradientOpacity, setBottomGradientOpacity] = useState<number>(1);

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const { scrollTop, scrollHeight, clientHeight } = target;
    setTopGradientOpacity(Math.min(scrollTop / 50, 1));
    const bottomDistance = scrollHeight - (scrollTop + clientHeight);
    setBottomGradientOpacity(
      scrollHeight <= clientHeight ? 0 : Math.min(bottomDistance / 50, 1)
    );
  };

  useEffect(() => {
    if (!enableArrowNavigation) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey)) {
        e.preventDefault();
        setKeyboardNav(true);
        setSelectedIndex((prev) => Math.min(prev + 1, items.length - 1));
      } else if (e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey)) {
        e.preventDefault();
        setKeyboardNav(true);
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        if (selectedIndex >= 0 && selectedIndex < items.length) {
          e.preventDefault();
          if (onItemSelect) {
            onItemSelect(items[selectedIndex], selectedIndex);
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [items, selectedIndex, onItemSelect, enableArrowNavigation]);

  useEffect(() => {
    if (!keyboardNav || selectedIndex < 0 || !listRef.current) return;
    const container = listRef.current;
    const selectedItem = container.querySelector(
      `[data-index="${selectedIndex}"]`
    ) as HTMLElement | null;
    if (selectedItem) {
      const extraMargin = 50;
      const containerScrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      const itemTop = selectedItem.offsetTop;
      const itemBottom = itemTop + selectedItem.offsetHeight;
      if (itemTop < containerScrollTop + extraMargin) {
        container.scrollTo({ top: itemTop - extraMargin, behavior: "smooth" });
      } else if (
        itemBottom >
        containerScrollTop + containerHeight - extraMargin
      ) {
        container.scrollTo({
          top: itemBottom - containerHeight + extraMargin,
          behavior: "smooth",
        });
      }
    }
    setKeyboardNav(false);
  }, [selectedIndex, keyboardNav]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Never";
    // Handle Firestore Timestamp
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  const defaultRenderItem = (item: ScriptItem, isSelected: boolean) => (
    <div
      className={`p-4 rounded-lg transition-all ${
        isSelected ? "bg-blue-50" : "bg-white/50"
      } ${itemClassName}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-primary-dark">
            {item.name}
          </h3>
          <span className="text-sm text-gray-400">
            {formatDate(item.createdAt)}
          </span>
        </div>
        <div className="flex gap-1 ml-4">
          {toggleStarred && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleStarred(item.id);
              }}
              disabled={savingItemId != null}
              className="p-2 rounded-full hover:bg-black/5 transition-colors"
              aria-label={item.starred ? "Unstar" : "Star"}
            >
              <Star
                className={`w-5 h-5 ${
                  item.starred
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-400"
                } ${
                  savingItemId === item.id
                    ? "animate-[bounce_0.5s_ease-in-out_infinite,spin_1s_linear_infinite]"
                    : ""
                }`}
              />
            </button>
          )}
          {handleDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(item.id);
              }}
              disabled={deletingItemId != null}
              className="p-2 rounded-full hover:bg-red-100 text-red-500 transition-colors"
              aria-label="Delete"
            >
              <Trash className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className={`relative h-full ${className}`}>
      <div
        ref={listRef}
        className={`h-full overflow-y-auto ${
          !displayScrollbar ? "scrollbar-hide" : ""
        }`}
        onScroll={handleScroll}
        style={{
          scrollbarWidth: displayScrollbar ? "auto" : "none",
          msOverflowStyle: displayScrollbar ? "auto" : "none",
        }}
      >
        {items.map((item, index) => (
          <AnimatedItem
            key={item.id}
            delay={0.1}
            index={index}
            onMouseEnter={() => setSelectedIndex(index)}
            onClick={() => {
              setSelectedIndex(index);
              if (onItemSelect) {
                onItemSelect(item, index);
              }
            }}
          >
            {renderItem
              ? renderItem(item, selectedIndex === index)
              : defaultRenderItem(item, selectedIndex === index)}
          </AnimatedItem>
        ))}
      </div>
      {showGradients && (
        <>
          <div
            className="absolute top-0 left-0 right-0 h-12 pointer-events-none bg-gradient-to-b from-[#eeede4] to-transparent"
            style={{ opacity: topGradientOpacity }}
          ></div>
          <div
            className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none bg-gradient-to-t from-[#eeede4] to-transparent"
            style={{ opacity: bottomGradientOpacity }}
          ></div>
        </>
      )}
    </div>
  );
};
