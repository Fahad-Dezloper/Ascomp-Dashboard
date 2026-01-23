# Ascomp INC Service Portal

A comprehensive field-service and maintenance workflow portal for Ascomp INC, built with modern web technologies to manage service records, projectors, sites, and field workers.

## Tech Stack

### Core Framework
- **Next.js** `16.0.7` - React framework with App Router
- **React** `19.2.0` - UI library
- **React DOM** `19.2.0` - React rendering
- **TypeScript** `5.x` - Type-safe JavaScript
- **Bun** - Package manager and runtime

### Database & ORM
- **PostgreSQL** - Relational database
- **Prisma** `6.19.0` - Next-generation ORM
  - Prisma Client for type-safe database access
  - Prisma Migrate for database migrations
  - PostgreSQL adapter

### Authentication & Authorization
- **Better Auth** `1.3.28` - Modern authentication library
  - Email/password authentication
  - Session management
  - Role-based access control (ADMIN, FIELD_WORKER)
  - Prisma adapter integration

### UI Framework & Styling
- **Tailwind CSS** `4.1.9` - Utility-first CSS framework
- **PostCSS** `8.5` - CSS processing
- **shadcn/ui** - High-quality React components built on Radix UI
- **Radix UI** - Unstyled, accessible component primitives
  - Dialog, Dropdown Menu, Popover, Select, Tabs, Toast, Tooltip, and more
- **Lucide React** `0.554.0` - Icon library
- **next-themes** `0.4.6` - Dark mode support
- **class-variance-authority** `0.7.1` - Component variant management
- **clsx** `2.1.1` - Conditional class names
- **tailwind-merge** `3.3.1` - Merge Tailwind classes
- **tailwindcss-animate** `1.0.7` - Animation utilities

### Form Management & Validation
- **React Hook Form** `7.66.1` - Performant forms with easy validation
- **@hookform/resolvers** `5.2.2` - Validation resolvers
- **Zod** `4.1.13` - TypeScript-first schema validation
- **@tanstack/react-form** `1.26.0` - Headless form library

### State Management & Data Fetching
- React Context API for global state
- Custom hooks for data management
- Server Components and Server Actions (Next.js)

### Queue & Background Jobs
- **BullMQ** `5.10.2` - Robust job queue
- **ioredis** `5.4.1` - Redis client
- **@upstash/redis** `1.36.1` - Upstash Redis client (alternative)
- Background worker for export jobs and long-running tasks

### File Storage & Media
- **Vercel Blob Storage** `2.0.0` - Cloud file storage
  - Image uploads (signatures, service photos)
  - PDF storage
  - Excel file storage
- Custom image compression utilities
- **jszip** `3.10.1` - ZIP file generation

### PDF Generation
- **jsPDF** `3.0.4` - Client-side PDF generation
- **pdf-lib** `1.17.1` - PDF manipulation library
- Custom PDF generator for service reports

### Excel Processing
- **ExcelJS** `4.4.0` - Excel file generation and manipulation
- **xlsx** `0.18.5` - Excel file parsing
- **csv-parse** `6.1.0` - CSV parsing

### Email Service
- **Nodemailer** `7.0.11` - Email sending
- Gmail OAuth2 integration
- Service report email notifications
- Credential delivery emails

### Data Visualization
- **Recharts** `3.5.1` - Composable charting library
- Custom analytics dashboards


### Analytics & Monitoring
- **@vercel/analytics** `1.3.1` - Web analytics

### Progressive Web App (PWA)
- Service Worker for offline functionality
- Web App Manifest
- Installable app support
- Offline page caching

### Development Tools
- **ESLint** - Code linting
- **PostCSS** - CSS processing
- **TypeScript** - Type checking

### Deployment & Infrastructure
- **Render** - Deployment platform (render.yaml)
- **Vercel** - Deployment platform (via Next.js)

## 📁 Project Structure

```
ascomp/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── admin/             # Admin dashboard pages
│   │   ├── api/               # API routes
│   │   ├── dashboard/         # Main dashboard
│   │   ├── form/              # Form pages
│   │   ├── login/             # Authentication
│   │   ├── share/             # Shared/public pages
│   │   └── user/              # User pages
│   ├── components/            # React components
│   │   ├── admin/            # Admin-specific components
│   │   ├── field-worker/     # Field worker components
│   │   ├── services/         # Service-related components
│   │   ├── ui/               # shadcn/ui components
│   │   └── workflow/         # Workflow components
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Utility libraries
│   │   ├── queues/          # Queue definitions
│   │   └── ...              # Auth, DB, email, etc.
│   └── workers/              # Background workers
├── prisma/
│   ├── schema/              # Prisma schema files
│   └── migrations/          # Database migrations
├── public/                  # Static assets
│   ├── data/               # JSON data files
│   └── LOGO/               # Logo assets
├── config/                  # Configuration files
└── data/                    # Data configuration
```

