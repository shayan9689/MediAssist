---
name: Clinical Precision
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#3f4850'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#707881'
  outline-variant: '#bfc7d2'
  surface-tint: '#006398'
  primary: '#006194'
  on-primary: '#ffffff'
  primary-container: '#007bb9'
  on-primary-container: '#fdfcff'
  inverse-primary: '#93ccff'
  secondary: '#006a61'
  on-secondary: '#ffffff'
  secondary-container: '#86f2e4'
  on-secondary-container: '#006f66'
  tertiary: '#8d4b00'
  on-tertiary: '#ffffff'
  tertiary-container: '#b15f00'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cce5ff'
  primary-fixed-dim: '#93ccff'
  on-primary-fixed: '#001d31'
  on-primary-fixed-variant: '#004b73'
  secondary-fixed: '#89f5e7'
  secondary-fixed-dim: '#6bd8cb'
  on-secondary-fixed: '#00201d'
  on-secondary-fixed-variant: '#005049'
  tertiary-fixed: '#ffdcc3'
  tertiary-fixed-dim: '#ffb77d'
  on-tertiary-fixed: '#2f1500'
  on-tertiary-fixed-variant: '#6e3900'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  h1:
    fontFamily: Manrope
    fontSize: 36px
    fontWeight: '700'
    lineHeight: '1.2'
  h2:
    fontFamily: Manrope
    fontSize: 28px
    fontWeight: '600'
    lineHeight: '1.3'
  h3:
    fontFamily: Manrope
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
  medical-term:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: '1.5'
  body-main:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  vitals:
    fontFamily: Space Grotesk
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.02em
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 0.25rem
  sm: 0.5rem
  md: 1rem
  lg: 1.5rem
  xl: 2rem
  gutter: 1.5rem
  margin-mobile: 1rem
  margin-desktop: 2.5rem
---

## Brand & Style

This design system is built on a **Corporate / Modern** foundation, tailored specifically for the high-stakes environment of healthcare education. The aesthetic balances the rigorous precision of clinical practice with the approachability of a modern learning tool.

The brand personality is **authoritative yet supportive**. It prioritizes clarity and cognitive ease to help nurses process complex medical data without fatigue. The UI utilizes a structured, modular approach that feels organized and reliable, evoking the same sense of trust one finds in a well-maintained clinical environment. Large amounts of whitespace and a refined color palette ensure that the "AI" aspect of the platform feels like a helpful assistant rather than an overwhelming presence.

## Colors

The palette is anchored by **Medical Blue** and **Deep Navy** to establish a professional, institutional baseline. 

- **Primary & Secondary:** Use Medical Blue for primary actions and brand presence. Soft Teal is reserved for positive reinforcement, completion states, and success-oriented feedback.
- **Accents:** Amber is used sparingly for warnings or items requiring clinical caution.
- **Neutrals:** The background uses Slate-50 to reduce screen glare. Slate-100 and 200 are used for container borders and secondary shells. Slate-800 is reserved for high-contrast text and sidebar backgrounds.
- **Accessibility:** All color combinations for text and meaningful icons must pass WCAG AA standards against their respective backgrounds.

## Typography

The typography system differentiates between administrative UI, educational content, and clinical data.

- **Headlines:** Manrope provides a modern, slightly geometric feel that maintains a friendly but professional tone for section headers.
- **Body & Terms:** Inter is the workhorse for all descriptive text. Medical terms and drug names should consistently use the `medical-term` token (Semi-Bold) to stand out within paragraphs.
- **Technical Data:** Space Grotesk is used for vitals, dosages, and lab values. Its tabular figures and distinct character shapes prevent misreading critical numbers.
- **Hierarchy:** Maintain a clear vertical rhythm. Use ample line height for long-form study modules to improve readability during extended study sessions.

## Layout & Spacing

This design system utilizes a **Fixed-Fluid Hybrid Grid**. Content is housed in a 12-column grid system with a maximum width of 1440px for desktop to prevent line lengths from becoming too long for comfortable reading.

- **Rhythm:** A 4px baseline grid governs all spacing. Use `lg` (1.5rem) for padding within cards and `xl` (2rem) for spacing between major sections.
- **Sidebar:** A persistent 280px sidebar on desktop provides top-level navigation. 
- **Mobile:** Transition to a single-column layout with a 1rem safe-area margin. A fixed bottom navigation bar (64px height) provides primary touch targets for thumb-driven navigation.
- **Modular Layout:** Educational content should be broken into "bite-sized" containers to avoid cognitive overload.

## Elevation & Depth

Visual hierarchy is managed through **Tonal Layers** and **Ambient Shadows** to create a structured, tactile environment.

- **Background:** The primary canvas is Slate-50.
- **Level 1 (Cards):** Use white (#FFFFFF) surfaces with a very soft, diffused shadow (0px 4px 12px rgba(15, 23, 42, 0.05)) and a 1px border of Slate-200. This makes modular content like "Drug Cards" appear slightly raised and interactive.
- **Level 2 (Modals/Popovers):** Higher elevation with a more pronounced shadow (0px 12px 24px rgba(15, 23, 42, 0.1)) to focus attention on critical alerts or quick-entry vitals forms.
- **Interactive States:** Buttons should use a subtle inner-shadow on "active" (pressed) states to mimic a physical depression, reinforcing the professional and tactile nature of the tool.

## Shapes

The shape language is consistently **Rounded**, striking a balance between clinical efficiency and modern approachability.

- **Components:** Standard buttons, input fields, and small cards use a 0.5rem (8px) radius.
- **Content Containers:** Large educational modules and main content areas use the `rounded-lg` (1rem / 16px) radius to feel more inviting.
- **Selection Indicators:** Use pill-shaped (rounded-full) geometry for tags, status badges (e.g., "In Progress"), and chips to distinguish them from actionable buttons.
- **Consistency:** Ensure that nested elements (like an image inside a card) have a slightly smaller radius than their parent to maintain visual harmony.

## Components

- **Buttons:** Primary buttons use a solid Medical Blue background with white text. Secondary buttons use an outline style with a 1.5px stroke. Touch targets must be at least 44px in height.
- **Drug/Module Cards:** The core component of the platform. These include a Slate-100 header for the drug name (Semi-Bold), a white body for descriptions, and a footer for "Quick Actions" like bookmarking or taking a quiz.
- **Input Fields:** Use a clear focus state with a 2px Medical Blue ring. Labels must always be visible (no floating labels that disappear) to ensure clinical accuracy during data entry.
- **Vitals Display:** A specialized component using Space Grotesk for numbers. Use semantic color-coding (e.g., red text for a critical heart rate) only when the data exceeds safe thresholds.
- **Progress Bars:** Thin (8px) bars using the Soft Teal for completion. Include a percentage label using the `label-caps` typography style.
- **Bottom Navigation (Mobile):** High-contrast icons with 12px labels. The active state is indicated by a Medical Blue icon and a subtle 2px top-border on the active tab.