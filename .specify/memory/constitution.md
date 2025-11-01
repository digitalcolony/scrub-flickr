<!--
Sync Impact Report:
- Version change: Template → 1.0.0 (initial constitution)
- Modified principles: All principles (template → concrete implementation)
- Added sections: All sections (template filled)
- Removed sections: None
- Templates requiring updates: ✅ Updated constitution references
- Follow-up TODOs: None - all placeholders filled
-->

# Scrub-Flickr Constitution

## Core Principles

### I. Component-First Architecture

React components MUST be self-contained, reusable, and independently testable. Each component MUST have a single responsibility with clear props interface. State management MUST be isolated and predictable using Zustand for global state and useState/useReducer for local state.

**Rationale**: Ensures maintainable, testable UI architecture that scales with the application complexity while maintaining React best practices.

### II. Modern Web Standards

All code MUST use ES6+ syntax, React functional components with hooks, and follow React 19+ patterns. TypeScript adoption is ENCOURAGED for enhanced type safety. Bundle size and performance MUST be continuously monitored and optimized.

**Rationale**: Maintains compatibility with modern web standards, improves developer experience, and ensures long-term maintainability in the rapidly evolving React ecosystem.

### III. Test-First Development (NON-NEGOTIABLE)

User stories MUST be defined with acceptance criteria before implementation. Component testing MUST include unit tests for logic and integration tests for user interactions. Tests MUST be written to fail first, then implemented to pass (Red-Green-Refactor cycle).

**Rationale**: Ensures feature completeness, prevents regressions, and maintains code quality through disciplined development practices essential for image management applications.

### IV. API Integration Standards

All external API calls (Flickr API, image processing) MUST be abstracted through service layers with proper error handling, retry logic, and loading states. API responses MUST be validated and normalized before state updates.

**Rationale**: Creates reliable data flow patterns essential for external service integration while providing consistent user experience during network operations.

### V. Responsive Design First

All UI components MUST be responsive and accessible using Tailwind CSS utility-first approach. Mobile-first design principles MUST be applied. Dark/light mode support MUST be considered for all new UI components.

**Rationale**: Ensures application usability across all devices and accessibility standards, critical for image management workflows that may occur on various devices.

## Technical Standards

### Technology Stack Requirements

- **Frontend Framework**: React 19+ with functional components and hooks
- **Build System**: Vite for development server and production builds
- **Styling**: Tailwind CSS with PostCSS processing and responsive design patterns
- **State Management**: Zustand for global state, React hooks for local state
- **HTTP Client**: Axios for API calls with interceptors for error handling
- **Code Quality**: ESLint with React-specific rules and automatic formatting

### File Organization Standards

- Source code organized in `src/` with clear separation of concerns
- Components in `src/components/` with co-located tests and styles
- Services in `src/services/` for external API integrations
- State management in `src/stores/` using Zustand patterns
- Utilities in `src/utils/` for shared helper functions
- Public assets in `public/` for static resources

### Performance Requirements

- Bundle size MUST remain under 500KB gzipped for initial load
- First Contentful Paint MUST be under 2 seconds on 3G connections
- Image loading MUST implement lazy loading and progressive enhancement
- API responses MUST be cached appropriately to minimize requests

## Development Workflow

### Feature Development Process

1. Feature specifications MUST be documented using `.specify/templates/spec-template.md`
2. Implementation plans MUST be created using `.specify/templates/plan-template.md`
3. Tasks MUST be broken down using `.specify/templates/tasks-template.md`
4. All features MUST be developed in feature branches with descriptive names
5. Code reviews MUST verify constitution compliance before merging

### Quality Gates

- All ESLint rules MUST pass without warnings
- Component tests MUST achieve minimum 80% coverage for new code
- Manual testing MUST be performed on mobile and desktop viewports
- Performance budgets MUST not be exceeded (verified in CI/CD)
- Accessibility standards (WCAG 2.1 AA) MUST be maintained

### Git Workflow Standards

- Commit messages MUST follow conventional commits format
- Feature branches MUST be named `feature/descriptive-name`
- Pull requests MUST include constitution compliance checklist
- Main branch MUST always remain in deployable state

## Governance

### Amendment Process

Constitution amendments MUST follow semantic versioning:

- **MAJOR**: Breaking changes to core principles or architecture decisions
- **MINOR**: New principles added or existing principles substantially expanded
- **PATCH**: Clarifications, updates, or minor corrections to existing principles

### Compliance Review

- All pull requests MUST verify adherence to constitutional principles
- Code reviews MUST check for violations of technical standards
- Performance metrics MUST be monitored and reported monthly
- Constitution relevance MUST be reviewed quarterly and updated as needed

### Violation Handling

- Principle violations MUST be addressed before merging
- Complexity that violates principles MUST be justified in implementation plans
- Temporary exceptions MUST be documented with remediation timeline
- All exceptions MUST be reviewed and resolved within one release cycle

**Version**: 1.0.0 | **Ratified**: 2025-11-01 | **Last Amended**: 2025-11-01