## 🔧 Key Features

### Admin Features
- Dashboard with analytics and overview
- Field worker management
- Site management
- Projector management
- Service scheduling and assignment
- Bulk data export (Excel + PDFs)
- Excel upload for service records
- Service record management

### Field Worker Features
- Service task management
- Dynamic form workflow
- Image capture and upload (before/after/broken)
- Digital signature capture
- PDF report generation
- Service completion workflow
- Work history tracking

### Core Functionality
- User authentication and authorization
- Role-based access control
- Service record tracking
- PDF report generation
- Email notifications
- Image compression and storage
- Background job processing
- Offline PWA support
- Dark mode support

## 🗄️ Database Schema

### Main Models
- **User** - Users with roles (ADMIN, FIELD_WORKER)
- **Site** - Service locations
- **Projector** - Projector equipment
- **ServiceRecord** - Service visit records
- **FormConfiguration** - Dynamic form configurations
- **DataFile** - Reference data files
- **Session** - User sessions
- **Account** - Authentication accounts
- **Verification** - Email verification tokens

## 🔐 Environment Variables

Required environment variables:

```env
# Database
DATABASE_URL=postgresql://...

# Redis
REDIS_URL=redis://... or rediss://...

# Authentication
CORS_ORIGIN=http://localhost:3000

# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN=vercel_blob_...

# Email (Gmail OAuth2)
GMAIL_OAUTH_USER=...
GMAIL_OAUTH_CLIENT_ID=...
GMAIL_OAUTH_CLIENT_SECRET=...
GMAIL_OAUTH_REFRESH_TOKEN=...
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or Bun
- PostgreSQL database
- Redis instance (for background jobs)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   # or
   bun install
   ```

3. Set up environment variables (copy `.env.example` to `.env`)

4. Set up the database:
   ```bash
   pnpm prisma:generate
   pnpm prisma:migrate
   pnpm prisma:seed
   ```

5. Run the development server:
   ```bash
   pnpm dev
   ```

6. Run the background worker (in a separate terminal):
   ```bash
   pnpm worker:export
   ```

## 📜 Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm prisma:generate` - Generate Prisma Client
- `pnpm prisma:migrate` - Run database migrations
- `pnpm prisma:studio` - Open Prisma Studio
- `pnpm worker:export` - Start export worker
- `pnpm pm2:start` - Start with PM2
- `pnpm pm2:stop` - Stop PM2 processes
- `pnpm pm2:logs` - View PM2 logs

## 🏗️ Architecture

### Frontend
- **Next.js App Router** - File-based routing with Server Components
- **Server Components** - Server-side rendering for better performance
- **Client Components** - Interactive UI components
- **API Routes** - RESTful API endpoints

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **Prisma ORM** - Database access layer
- **Better Auth** - Authentication middleware
- **BullMQ Workers** - Background job processing

### Data Flow
1. User interactions → Client Components
2. API calls → Next.js API Routes
3. Database operations → Prisma Client
4. Background jobs → BullMQ Queue → Worker
5. File storage → Vercel Blob
6. Email notifications → Nodemailer

## 🔄 Background Jobs

The application uses BullMQ for processing long-running tasks:

- **Export Jobs** - Generate Excel files and PDFs for bulk data export
- Job queue managed by Redis
- Separate worker process handles job execution
- Automatic retries with exponential backoff
- Job status tracking

## 📦 Deployment

### Supported Platforms
- **Vercel** - Recommended for Next.js apps
- **Railway** - Full-stack deployment
- **Render** - Worker and web service deployment
- **Docker** - Containerized deployment

### Deployment Configuration
- `railway.json` - Railway deployment config
- `render.yaml` - Render deployment config
- `docker-compose.yml` - Docker Compose setup
- `ecosystem.config.js` - PM2 configuration

## 🔒 Security Features

- Password hashing with bcryptjs
- Session-based authentication
- Role-based access control
- CORS configuration
- Environment variable protection
- Secure file uploads
- Image compression and validation

## 📱 Progressive Web App

- Offline functionality via Service Worker
- Installable on mobile and desktop
- Cached assets for offline access
- Web App Manifest for native-like experience

## 🎨 UI/UX Features

- Responsive design (mobile-first)
- Dark mode support
- Accessible components (Radix UI)
- Toast notifications
- Loading states and skeletons
- Error handling and validation
- Form validation with real-time feedback

## 📊 Analytics

- Vercel Analytics integration
- Dashboard analytics for admins
- Service statistics
- Field worker performance metrics

## 🤝 Contributing

This is a private project for Ascomp INC. For internal contributions, please follow the existing code style and patterns.

## 📄 License

Proprietary - Ascomp INC

---