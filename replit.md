# Overview

This is a full-stack book writing and publishing application that allows users to create, edit, and export books in markdown format. The application features a real-time markdown editor with live preview capabilities, customizable themes and layouts, image management, and PDF export functionality. Built as a modern web application with a React frontend and Express backend, it provides an intuitive writing experience similar to professional writing tools.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **UI Library**: shadcn/ui components built on Radix UI primitives with Tailwind CSS for styling
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation through @hookform/resolvers

The frontend follows a component-based architecture with a clear separation between UI components (`/components/ui/`), business logic components (`/components/`), and pages (`/pages/`). The application uses a custom hook pattern (`use-book-state.ts`) to manage complex state logic and API interactions.

## Backend Architecture
- **Framework**: Express.js with TypeScript running on Node.js
- **Database Layer**: Drizzle ORM configured for PostgreSQL with schema-first approach
- **Storage**: Dual storage implementation with in-memory storage for development and database persistence
- **File Handling**: Multer middleware for image upload processing with local file storage
- **PDF Generation**: Puppeteer for server-side PDF rendering and export

The backend implements a clean separation of concerns with dedicated modules for routing (`/routes.ts`), storage abstraction (`/storage.ts`), and development tooling (`/vite.ts` for HMR integration).

## Data Storage Solutions
- **Primary Database**: PostgreSQL accessed through Neon serverless database
- **ORM**: Drizzle ORM with TypeScript-first schema definitions
- **Schema Design**: Two main entities - projects and images with foreign key relationships
- **Development Fallback**: In-memory storage implementation for offline development
- **File Storage**: Local filesystem storage for uploaded images with organized directory structure

## Authentication and Authorization
- **Current State**: No authentication system implemented
- **Session Management**: Basic session storage configured but not actively used
- **Access Control**: Open access to all endpoints and resources

## PDF Export System
- **Rendering Engine**: Puppeteer for headless Chrome PDF generation
- **Content Processing**: Markdown to HTML conversion using the 'marked' library
- **Styling**: CSS-based themes and layouts applied during PDF generation
- **Export Options**: Configurable page sizes, headers, footers, and table of contents inclusion

## Real-time Features
- **Live Preview**: Real-time markdown to HTML rendering with synchronized scrolling
- **Auto-save**: Debounced automatic saving of content changes
- **Word Count**: Live statistics tracking including word count, line count, and reading time estimates

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Connection Management**: Environment-based DATABASE_URL configuration with automatic provisioning checks

## Development Tools
- **Replit Integration**: Custom Vite plugins for Replit-specific features including error overlays and cartographer integration
- **Hot Module Replacement**: Vite dev server with Express middleware integration for seamless development experience

## UI and Styling
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **Radix UI**: Headless UI components for accessibility and consistent behavior
- **Lucide React**: Icon library providing consistent iconography throughout the application
- **Google Fonts**: Custom font loading for Inter, DM Sans, Fira Code, and Geist Mono typefaces

## Content Processing
- **Marked**: Markdown parsing and HTML generation library
- **Date-fns**: Date manipulation and formatting utilities
- **Class Variance Authority**: Type-safe CSS class composition for component variants

## File Processing
- **Multer**: Multipart form data handling for image uploads with file type validation and size limits
- **File System Operations**: Native Node.js fs module for file management and directory operations