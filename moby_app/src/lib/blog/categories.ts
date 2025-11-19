export const BLOG_CATEGORIES = [
  {
    id: "acting-techniques",
    label: "Acting Techniques",
    description: "Methods and skills for improving your craft",
  },
  {
    id: "audition-tips",
    label: "Audition Tips",
    description: "Preparation and strategies for successful auditions",
  },
  {
    id: "script-work",
    label: "Script Work",
    description: "Analysis, memorization, and rehearsal techniques",
  },
  {
    id: "career-advice",
    label: "Career Advice",
    description: "Building and advancing your acting career",
  },
  {
    id: "industry-insights",
    label: "Industry Insights",
    description: "Behind-the-scenes knowledge and trends",
  },
  {
    id: "technology",
    label: "Technology for Actors",
    description: "AI tools and tech for modern performers",
  },
  {
    id: "health-&-wellness",
    label: "Health & Wellness",
    description: "Taking care of your health and wellbeing",
  },
] as const;

// Type-safe category IDs
export type BlogCategoryId = (typeof BLOG_CATEGORIES)[number]["id"];

// Helper function to get category by ID
export function getCategoryById(id: string) {
  return BLOG_CATEGORIES.find((cat) => cat.id === id);
}

// Helper function to get all category IDs
export function getAllCategoryIds(): string[] {
  return BLOG_CATEGORIES.map((cat) => cat.id);
}

// Validate if a category ID is valid
export function isValidCategory(id: string): boolean {
  return BLOG_CATEGORIES.some((cat) => cat.id === id);
}
