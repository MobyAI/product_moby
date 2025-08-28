export type UserProfile = {
    firstName: string;
    lastName: string;
    age: number;
    ethnicity: string[];
    height: number; // inches
};

export const ethnicities = [
    { value: "asian", label: "Asian", emoji: "🌐" },
    { value: "black", label: "Black/African", emoji: "🌐" },
    { value: "hispanic", label: "Hispanic/Latino", emoji: "🌐" },
    { value: "middle-eastern", label: "Middle Eastern", emoji: "🌐" },
    { value: "native", label: "Native/Indigenous", emoji: "🌐" },
    { value: "pacific", label: "Pacific Islander", emoji: "🌐" },
    { value: "white", label: "White/Caucasian", emoji: "🌐" },
    { value: "other", label: "Other", emoji: "✨" },
    { value: "prefer-not", label: "Prefer not to say", emoji: "🤐" },
];