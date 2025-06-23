# **App Name**: AquaVision

## Core Features:

- Page Navigation: Navigation between 'New Verification' and 'History & Search' pages using a state-based routing system.
- New Verification Wizard: Multi-step wizard for submitting new verification requests with a step indicator.
- Image Browser: Reusable image browser component for selecting overview and label images.
- Verification Result Display: Display verification results (match, mismatch, uncertain) and AI explanation in a review summary.
- History & Search Dashboard: Dashboard for browsing past verifications with sortable columns and colored status badges.
- Filter Sidebar: Collapsible sidebar with search and filter options for the verification history.
- AI Analysis Details: Display AI analysis details, confidence score, reference images, and explanations to help a human verifier with understanding a recommendation from an AI tool.

## Style Guidelines:

- Primary background: Dark gray (#111111) for a sophisticated, data-rich look.
- Secondary background: Lighter dark gray (#1E1E1E) for cards and modals to provide contrast.
- Accent gradient: Linear gradient from blue (#3B82F6) to purple (#8B5CF6) to magenta (#EC4899) for titles and action buttons.
- Status colors: Green (#22C55E) for correct, red (#EF4444) for incorrect, yellow (#FBBF24) for uncertain statuses.
- Body text font: Default sans-serif for readability and a clean aesthetic.
- Transaction ID font: 'Source Code Pro' monospace font for clear identification.
- lucide-react icons for a consistent and recognizable visual language.
- Responsive layout adapts to both desktop and mobile screens for accessibility and usability.
- Subtle animations for loading states and transitions between wizard steps.