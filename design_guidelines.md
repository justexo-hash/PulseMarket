# Polymeme Design Guidelines

## Design Approach

**Selected Approach:** Reference-Based (Fintech/Trading Platforms)  
**Primary References:** Polymarket, Robinhood, Coinbase, Kalshi  
**Rationale:** Prediction markets require trust, data clarity, and professional aesthetics while maintaining modern appeal

**Key Design Principles:**
- Data-first clarity: Information hierarchy optimizes for quick scanning and decision-making
- Trust through polish: Clean interfaces with precise spacing convey professionalism
- Subtle depth: Dark theme with layered surfaces creates visual interest without distraction
- Purposeful color: Accent colors highlight actionable elements and probability states

---

## Core Design Elements

### A. Typography

**Font Family:** Inter (Google Fonts)  
**Implementation:**
- Headlines (Market Questions): font-semibold, text-xl to text-2xl
- Section Headers: font-semibold, text-lg, uppercase tracking-wide
- Body Text (Categories, Labels): font-normal, text-sm to text-base
- Probability Numbers: font-bold, text-3xl to text-4xl for impact
- Metadata (IDs, timestamps): font-normal, text-xs, reduced opacity (60%)

**Hierarchy Strategy:**  
Large, bold probability percentages draw immediate attention. Market questions use medium weight for readability. Supporting information (category tags, metadata) uses smaller sizes with muted treatment.

---

### B. Layout System

**Tailwind Spacing Primitives:** Units of 2, 4, 6, 8, 12, 16, 20  
**Application:**
- Tight spacing: gap-2, p-2 (chip elements, badges)
- Standard spacing: gap-4, p-4, m-4 (card internals, button padding)
- Section spacing: gap-6, p-6 (between card elements)
- Component spacing: gap-8, p-8, m-8 (between major sections)
- Page margins: px-4 mobile, px-8 tablet, px-12 to px-20 desktop
- Vertical rhythm: py-12 to py-20 for page sections

**Container Strategy:**
- Max-width: max-w-7xl for main content areas
- Market grid: Responsive grid with gap-6
- Desktop: 3 columns (grid-cols-3)
- Tablet: 2 columns (md:grid-cols-2)
- Mobile: 1 column (grid-cols-1)

---

### C. Component Library

**Navigation Header:**
- Sticky positioning (sticky top-0 z-50)
- Height: h-16 to h-20
- Logo/brand left-aligned, font-bold text-2xl
- Navigation links right-aligned with gap-8
- Subtle bottom border for depth separation
- Background: Slightly lighter than body (#25263B per spec)

**Market Cards:**
- Rounded corners: rounded-lg (8px per spec)
- Padding: p-6
- Layered surface treatment (lighter than background)
- Hover state: Subtle lift effect (transform scale) with smooth transition
- Shadow: Soft shadow for depth (shadow-lg)
- Internal layout: Vertical stack with gap-4
  - Category badge at top (pill-shaped, small text, accent background at 20% opacity)
  - Market question (text-xl, font-semibold, 2-3 line clamp)
  - Probability meter: Large percentage (text-4xl, font-bold) with visual bar indicator
  - Bottom metadata row (flex-between, text-xs, muted)

**Market Detail View:**
- Hero area: Market question as large heading (text-3xl to text-4xl, font-bold)
- Two-column split on desktop (60/40 split):
  - Left: Detailed information, description, metadata
  - Right: Trading interface with prominent "Bet Yes/No" buttons
- Probability visualization: Large circular or bar chart showing current market state
- Button styling: Full-width on mobile, side-by-side on desktop with gap-4

**Create Market Form:**
- Centered container: max-w-2xl
- Generous spacing: gap-6 between form fields
- Input fields:
  - Full-width with p-4
  - Border radius: rounded-lg
  - Background: Lighter surface treatment
  - Focus state: Accent color border glow
  - Labels: text-sm, font-medium, mb-2
- Submit button: Large, prominent, full-width on mobile

**Buttons:**
- Primary: Accent color background (#4A4AFF), white text, font-semibold
- Padding: px-6 py-3 for standard, px-8 py-4 for large
- Rounded: rounded-lg
- Hover: Slightly lighter shade with smooth transition
- Yes/No buttons: Consider green tint for Yes, red tint for No (at 20% opacity with accent color)

**Category Badges:**
- Pill shape: rounded-full
- Small padding: px-3 py-1
- Text: text-xs, font-medium, uppercase, tracking-wide
- Background: Category-specific accent tints or generic accent at low opacity

---

### D. Visual Elements & Interactions

**Probability Visualizations:**
- Percentage number: Dominant display (text-4xl, font-bold, accent color)
- Progress bar: Horizontal bar beneath percentage
  - Track: Full width, h-2, rounded-full, muted background
  - Fill: Width based on probability, accent color, rounded-full, smooth transition
- Alternative: Circular progress ring for detail pages

**State Indicators:**
- Active markets: Subtle pulsing dot indicator (green accent)
- Trending: Small flame or arrow icon next to percentage
- New markets: "NEW" badge with accent background

**Animations (Minimal):**
- Card hover: transform scale(1.02) with 200ms ease transition
- Button hover: Slight brightness increase, 150ms transition
- Page transitions: None (instant for data app responsiveness)
- Loading states: Simple pulse animation on skeleton placeholders

---

## Images

**Hero Section:** Not applicable - this is a functional app, not a marketing page

**Market Detail Pages:**  
Consider adding placeholder chart/graph visualizations showing market history (probability over time). These would be SVG-based line charts with accent color strokes.

**Empty States:**  
- No markets created yet: Illustration showing graph/chart iconography
- Market detail loading: Skeleton screens with gradient shimmer

**Icon Usage:**  
Font Awesome or Heroicons via CDN for:
- Category icons (crypto: bitcoin symbol, entertainment: film reel, tech: cpu chip)
- Navigation icons (home, plus sign for create)
- Status indicators (trending arrow, new badge)
- Utility icons (external link for detail pages)

---

## Page-Specific Guidelines

**Homepage (Market List):**
- Full-width grid of market cards
- Sticky header at top
- Optional: Top filter bar with category chips (All, Crypto, Entertainment, Technology)
- Cards arranged in responsive grid with consistent gap-6
- Minimum 3 cards visible on desktop before scroll

**Market Detail Page:**
- Back button in top-left (text-sm with left arrow icon)
- Large market question as page header
- Two-panel layout (info + trading interface)
- Related markets section at bottom (3 card horizontal scroll on mobile, grid on desktop)

**Create Market Page:**
- Centered form with max-w-2xl
- Page title: "Create New Market" (text-3xl, font-bold, mb-8)
- Clear field labels and helpful placeholder text
- Success feedback: Simple alert or modal confirmation before redirect

---

**Overall Aesthetic:** Professional fintech interface with personality through thoughtful color accents, data-forward design that builds trust, and polished interactions that feel responsive and premium.