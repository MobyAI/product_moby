import React, {
  useRef,
  useState,
  useEffect,
  ReactNode,
  MouseEventHandler,
  UIEvent,
} from "react";
import { motion, useInView, AnimatePresence } from "motion/react";
import { Trash, PinOff, Pin, Pencil, MoreVertical, X } from "lucide-react";

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  script: any[];
  ownerUid: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createdAt: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updatedAt: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lastPracticed: any;
  pinned?: boolean;
}

interface AnimatedListProps {
  items?: ScriptItem[];
  onItemSelect?: (item: ScriptItem, index: number) => void;
  handleDelete?: (id: string) => void;
  togglePinned?: (id: string) => void;
  handleEdit?: (item: ScriptItem) => void;
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
  togglePinned,
  handleEdit,
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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Never";
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  const defaultRenderItem = (item: ScriptItem) => {
    const isMenuOpen = openMenuId === item.id;

    return (
      <div
        className={`p-4 rounded-lg transition-all bg-primary-light-alt hover:cursor-default ${itemClassName}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-primary-dark-alt mb-1">
              {item.name}
            </h3>
            <p className="text-gray-400 text-sm">
              <span className="font-semibold text-primary-dark-alt">
                Uploaded:
              </span>{" "}
              {formatDate(item.createdAt)}
            </p>
          </div>
          <div className="flex items-center ml-4">
            <AnimatePresence mode="wait">
              {isMenuOpen ? (
                <motion.div
                  key="menu-open"
                  className="flex gap-1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.15 }}
                >
                  {togglePinned && (
                    <motion.button
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.02 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePinned(item.id);
                      }}
                      disabled={savingItemId != null}
                      className="p-3 rounded-full hover:bg-black/5 transition-colors hover:cursor-pointer"
                      aria-label={item.pinned ? "Unpin" : "Pin"}
                    >
                      {item.pinned ? (
                        <PinOff
                          className={`w-5 h-5 text-primary-dark-alt ${
                            savingItemId === item.id
                              ? "animate-[bounce_0.5s_ease-in-out_infinite,spin_1s_linear_infinite]"
                              : ""
                          }`}
                        />
                      ) : (
                        <Pin
                          className={`w-5 h-5 text-primary-dark-alt ${
                            savingItemId === item.id
                              ? "animate-[bounce_0.5s_ease-in-out_infinite,spin_1s_linear_infinite]"
                              : ""
                          }`}
                        />
                      )}
                    </motion.button>
                  )}
                  {handleEdit && (
                    <motion.button
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.04 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(item);
                      }}
                      disabled={deletingItemId != null}
                      className="p-3 rounded-full hover:bg-black/5 text-primary-dark-alt transition-colors hover:cursor-pointer"
                      aria-label="Edit"
                    >
                      <Pencil className="w-5 h-5" />
                    </motion.button>
                  )}
                  {handleDelete && (
                    <motion.button
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.06 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item.id);
                      }}
                      disabled={deletingItemId != null}
                      className="p-3 rounded-full hover:bg-red-100 text-red-500 transition-colors hover:cursor-pointer"
                      aria-label="Delete"
                    >
                      <Trash className="w-5 h-5" />
                    </motion.button>
                  )}
                  <motion.button
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.08 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(null);
                    }}
                    className="p-3 rounded-full hover:bg-black/5 text-primary-dark-alt transition-colors hover:cursor-pointer"
                    aria-label="Close menu"
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </motion.div>
              ) : (
                <motion.button
                  key="menu-closed"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuId(item.id);
                  }}
                  className="p-3 rounded-full hover:bg-black/5 text-primary-dark-alt transition-colors hover:cursor-pointer"
                  aria-label="Open menu"
                >
                  <MoreVertical className="w-5 h-5" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    );
  };

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
          <AnimatedItem key={item.id} delay={0.1} index={index}>
            {renderItem
              ? renderItem(item, selectedIndex === index)
              : defaultRenderItem(item)}
          </AnimatedItem>
        ))}
      </div>
      {showGradients && (
        <>
          <div
            className="absolute top-0 left-0 right-0 h-12 pointer-events-none bg-gradient-to-b from-white/50 to-transparent"
            style={{ opacity: topGradientOpacity }}
          ></div>
          <div
            className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none bg-gradient-to-t from-white/50 to-transparent"
            style={{ opacity: bottomGradientOpacity }}
          ></div>
        </>
      )}
    </div>
  );
};
