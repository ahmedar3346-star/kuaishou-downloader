# Kuaishou Video Downloader - Design Guidelines

## Design Approach
**Utility-focused, minimalist design system** - This is a single-purpose tool prioritizing efficiency and clarity. Reference: Modern utility apps like Notion's clean interfaces and Linear's focused layouts.

## Core Design Principles

### 1. Minimalist White UI
- Clean white background (#FFFFFF)
- Minimal visual noise
- Focus on functionality over decoration
- Single-column, centered layout
- Maximum content width: `max-w-2xl` (672px)

### 2. Typography
- **Primary Font**: Inter or similar modern sans-serif via Google Fonts
- **Hierarchy**:
  - Page title: `text-2xl md:text-3xl font-semibold`
  - Section headers: `text-lg font-medium`
  - Body text: `text-base`
  - Helper text: `text-sm text-gray-600`

### 3. Layout & Spacing
- **Container**: Centered with `mx-auto px-4 py-8 md:py-12`
- **Spacing units**: Tailwind's 4, 6, 8, 12 (e.g., `gap-6`, `mb-8`, `p-4`)
- **Mobile-first breakpoints**: Base → md → lg
- **No fixed heights** - all containers use natural content flow
- **No fixed widths** - responsive scaling only

### 4. Component Structure

**Input Section**:
- Large text input with placeholder "Paste Kuaishou video URL here..."
- Input height: `h-12` with rounded corners `rounded-lg`
- Border: `border-2` with focus states
- Primary action button: Full-width on mobile, auto-width on desktop
- Spacing: `space-y-4` between input and button

**Loading State**:
- Clean spinner/skeleton loader
- Centered with subtle animation
- Text: "Fetching video information..."

**Video Preview Card**:
- Thumbnail image with 16:9 aspect ratio
- White card with subtle shadow: `bg-white shadow-md rounded-lg`
- Metadata below thumbnail: title, author
- Padding: `p-6`
- Spacing between elements: `space-y-4`

**Download Buttons**:
- Two buttons side-by-side on desktop, stacked on mobile
- Grid: `grid grid-cols-1 md:grid-cols-2 gap-4`
- Clear labels: "Download Video (MP4)" and "Download Audio Only (M4A)"
- Button height: `h-12`

**Disclaimer** (if included):
- Small text at bottom: `text-xs text-gray-500`
- Centered alignment
- Margin top: `mt-12`

### 5. User Flow States

1. **Empty State**: Input field + "Get Video" button
2. **Loading State**: Spinner with feedback text
3. **Success State**: Preview card + download buttons
4. **Error State**: Red-tinted message with retry option

### 6. WordPress Embed Optimization
- Vertical layout that scales naturally
- Minimum comfortable height: ~600-900px (natural content height)
- No horizontal scrollbars
- Touch-friendly button sizes (minimum 44px height)

### 7. Accessibility
- High contrast text (gray-900 on white)
- Focus indicators on all interactive elements
- Semantic HTML structure
- ARIA labels for icon buttons
- Keyboard navigation support

### 8. Interactions
- Minimal animations - only loading spinners
- Instant feedback on button clicks
- No hover effects on download buttons
- Standard button active/pressed states

## Constraints
- **NO**: Embed code displays, iframe snippets, copy buttons in UI
- **NO**: Analytics tracking, ads, watermark claims
- **NO**: Fixed viewport heights (100vh sections)
- **YES**: Clean, functional, responsive design that works in iframe

## Images
No hero images required. This is a utility tool - lead directly with the URL input field and primary action.