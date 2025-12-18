# Kuaishou Video Downloader

## Overview

A single-purpose web utility for downloading videos from Kuaishou (Chinese short video platform). The application provides a clean, minimalist interface where users paste a Kuaishou URL and receive download options for video and audio content. Built as a full-stack TypeScript application with React frontend and Express backend, designed to be embeddable in WordPress via iframe.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with custom configuration for Replit environment
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style variant)
- **Design System**: Minimalist white UI following utility-focused design principles from `design_guidelines.md`

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript compiled with tsx
- **API Pattern**: REST endpoints under `/api` prefix
- **Video Fetching**: Server-side URL extraction with redirect following and rotating user agents to handle Kuaishou's anti-bot measures

### Project Structure
```
client/           # React frontend application
  src/
    components/   # Reusable UI components (shadcn/ui)
    pages/        # Route components (home, not-found)
    hooks/        # Custom React hooks
    lib/          # Utilities and query client
server/           # Express backend
  index.ts        # Server entry point
  routes.ts       # API route definitions
  static.ts       # Static file serving for production
  vite.ts         # Vite dev server integration
shared/           # Shared code between client/server
  schema.ts       # Zod schemas for type validation
```

### Build System
- **Development**: Vite dev server with HMR proxied through Express
- **Production**: Vite builds client to `dist/public`, esbuild bundles server to `dist/index.cjs`
- **Type Checking**: Strict TypeScript with path aliases (`@/` for client, `@shared/` for shared)

### Key Design Decisions

1. **Monorepo Structure**: Single repository with client/server/shared directories allows code sharing (schemas, types) while maintaining clear separation of concerns.

2. **Server-Side Video Extraction**: Video URL extraction happens on the backend to bypass CORS restrictions and handle Kuaishou's authentication/redirect patterns.

3. **Schema-First API**: Zod schemas in `shared/schema.ts` define request/response types used by both frontend and backend, ensuring type safety across the stack.

4. **Component Library**: shadcn/ui provides accessible, customizable components that can be modified directly in the codebase rather than imported from node_modules.

## External Dependencies

### Database
- **ORM**: Drizzle ORM configured for PostgreSQL
- **Schema Location**: `shared/schema.ts`
- **Migrations**: Output to `./migrations` directory via `drizzle-kit push`
- **Note**: Database currently minimal (storage.ts has empty interface) - infrastructure ready for future persistence needs

### Third-Party Services
- **Kuaishou/Kwai**: External video platform being scraped (no official API)
- No authentication services configured
- No payment integrations
- No external analytics

### Key NPM Dependencies
- `@tanstack/react-query`: Server state management
- `drizzle-orm` / `drizzle-zod`: Database ORM and schema validation
- `express`: HTTP server framework
- `zod`: Runtime type validation
- `wouter`: Client-side routing
- `vaul`: Drawer component
- `embla-carousel-react`: Carousel functionality
- `react-day-picker`: Date picker component