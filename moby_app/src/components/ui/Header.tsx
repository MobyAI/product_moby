import { useState, useMemo, useEffect, useRef } from "react";
import { Search, X, HelpCircle, LogOut } from "lucide-react";

interface HeaderProps<T> {
  data: T[];
  searchKeys: (keyof T)[];
  onFilteredResults: (filtered: T[]) => void;
  onLogout?: () => void;
  placeholder?: string;
  marginLeft?: string;
}

export function Header<T>({
  data,
  searchKeys,
  onFilteredResults,
  onLogout,
  placeholder = "Search",
  marginLeft = "ml-0",
}: HeaderProps<T>) {
  const [query, setQuery] = useState("");
  const prevJsonRef = useRef<string>("");

  // 🔍 Filter data locally by selected keys
  const filteredData = useMemo(() => {
    if (!query.trim()) return data;
    const lower = query.toLowerCase();

    return data.filter((item) =>
      searchKeys.some((key) => {
        const value = item[key];
        if (!value) return false;
        return String(value).toLowerCase().includes(lower);
      })
    );
  }, [query, data, searchKeys]);

  // 📤 Send filtered results to parent
  useEffect(() => {
    const json = JSON.stringify(filteredData);
    if (prevJsonRef.current !== json) {
      onFilteredResults(filteredData);
      prevJsonRef.current = json;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredData]);

  return (
    <header className="w-full flex items-center justify-between px-6 pb-10 backdrop-blur-md bg-transparent">
      {/* Search Bar */}
      <div className={`flex items-center w-1/2 max-w-lg relative ${marginLeft}`}>
        <Search className="absolute top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-15 pr-8 py-2 border-b border-gray-300 bg-transparent focus:outline-none focus:border-gray-500 text-gray-700 placeholder-gray-400"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 
                   text-gray-500 hover:text-gray-800 focus:outline-none"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Right-side icons */}
      <div className="flex items-center gap-3">
        <button className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-sm hover:shadow-md transition-all">
          <HelpCircle className="w-5 h-5 text-black" />
        </button>
        <button
          onClick={onLogout}
          className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-sm hover:shadow-md transition-all"
        >
          <LogOut className="w-5 h-5 text-black" />
        </button>
      </div>
    </header>
  );
}
