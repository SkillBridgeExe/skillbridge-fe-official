import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, ListFilter, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const SUGGESTED_KEYWORDS = [
  "Frontend", "Backend", "React", "Node.js", "System Design", "AWS",
  "Leadership", "Career Growth", "Interview Prep", "Data Science", "Python", "UI/UX", "Product Management"
];

const megaMenuCategories = [
  { name: "Software Engineering", skills: ["Frontend Developer", "Backend Developer", "Fullstack Developer", "Mobile Developer", "DevOps Engineer"] },
  { name: "Data Science & AI", skills: ["AI Engineer", "Data Scientist", "Data Analyst", "Machine Learning", "Data Engineer"] },
  { name: "Design & UX", skills: ["UX Researcher", "UI/UX Designer", "Product Designer", "Graphic Designer"] },
  { name: "Product & Business", skills: ["Product Manager", "Business Analyst", "Scrum Master", "Project Manager"] }
];

interface MentorSearchBarProps {
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  activeCategory: string;
  setActiveCategory: (v: string) => void;
  showSuggestedKeywords?: boolean;
  className?: string;
}

export function MentorSearchBar({
  searchTerm,
  setSearchTerm,
  activeCategory,
  setActiveCategory,
  showSuggestedKeywords = true,
  className,
}: MentorSearchBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScrollSuggestions = (direction: "left" | "right") => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: direction === "left" ? -300 : 300, behavior: "smooth" });
    }
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Search Bar */}
      <div className="bg-white p-2 rounded-[36px] shadow-xl border border-slate-200 flex flex-col md:flex-row items-center gap-2 relative z-10 w-full mb-6 max-w-5xl mx-auto focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10 transition-all">
        <div className="w-full flex-1 flex items-center pl-2 md:pl-4 min-h-[56px]">
          <div className="hidden md:flex items-center mr-4 pr-4 border-r border-slate-200 h-8">
            <ListFilter className="w-5 h-5 text-slate-400 mr-2" />
            <Popover>
              <PopoverTrigger className="flex items-center justify-between w-[160px] text-[15px] font-bold text-slate-700 hover:text-primary transition-colors outline-none cursor-pointer">
                <span className="truncate">{activeCategory}</span>
              </PopoverTrigger>
              <PopoverContent className="w-[800px] p-6 rounded-2xl shadow-2xl border-slate-100" align="start">
                <div className="mb-4 pb-4 border-b border-slate-100 flex justify-between items-center">
                  <h4 className="font-bold text-slate-900 text-lg">Select Category or Specialty</h4>
                  <Button variant="ghost" size="sm" onClick={() => setActiveCategory("All Categories")} className="text-primary font-bold">Clear All</Button>
                </div>
                <div className="grid grid-cols-2 gap-8">
                  {megaMenuCategories.map(cat => (
                    <div key={cat.name} className="space-y-3">
                      <div
                        className="font-bold text-slate-900 text-[15px] flex items-center gap-2 cursor-pointer hover:text-primary transition-colors"
                        onClick={() => setActiveCategory(cat.name)}
                      >
                        <div className={cn("w-4 h-4 rounded-[4px] border flex items-center justify-center", activeCategory === cat.name ? "bg-primary border-primary" : "border-slate-300")}>
                          {activeCategory === cat.name && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                        {cat.name}
                      </div>
                      <div className="flex flex-wrap gap-2 pl-6">
                        {cat.skills.map(skill => (
                          <Badge
                            key={skill}
                            variant="secondary"
                            className="cursor-pointer bg-slate-100 hover:bg-primary/10 text-slate-600 hover:text-primary transition-colors"
                            onClick={() => { setActiveCategory(cat.name); setSearchTerm(skill); }}
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <Search className="w-5 h-5 text-slate-400 ml-1 md:ml-3 mr-2" />
          <Input
            className="flex-1 border-none bg-transparent shadow-none focus-visible:ring-0 px-0 pl-3 text-slate-700 placeholder:text-slate-400 font-medium h-full w-full text-[15px]"
            placeholder="Search for title, Mentor, Skills..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-white rounded-[28px] px-8 h-[50px] font-bold text-[16px] shadow-sm transition-all whitespace-nowrap w-full md:w-auto">
          Search
        </Button>
      </div>

      {/* Suggested Keywords */}
      {showSuggestedKeywords && (
        <div className="flex items-center gap-3 mb-10 max-w-5xl mx-auto w-full">
          <span className="text-sm font-medium text-slate-500 whitespace-nowrap flex-shrink-0">Suggested Keywords:</span>
          <div className="relative overflow-hidden flex-grow group flex items-center">
            <button onClick={() => handleScrollSuggestions("left")} className="absolute left-0 z-10 bg-gradient-to-r from-slate-50 via-slate-50 to-transparent pr-6 py-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div ref={scrollRef} className="flex gap-2.5 overflow-x-auto no-scrollbar scroll-smooth w-full px-1 py-1">
              {SUGGESTED_KEYWORDS.map(keyword => (
                <button
                  key={keyword}
                  onClick={() => setSearchTerm(keyword)}
                  className={cn(
                    "whitespace-nowrap px-4 py-1.5 rounded-full text-[13px] font-semibold transition-colors border",
                    searchTerm === keyword
                      ? "bg-primary/10 text-primary border-primary/20"
                      : "bg-slate-100 hover:bg-primary/10 hover:text-primary text-slate-600 border-slate-200 hover:border-primary/20"
                  )}
                >
                  {keyword}
                </button>
              ))}
            </div>
            <button onClick={() => handleScrollSuggestions("right")} className="absolute right-0 z-10 bg-gradient-to-l from-slate-50 via-slate-50 to-transparent pl-6 py-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
