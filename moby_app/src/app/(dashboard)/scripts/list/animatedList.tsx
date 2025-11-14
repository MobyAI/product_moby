import React, {
  useRef,
  useState,
  useEffect,
  ReactNode,
  MouseEventHandler,
  UIEvent,
} from "react";
import { useRouter } from "next/navigation";
import { motion, useInView, AnimatePresence } from "motion/react";
import {
  Trash,
  PinOff,
  Pin,
  Pencil,
  MoreVertical,
  X,
  Play,
  Calendar,
  Clock,
} from "lucide-react";

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
}

const ScriptListItem = ({
  item,
  isMenuOpen,
  setOpenMenuId,
  router,
  savingItemId,
  deletingItemId,
  togglePinned,
  handleEdit,
  handleDelete,
  isSmallScreen,
  itemClassName,
  formatDate,
}: {
  item: ScriptItem;
  isMenuOpen: boolean;
  setOpenMenuId: (id: string | null) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  router: any;
  savingItemId: string | null;
  deletingItemId: string | null;
  togglePinned?: (id: string) => void;
  handleEdit?: (item: ScriptItem) => void;
  handleDelete?: (id: string) => void;
  isSmallScreen: boolean;
  itemClassName: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formatDate: (date: any) => string;
}) => {
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [openUpwards, setOpenUpwards] = useState(false);

  // Check position when menu opens
  useEffect(() => {
    if (isMenuOpen && menuButtonRef.current) {
      const rect = menuButtonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const menuHeight = 150; // Approximate height

      setOpenUpwards(spaceBelow < menuHeight);
    }
  }, [isMenuOpen]);

  return (
    <div
      className={`p-4 transition-all border-b border-gray-100/30 hover:cursor-default ${itemClassName} relative`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-semibold text-primary-light-alt mb-1 truncate">
            {item.name}
          </h3>
          <div className="flex items-center gap-2 text-sm">
            <span
              className="flex-shrink-0 text-primary-dark-alt"
              title="Upload date"
            >
              <Calendar className="w-4 h-4" />
            </span>
            <span className="font-medium text-primary-light-alt">
              {formatDate(item.createdAt)}
            </span>
            <span className="text-primary-light-alt mx-2">|</span>
            <span
              className="flex-shrink-0 text-primary-dark-alt"
              title="Last practiced"
            >
              <Clock className="w-4 h-4" />
            </span>
            <span className="font-medium text-primary-light-alt">
              {item.lastPracticed
                ? formatDate(item.lastPracticed)
                : "Not practiced yet"}
            </span>
          </div>
        </div>

        <div className="flex items-center ml-4 relative">
          {isSmallScreen ? (
            // DROPDOWN MENU for small screens
            <>
              <button
                ref={menuButtonRef}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuId(isMenuOpen ? null : item.id);
                }}
                className="p-3 rounded-full bg-primary-dark hover:scale-105 text-primary-light-alt transition-colors hover:cursor-pointer"
                aria-label="Open menu"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              <AnimatePresence>
                {isMenuOpen && (
                  <motion.div
                    initial={{
                      opacity: 0,
                      scale: 0.95,
                      y: openUpwards ? 10 : -10,
                    }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{
                      opacity: 0,
                      scale: 0.95,
                      y: openUpwards ? 10 : -10,
                    }}
                    transition={{ duration: 0.15 }}
                    className={`absolute right-0 ${
                      openUpwards ? "bottom-full mb-2" : "top-full mt-2"
                    } bg-primary-light-alt rounded-lg shadow-xl border border-gray-200 p-2 z-50 min-w-[200px]`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/practice-room?scriptID=${item.id}`);
                        setOpenMenuId(null);
                      }}
                      disabled={savingItemId != null || deletingItemId != null}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-md hover:bg-gray-100 transition-colors text-left"
                    >
                      <Play className="w-5 h-5 text-primary-dark" />
                      <span className="text-primary-dark font-medium">
                        Practice
                      </span>
                    </button>

                    {togglePinned && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePinned(item.id);
                          setOpenMenuId(null);
                        }}
                        disabled={savingItemId != null}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-md hover:bg-gray-100 transition-colors text-left"
                      >
                        {item.pinned ? (
                          <>
                            <PinOff className="w-5 h-5 text-primary-dark" />
                            <span className="text-primary-dark font-medium">
                              Unpin
                            </span>
                          </>
                        ) : (
                          <>
                            <Pin className="w-5 h-5 text-primary-dark" />
                            <span className="text-primary-dark font-medium">
                              Pin
                            </span>
                          </>
                        )}
                      </button>
                    )}

                    {handleEdit && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(item);
                          setOpenMenuId(null);
                        }}
                        disabled={deletingItemId != null}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-md hover:bg-gray-100 transition-colors text-left"
                      >
                        <Pencil className="w-5 h-5 text-primary-dark" />
                        <span className="text-primary-dark font-medium">
                          Edit
                        </span>
                      </button>
                    )}

                    {handleDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item.id);
                          setOpenMenuId(null);
                        }}
                        disabled={deletingItemId != null}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-md hover:bg-red-50 transition-colors text-left"
                      >
                        <Trash className="w-5 h-5 text-red-500" />
                        <span className="text-red-500 font-medium">Delete</span>
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            // HORIZONTAL SLIDING MENU for larger screens
            <AnimatePresence mode="wait">
              {isMenuOpen ? (
                <motion.div
                  key="menu-open"
                  className="flex gap-2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.15 }}
                >
                  <motion.button
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/practice-room?scriptID=${item.id}`);
                    }}
                    disabled={savingItemId != null || deletingItemId != null}
                    className="p-3 rounded-full bg-black/10 hover:bg-black/30 transition-colors hover:cursor-pointer"
                    aria-label="Play"
                  >
                    <Play className="w-5 h-5 text-primary-light-alt" />
                  </motion.button>
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
                      className="p-3 rounded-full bg-black/10 hover:bg-black/30 transition-colors hover:cursor-pointer"
                      aria-label={item.pinned ? "Unpin" : "Pin"}
                    >
                      {item.pinned ? (
                        <PinOff
                          className={`w-5 h-5 text-primary-light-alt ${
                            savingItemId === item.id
                              ? "animate-[bounce_0.5s_ease-in-out_infinite,spin_1s_linear_infinite]"
                              : ""
                          }`}
                        />
                      ) : (
                        <Pin
                          className={`w-5 h-5 text-primary-light-alt-alt ${
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
                      className="p-3 rounded-full bg-black/10 hover:bg-black/30 text-primary-light-alt transition-colors hover:cursor-pointer"
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
                      className="p-3 rounded-full bg-black/10 hover:bg-black/30 text-red-500 transition-colors hover:cursor-pointer"
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
                    className="p-3 rounded-full bg-primary-dark text-primary-light-alt transition-colors hover:cursor-pointer"
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
                  className="p-3 rounded-full bg-primary-dark hover:scale-105 text-primary-light-alt transition-colors hover:cursor-pointer"
                  aria-label="Open menu"
                >
                  <MoreVertical className="w-5 h-5" />
                </motion.button>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
};

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
}) => {
  const listRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] =
    useState<number>(initialSelectedIndex);
  const [keyboardNav, setKeyboardNav] = useState<boolean>(false);
  const [topGradientOpacity, setTopGradientOpacity] = useState<number>(0);
  const [bottomGradientOpacity, setBottomGradientOpacity] = useState<number>(1);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isSmallScreen, setIsSmallScreen] = useState<boolean>(false);
  const router = useRouter();

  // Check screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 768); // md breakpoint
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);

    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    if (!openMenuId || !isSmallScreen) return;

    const handleClickOutside = () => setOpenMenuId(null);
    document.addEventListener("click", handleClickOutside);

    return () => document.removeEventListener("click", handleClickOutside);
  }, [openMenuId, isSmallScreen]);

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
            <ScriptListItem
              item={item}
              isMenuOpen={openMenuId === item.id}
              setOpenMenuId={setOpenMenuId}
              router={router}
              savingItemId={savingItemId ?? null}
              deletingItemId={deletingItemId ?? null}
              togglePinned={togglePinned}
              handleEdit={handleEdit}
              handleDelete={handleDelete}
              isSmallScreen={isSmallScreen}
              itemClassName={itemClassName}
              formatDate={formatDate}
            />
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
