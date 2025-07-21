# Database Tool

A web-based database management tool for the MAIPL platform.

## Features

- h5 Database management
- h5 Database creation / view

## Development

### Prerequisites

- Node.js 18+
- pnpm

### Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Start development server:
   ```bash
   pnpm start
   ```

3. Build for production:
   ```bash
   pnpm build
   ```

### Port Configuration

The app runs on port 3001 by default. You can configure this using the `VITE_PORT` environment variable.

## Structure

- `src/App.tsx` - Main application component with routing
- `src/DatabaseHome.tsx` - Home page component
- `src/main.tsx` - Application entry point

## Dependencies

This app uses the following MAIPL modules:
- `@maipl/api` - API client for backend communication
- `@maipl/react` - Shared React components and utilities
- `@maipl/format` - Data formatting utilities 