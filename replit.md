# Lumin Laboratories

## Overview

Lumin Laboratories is an AI-powered chat assistant that interfaces with Odoo ERP systems. Users can interact with their Odoo instance through natural language conversations to query sales, inventory, customers, and other business data. The application uses OpenAI's GPT models with function calling to translate user requests into Odoo API calls and present results in a conversational format.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite as the build tool
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack React Query for server state management and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with Apple-native theme (blue primary, clean grays, dark mode support)
- **Theme**: ThemeProvider component with localStorage persistence and system preference detection
- **Animations**: Framer Motion for message animations
- **Markdown**: react-markdown for rendering AI responses

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful endpoints defined in `shared/routes.ts` with Zod validation
- **Build**: esbuild for production bundling with selective dependency bundling for cold start optimization

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` with models split into `shared/models/`
- **Migrations**: Drizzle Kit for schema migrations (`drizzle-kit push`)
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple

### Authentication
- **Provider**: Direct database credentials (Odoo URL, database name, username, password)
- **Note**: Replit Auth has been removed; users connect directly with their Odoo credentials
- **Logout**: Clears settings to disconnect from Odoo instance

### AI Integration
- **Provider**: OpenAI API (via Replit AI Integrations)
- **Pattern**: Function calling for Odoo operations (search, create, update, delete)
- **Knowledge Base**: Stored in Odoo project.task for corrections, terminology, and preferences
- **Features**: Fuzzy search, implicit learning from user corrections
- **Response Styles**: User-configurable response formatting (detailed, concise, summary) stored in settings
- **Default Behavior**: Lists all records with full details; uses numbered lists and bold formatting for readability
- **Demo Conversation**: Pre-built demo messages showcasing capabilities (stock check, revenue query)

### Voice Conversation
- **Text-to-Speech**: Kokoro-82M neural TTS via `kokoro-js` running entirely in the browser (WebGPU/WASM, no API key, no server calls). Uses `af_bella` voice by default. Falls back to browser SpeechSynthesis on failure. Model (~80MB quantized) downloads & caches on first use.
- **Speech-to-Text**: Browser-native SpeechRecognition API for voice input via microphone button
- **Voice Mode Toggle**: Toggleable voice mode — when on, assistant responses auto-play as audio, and mic input auto-sends
- **Per-message Playback**: Small speaker icon on each assistant message for on-demand playback
- **Visual Indicators**: Pulsing waveform when speaking, red dot when listening, interim transcript display
- **Hook**: `client/src/hooks/use-voice.ts` manages all voice state and browser API interactions
- **Note**: Server-side TTS (OpenAI) not supported by Replit AI proxy; uses browser-native speech instead

### Odoo Integration
- **Protocol**: JSON-RPC over HTTP
- **Client**: Custom OdooClient class in `server/lib/odoo.ts`
- **Operations**: Search, create, update, delete, and field introspection
- **Configuration**: Stored in database settings table (URL, database, credentials)
- **Hyperlinks**: AI responses include clickable markdown links to Odoo records using format `{odooUrl}/odoo/{model}/{id}` which are translated client-side to `{odooUrl}/web#id={id}&model={model}&view_type=form`
- **Side-by-side Layout**: Togglable split-panel view with embedded Odoo iframe (left) and chat (right), with resizable panels (25-75% range) and iframe error detection with fallback
- **URL Validation**: Server-side validation ensures only http/https URLs are accepted for odooUrl

### Key Design Patterns
- **Shared Types**: Schema and route definitions shared between client and server via `@shared` alias
- **Type-safe APIs**: Zod schemas for request/response validation
- **Modular Integrations**: Replit integrations organized in `server/replit_integrations/` (auth, chat, batch, image)
- **Dark Mode**: Class-based toggle with ThemeProvider (`client/src/components/ThemeProvider.tsx`)

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, requires `DATABASE_URL` environment variable

### Authentication
- **Replit OIDC**: Uses `ISSUER_URL` (defaults to Replit), requires `REPL_ID` and `SESSION_SECRET`

### AI Services
- **OpenAI API**: Requires `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL`
- **Models Used**: GPT for chat completions, gpt-image-1 for image generation

### Third-Party APIs
- **Odoo ERP**: External Odoo instance configured via settings (URL, database, username, password)

### Key NPM Packages
- `drizzle-orm` / `drizzle-kit`: Database ORM and migrations
- `openai`: OpenAI API client
- `passport` / `openid-client`: Authentication
- `express-session` / `connect-pg-simple`: Session management
- `@tanstack/react-query`: Client-side data fetching
- `zod` / `drizzle-zod`: Schema validation
