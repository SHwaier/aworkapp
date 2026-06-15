## Objective
Stabilize and refine the Resume Analyzer component by resolving state race conditions, improving visual hierarchy, enhancing the overall UX, and hardening the AI API pipeline.

## Technical Bug Fixes & Stability
*   **Minification-Safe State Detection**: Replaced fragile `constructor.name` checks with a concrete `isAi` boolean property on all `ChecklistAnalyzer` implementations. This prevents production race conditions where AI analysis was incorrectly identified as static analysis during build minification, causing state resets.
*   **Race Conditions**: Fixed UI state synchronization issues by ensuring phased analysis correctly merges data rather than replacing state fragments.
*   **AI Resilience**: Hardened the Gemini AI pipeline in `AIAnalyzer` to gracefully handle and strip Markdown JSON code-fences (e.g. ````json````) returned by the model, preventing catastrophic `JSON.parse` failures.
*   **Cache Bypassing for Failures**: Updated `route.ts` so that if the database contains a cached "AI Analysis Failed" fallback item, it bypasses the early-return cache mechanism, allowing the user to seamlessly retry the analysis.

## Feature Enhancements & Design Polish
*   **Collapsible Categories**: Implemented an accordion grouping system for checklist items featuring smooth `grid-template-rows` transitions for collapse/expand animations.
*   **Smart Sorting**: Implemented custom sorting for the category dropdowns; groups with outstanding issues are now floated to the top, sorted by the count of pending tasks.
*   **Consolidated Navigation**: Removed the redundant category tab bar entirely, promoting the new elevated dropdown cards as the sole navigation source to reduce visual clutter.
*   **Elevated Visuals**: Added `focus-visible` rings for accessibility, enhanced the completed-item styling (`opacity-50`, subdued borders), and clamped the parent sidebar to `max-w-sm` to prevent excessive stretching on ultra-wide viewports.
*   **Color-Coded Status Badges**: Added distinct background/border colours to the "To Do", "In Progress", "Review", and "Done" badges for instant status recognition.
*   **UI Cleanup**: Removed redundant "Keyword Summary" duplicate task, added a descriptive "Analyze" text label to the refresh button, and anchored the stats header so badges are always visible (fading to 50% opacity when empty).
