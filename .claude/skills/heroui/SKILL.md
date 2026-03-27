---
name: heroui
description: "Build UIs with HeroUI v3, an open-source React component library built on Tailwind CSS v4 and React Aria. Use when building React web interfaces, adding UI components (buttons, modals, tables, forms, cards, tabs, etc.), theming, or styling with HeroUI. Triggers on: HeroUI components, @heroui/react imports, heroui styling, heroui theming, or building accessible React UIs with Tailwind CSS v4."
---

# HeroUI v3 Documentation

> A set of beautiful, customizable React and React Native components that stay maintained and up to date.

HeroUI v3 is an open-source UI component library for building modern web and mobile applications. Built on [Tailwind CSS v4](https://tailwindcss.com/) and [React Aria Components](https://react-spectrum.adobe.com/react-aria/), HeroUI provides accessible, customizable components with smooth animations and polished details.

**Key Features:**

- Beautiful by default - Professional look out of the box, no extra styling needed
- Accessible - Built with accessibility in mind, following WAI-ARIA guidelines
- Flexible - Each component is made of customizable parts
- Developer-friendly - Fully typed APIs, predictable patterns, and excellent autocompletion
- Maintained - Regular updates, bug fixes, and new features

**Technology Stack:**

- React 19+ for web components
- React Native for mobile components
- Tailwind CSS v4 for styling
- TypeScript for type safety

## Available Platforms

- **React (Web)**: [/react/llms.txt](https://www.heroui.com/react/llms.txt) - React component library for web applications
- **React Native**: [/native/llms.txt](https://www.heroui.com/native/llms.txt) - React Native component library for mobile applications

## Documentation Index

### React

- [All Components](https://www.heroui.com/docs/react/components): Explore the full list of components available in the library. More are on the way.
- [Introduction](https://www.heroui.com/docs/react/getting-started): An open-source UI component library for building beautiful and accessible user interfaces.
- [Migration (for AI assistants)](https://www.heroui.com/docs/react/migration/agent-index): Entry point for AI assistants helping migrate HeroUI v2 to v3
- [Hooks](https://www.heroui.com/docs/react/migration/hooks): Migration guide for HeroUI hooks from v2 to v3
- [Migration](https://www.heroui.com/docs/react/migration): Complete guide to migrate your HeroUI v2 application to v3
- [Styling & Theming](https://www.heroui.com/docs/react/migration/styling): Complete guide to styling changes and theming system migration from HeroUI v2 to v3
- [All Releases](https://www.heroui.com/docs/react/releases): All updates and changes to HeroUI v3, including new features, fixes, and breaking changes.

#### Web Components

- [ButtonGroup](https://www.heroui.com/docs/react/components/button-group): Group related buttons together with consistent styling and spacing
- [Button](https://www.heroui.com/docs/react/components/button): A clickable button component with multiple variants and states
- [CloseButton](https://www.heroui.com/docs/react/components/close-button): Button component for closing dialogs, modals, or dismissing content
- [ToggleButtonGroup](https://www.heroui.com/docs/react/components/toggle-button-group): Groups multiple ToggleButtons into a unified control, allowing users to select one or multiple options.
- [ToggleButton](https://www.heroui.com/docs/react/components/toggle-button): An interactive toggle control for on/off or selected/unselected states
- [Dropdown](https://www.heroui.com/docs/react/components/dropdown): A dropdown displays a list of actions or options that a user can choose
- [ListBox](https://www.heroui.com/docs/react/components/list-box): A listbox displays a list of options and allows a user to select one or more of them
- [TagGroup](https://www.heroui.com/docs/react/components/tag-group): A focusable list of tags with support for keyboard navigation, selection, and removal

#### Color Components

- [ColorArea](https://www.heroui.com/docs/react/components/color-area): A 2D color picker that allows users to select colors from a gradient area
- [ColorField](https://www.heroui.com/docs/react/components/color-field): Color input field with labels, descriptions, and validation built on React Aria ColorField
- [ColorPicker](https://www.heroui.com/docs/react/components/color-picker): A composable color picker that synchronizes color value between multiple color components
- [ColorSlider](https://www.heroui.com/docs/react/components/color-slider): A color slider allows users to adjust an individual channel of a color value
- [ColorSwatchPicker](https://www.heroui.com/docs/react/components/color-swatch-picker): A list of color swatches that allows users to select a color from a predefined palette.
- [ColorSwatch](https://www.heroui.com/docs/react/components/color-swatch): A visual preview of a color value with accessibility support

#### Input Components

- [Slider](https://www.heroui.com/docs/react/components/slider): A slider allows a user to select one or more values within a range
- [Switch](https://www.heroui.com/docs/react/components/switch): A toggle switch component for boolean states

#### Display Components

- [Badge](https://www.heroui.com/docs/react/components/badge): Displays a small indicator positioned relative to another element, commonly used for notification counts, status dots, and labels
- [Chip](https://www.heroui.com/docs/react/components/chip): Small informational badges for displaying labels, statuses, and categories
- [Table](https://www.heroui.com/docs/react/components/table): Tables display structured data in rows and columns with support for sorting, selection, column resizing, and infinite scrolling.

#### Date/Time Components

- [Calendar](https://www.heroui.com/docs/react/components/calendar): Composable date picker with month grid, navigation, and year picker support built on React Aria Calendar
- [DateField](https://www.heroui.com/docs/react/components/date-field): Date input field with labels, descriptions, and validation built on React Aria DateField
- [DatePicker](https://www.heroui.com/docs/react/components/date-picker): Composable date picker built on React Aria DatePicker with DateField and Calendar composition
- [DateRangePicker](https://www.heroui.com/docs/react/components/date-range-picker): Composable date range picker built on React Aria DateRangePicker with DateField and RangeCalendar composition
- [RangeCalendar](https://www.heroui.com/docs/react/components/range-calendar): Composable date range picker with month grid, navigation, and year picker support built on React Aria RangeCalendar
- [TimeField](https://www.heroui.com/docs/react/components/time-field): Time input field with labels, descriptions, and validation built on React Aria TimeField

#### Status/Feedback Components

- [Alert](https://www.heroui.com/docs/react/components/alert): Display important messages and notifications to users with status indicators
- [Meter](https://www.heroui.com/docs/react/components/meter): A meter represents a quantity within a known range, or a fractional value.
- [ProgressBar](https://www.heroui.com/docs/react/components/progress-bar): A progress bar shows either determinate or indeterminate progress of an operation over time.
- [ProgressCircle](https://www.heroui.com/docs/react/components/progress-circle): A circular progress indicator that shows determinate or indeterminate progress.
- [Skeleton](https://www.heroui.com/docs/react/components/skeleton): Skeleton is a placeholder to show a loading state and the expected shape of a component.
- [Spinner](https://www.heroui.com/docs/react/components/spinner): A loading indicator component to show pending states

#### Form Components

- [CheckboxGroup](https://www.heroui.com/docs/react/components/checkbox-group): A checkbox group component for managing multiple checkbox selections
- [Checkbox](https://www.heroui.com/docs/react/components/checkbox): Checkboxes allow users to select multiple items from a list of individual items, or to mark one individual item as selected.
- [Description](https://www.heroui.com/docs/react/components/description): Provides supplementary text for form fields and other components
- [ErrorMessage](https://www.heroui.com/docs/react/components/error-message): A low-level error message component for displaying errors
- [FieldError](https://www.heroui.com/docs/react/components/field-error): Displays validation error messages for form fields
- [Fieldset](https://www.heroui.com/docs/react/components/fieldset): Group related form controls with legends, descriptions, and actions
- [Form](https://www.heroui.com/docs/react/components/form): Wrapper component for form validation and submission handling
- [InputGroup](https://www.heroui.com/docs/react/components/input-group): Group related input controls with prefix and suffix elements for enhanced form fields
- [InputOTP](https://www.heroui.com/docs/react/components/input-otp): A one-time password input component for verification codes and secure authentication
- [Input](https://www.heroui.com/docs/react/components/input): Primitive single-line text input component that accepts standard HTML attributes
- [Label](https://www.heroui.com/docs/react/components/label): Renders an accessible label associated with form controls
- [NumberField](https://www.heroui.com/docs/react/components/number-field): Number input fields with increment/decrement buttons, validation, and internationalized formatting
- [RadioGroup](https://www.heroui.com/docs/react/components/radio-group): Radio group for selecting a single option from a list
- [SearchField](https://www.heroui.com/docs/react/components/search-field): Search input field with clear button and search icon
- [TextArea](https://www.heroui.com/docs/react/components/text-area): Primitive multiline text input component that accepts standard HTML attributes
- [TextField](https://www.heroui.com/docs/react/components/text-field): Composition-friendly text fields with labels, descriptions, and inline validation

#### Layout Components

- [Card](https://www.heroui.com/docs/react/components/card): Flexible container component for grouping related content and actions
- [Separator](https://www.heroui.com/docs/react/components/separator): Visually divide content sections
- [Surface](https://www.heroui.com/docs/react/components/surface): Container component that provides surface-level styling and context for child components
- [Toolbar](https://www.heroui.com/docs/react/components/toolbar): A container for interactive controls with arrow key navigation.

#### Media Components

- [Avatar](https://www.heroui.com/docs/react/components/avatar): Display user profile images with customizable fallback content

#### Navigation Components

- [Accordion](https://www.heroui.com/docs/react/components/accordion): A collapsible content panel for organizing information in a compact space
- [Breadcrumbs](https://www.heroui.com/docs/react/components/breadcrumbs): Navigation breadcrumbs showing the current page's location within a hierarchy
- [DisclosureGroup](https://www.heroui.com/docs/react/components/disclosure-group): Container that manages multiple Disclosure items with coordinated expanded states
- [Disclosure](https://www.heroui.com/docs/react/components/disclosure): A disclosure is a collapsible section with a header containing a heading and a trigger button, and a panel that wraps the content.
- [Link](https://www.heroui.com/docs/react/components/link): A styled anchor component for navigation with built-in icon support
- [Pagination](https://www.heroui.com/docs/react/components/pagination): Page navigation with composable page links, previous/next buttons, and ellipsis indicators
- [Tabs](https://www.heroui.com/docs/react/components/tabs): Tabs organize content into multiple sections and allow users to navigate between them.

#### Overlay Components

- [AlertDialog](https://www.heroui.com/docs/react/components/alert-dialog): Modal dialog for critical confirmations requiring user attention and explicit action
- [Drawer](https://www.heroui.com/docs/react/components/drawer): Slide-out panel for supplementary content and actions
- [Modal](https://www.heroui.com/docs/react/components/modal): Dialog overlay for focused user interactions and important content
- [Popover](https://www.heroui.com/docs/react/components/popover): Displays rich content in a portal triggered by a button or any custom element
- [Toast](https://www.heroui.com/docs/react/components/toast): Display temporary notifications and messages to users with automatic dismissal and customizable placement
- [Tooltip](https://www.heroui.com/docs/react/components/tooltip): Displays informative text when users hover over or focus on an element

#### Selection Components

- [Autocomplete](https://www.heroui.com/docs/react/components/autocomplete): An autocomplete combines a select with filtering, allowing users to search and select from a list of options
- [ComboBox](https://www.heroui.com/docs/react/components/combo-box): A combo box combines a text input with a listbox, allowing users to filter a list of options to items matching a query
- [Select](https://www.heroui.com/docs/react/components/select): A select displays a collapsible list of options and allows a user to select one of them

#### Utility Components

- [Kbd](https://www.heroui.com/docs/react/components/kbd): Display keyboard shortcuts and key combinations
- [ScrollShadow](https://www.heroui.com/docs/react/components/scroll-shadow): Apply visual shadows to indicate scrollable content overflow with automatic detection of scroll position.

#### Getting Started

- [Animation](https://www.heroui.com/docs/react/getting-started/animation): Add smooth animations and transitions to HeroUI v3 components
- [Colors](https://www.heroui.com/docs/react/getting-started/colors): Color palette and theming system for HeroUI v3
- [Composition](https://www.heroui.com/docs/react/getting-started/composition): Build flexible UI with component composition patterns
- [Styling](https://www.heroui.com/docs/react/getting-started/styling): Style HeroUI components with CSS, Tailwind, or CSS-in-JS
- [Theming](https://www.heroui.com/docs/react/getting-started/theming): Customize HeroUI's design system with CSS variables and global styles
- [Design Principles](https://www.heroui.com/docs/react/getting-started/design-principles): Core principles that guide HeroUI v3's design and development
- [Quick Start](https://www.heroui.com/docs/react/getting-started/quick-start): Get started with HeroUI v3 in minutes
- [Agent Skills](https://www.heroui.com/docs/react/getting-started/agent-skills): Enable AI assistants to build UIs with HeroUI v3 components
- [AGENTS.md](https://www.heroui.com/docs/react/getting-started/agents-md): Download HeroUI v3 React documentation for AI coding agents
- [LLMs.txt](https://www.heroui.com/docs/react/getting-started/llms-txt): Enable AI assistants like Claude, Cursor, and Windsurf to understand HeroUI v3
- [MCP Server](https://www.heroui.com/docs/react/getting-started/mcp-server): Access HeroUI v3 documentation directly in your AI assistant

### Native

- [All Components](https://www.heroui.com/docs/native/components): Explore the full list of components available in HeroUI Native. More are on the way.
- [Introduction](https://www.heroui.com/docs/native/getting-started): An open-source UI component library for building beautiful and accessible user interfaces.

#### Native Components

- [Button](https://www.heroui.com/docs/native/components/button): Interactive component that triggers an action when pressed.
- [CloseButton](https://www.heroui.com/docs/native/components/close-button): Button component for closing dialogs, modals, or dismissing content.
- [LinkButton](https://www.heroui.com/docs/native/components/link-button): A ghost-variant button with no highlight feedback, designed for inline link-style interactions.
- [Menu](https://www.heroui.com/docs/native/components/menu): A floating context menu with positioning, selection groups, and multiple presentation modes.
- [TagGroup](https://www.heroui.com/docs/native/components/tag-group): A compound component for displaying and managing selectable tags with optional removal.
- [Slider](https://www.heroui.com/docs/native/components/slider): A draggable input for selecting a value or range within a bounded interval.
- [Switch](https://www.heroui.com/docs/native/components/switch): A toggle control that allows users to switch between on and off states.
- [Chip](https://www.heroui.com/docs/native/components/chip): Displays a compact element in a capsule shape.
- [Alert](https://www.heroui.com/docs/native/components/alert): Displays important messages and notifications to users with status indicators.
- [SkeletonGroup](https://www.heroui.com/docs/native/components/skeleton-group): Coordinates multiple skeleton loading placeholders with centralized animation control.
- [Skeleton](https://www.heroui.com/docs/native/components/skeleton): Displays a loading placeholder with shimmer or pulse animation effects.
- [Spinner](https://www.heroui.com/docs/native/components/spinner): Displays an animated loading indicator.
- [Checkbox](https://www.heroui.com/docs/native/components/checkbox): A selectable control that allows users to toggle between checked and unchecked states.
- [ControlField](https://www.heroui.com/docs/native/components/control-field): A field component that combines a label, description, and a control component into a single pressable area.
- [Description](https://www.heroui.com/docs/native/components/description): Text component for providing accessible descriptions and helper text.
- [FieldError](https://www.heroui.com/docs/native/components/field-error): Displays validation error message content with smooth animations.
- [InputGroup](https://www.heroui.com/docs/native/components/input-group): A compound layout component that groups an input with optional prefix and suffix decorators.
- [InputOTP](https://www.heroui.com/docs/native/components/input-otp): Input component for entering one-time passwords with individual character slots.
- [Input](https://www.heroui.com/docs/native/components/input): A text input component with styled border and background.
- [Label](https://www.heroui.com/docs/native/components/label): Text component for labeling form fields with support for required indicators.
- [RadioGroup](https://www.heroui.com/docs/native/components/radio-group): A set of radio buttons where only one option can be selected at a time.
- [SearchField](https://www.heroui.com/docs/native/components/search-field): A compound search input for filtering and querying content.
- [Select](https://www.heroui.com/docs/native/components/select): Displays a list of options for the user to pick from.
- [TextArea](https://www.heroui.com/docs/native/components/text-area): A multiline text input component.
- [TextField](https://www.heroui.com/docs/native/components/text-field): A text input component with label, description, and error handling.
- [Card](https://www.heroui.com/docs/native/components/card): Displays a card container with flexible layout sections.
- [Separator](https://www.heroui.com/docs/native/components/separator): A simple line to separate content visually.
- [Surface](https://www.heroui.com/docs/native/components/surface): Container component that provides elevation and background styling.
- [Avatar](https://www.heroui.com/docs/native/components/avatar): Displays a user avatar with support for images, text initials, or fallback icons.
- [Accordion](https://www.heroui.com/docs/native/components/accordion): A collapsible content panel for organizing information in a compact space.
- [ListGroup](https://www.heroui.com/docs/native/components/list-group): A Surface-based container that groups related list items.
- [Tabs](https://www.heroui.com/docs/native/components/tabs): Organize content into tabbed views with animated transitions and indicators.
- [BottomSheet](https://www.heroui.com/docs/native/components/bottom-sheet): Displays a bottom sheet that slides up from the bottom.
- [Dialog](https://www.heroui.com/docs/native/components/dialog): Displays a modal overlay with animated transitions and gesture-based dismissal.
- [Popover](https://www.heroui.com/docs/native/components/popover): Displays a floating content panel anchored to a trigger element.
- [Toast](https://www.heroui.com/docs/native/components/toast): Displays temporary notification messages.
- [PressableFeedback](https://www.heroui.com/docs/native/components/pressable-feedback): Container component that provides visual feedback for press interactions.
- [ScrollShadow](https://www.heroui.com/docs/native/components/scroll-shadow): Adds dynamic gradient shadows to scrollable content.

#### Native Getting Started

- [Animation](https://www.heroui.com/docs/native/getting-started/animation): Add smooth animations and transitions to HeroUI Native components
- [Colors](https://www.heroui.com/docs/native/getting-started/colors): Color palette and theming system for HeroUI Native
- [Composition](https://www.heroui.com/docs/native/getting-started/composition): Build flexible UI with component composition patterns
- [Portal](https://www.heroui.com/docs/native/getting-started/portal)
- [Provider](https://www.heroui.com/docs/native/getting-started/provider): Configure HeroUI Native provider with text, animation, and toast settings
- [Styling](https://www.heroui.com/docs/native/getting-started/styling): Style HeroUI Native components with Tailwind or StyleSheet API
- [Theming](https://www.heroui.com/docs/native/getting-started/theming): Customize HeroUI Native's design system with CSS variables and global styles
- [Design Principles](https://www.heroui.com/docs/native/getting-started/design-principles): Core principles that guide HeroUI v3's design and development
- [Quick Start](https://www.heroui.com/docs/native/getting-started/quick-start): Get started with HeroUI Native in minutes
- [Agent Skills](https://www.heroui.com/docs/native/getting-started/agent-skills): Enable AI assistants to build mobile UIs with HeroUI Native components
- [AGENTS.md](https://www.heroui.com/docs/native/getting-started/agents-md): Download HeroUI Native documentation for AI coding agents
- [LLMs.txt](https://www.heroui.com/docs/native/getting-started/llms-txt): Enable AI assistants like Claude, Cursor, and Windsurf to understand HeroUI Native
- [MCP Server](https://www.heroui.com/docs/native/getting-started/mcp-server): Access HeroUI Native documentation directly in your AI assistant
