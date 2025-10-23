# My Mail - Architecture Documentation

## Overview

My Mail is a modern, full-stack email client built entirely on Cloudflare's edge infrastructure, leveraging Workers, D1, KV, and R2 for a globally distributed, high-performance application.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │  React 19 + TypeScript + Vite                      │    │
│  │  - Login/Register UI                               │    │
│  │  - Email List & View                               │    │
│  │  - Compose Email                                   │    │
│  │  - Folder Management                               │    │
│  │  - Contact Management                              │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS/REST API
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Workers                        │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Hono Framework                                    │    │
│  │  - Authentication Routes (/api/auth/*)             │    │
│  │  - Email Routes (/api/emails/*)                    │    │
│  │  - Folder Routes (/api/folders/*)                  │    │
│  │  - Contact Routes (/api/contacts/*)                │    │
│  │  - Webhook Routes (/api/webhook/*)                 │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
         │              │              │              │
         │              │              │              │
         ↓              ↓              ↓              ↓
    ┌────────┐    ┌────────┐    ┌────────┐    ┌────────────┐
    │   D1   │    │   KV   │    │   R2   │    │  Maileroo  │
    │Database│    │ Cache  │    │Storage │    │    API     │
    └────────┘    └────────┘    └────────┘    └────────────┘
```

## Technology Stack

### Frontend
- **React 19**: Modern UI library with hooks and context
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and dev server
- **CSS**: Custom styling with modern CSS features

### Backend
- **Cloudflare Workers**: Serverless edge computing
- **Hono**: Lightweight web framework for Workers
- **TypeScript**: Type-safe API development

### Data Layer
- **D1 (SQLite)**: Relational database for structured data
- **KV**: Key-value store for caching and sessions
- **R2**: Object storage for attachments and raw emails

### External Services
- **Maileroo**: Email sending and receiving API
- **Cloudflare Email Routing**: Inbound email handling

## Database Schema

### Core Tables

#### users
Stores user account information
- Authentication credentials (email, password_hash)
- Email verification status
- Password reset tokens
- Audit timestamps

#### emails
Central email storage
- Email metadata (from, to, subject, dates)
- Email content (plaintext, HTML)
- Flags (read, starred, spam)
- Relationships (folder, thread)
- Security info (SPF, DKIM, DMARC)

#### folders
Email organization
- System folders (inbox, sent, drafts, trash, spam)
- Custom user folders
- Hierarchical structure support
- Visual customization (icon, color)

#### contacts
Contact management
- Contact information (email, name, company)
- Interaction tracking (last_contacted, contact_count)
- Favorites support

#### attachments
Email attachment metadata
- File information (filename, size, type)
- R2 storage references
- Content IDs for inline images

### Supporting Tables

#### labels
Email categorization
- User-defined labels
- Color coding

#### email_filters
Automated email processing
- Condition-based filtering
- Multiple actions support
- Priority ordering

#### user_settings
User preferences
- UI preferences (theme, language)
- Email settings (signature, auto-reply)
- Display options

#### audit_log
Security and compliance
- User action tracking
- IP and user agent logging
- Metadata storage

### Full-Text Search
- **emails_fts**: Virtual FTS5 table for fast email search
- Indexes: subject, body, from, to
- Automatic sync via triggers

## API Architecture

### Authentication Flow

```
1. Registration
   POST /api/auth/register
   ↓
   Create user → Generate verification token → Send email
   ↓
   User clicks verification link
   ↓
   POST /api/auth/verify-email
   ↓
   Mark user as verified

2. Login
   POST /api/auth/login
   ↓
   Verify credentials → Generate JWT → Return token
   ↓
   Client stores token → Include in Authorization header

3. Password Reset
   POST /api/auth/forgot-password
   ↓
   Generate reset token → Send email
   ↓
   User clicks reset link
   ↓
   POST /api/auth/reset-password
   ↓
   Update password → Clear reset token
```

### Email Flow

#### Sending Emails
```
Client → POST /api/emails/send
↓
Worker validates request
↓
Maileroo API sends email
↓
Save to sent folder in D1
↓
Return success
```

#### Receiving Emails
```
Email arrives at domain
↓
Maileroo Inbound Routing
↓
POST /api/webhook/email (webhook)
↓
Validate webhook authenticity
↓
Parse email headers and body
↓
Download attachments → Store in R2
↓
Apply email filters
↓
Save to D1 database
↓
Update contact records
↓
Invalidate cache
```

## Caching Strategy

### KV Cache Usage

1. **Email Lists** (`emails:{userId}:{folderId}`)
   - TTL: 5 minutes
   - Invalidated on: new email, delete, move

2. **Folder Lists** (`folders:{userId}`)
   - TTL: 10 minutes
   - Invalidated on: folder create/update/delete

3. **User Sessions** (`session:{token}`)
   - TTL: 7 days
   - Invalidated on: logout

4. **Search Results** (`search:{userId}:{query}`)
   - TTL: 5 minutes
   - Invalidated on: new email

5. **Contact Lists** (`contacts:{userId}`)
   - TTL: 10 minutes
   - Invalidated on: contact create/update/delete

### Cache Invalidation

- **Write-through**: Update cache immediately after DB write
- **Lazy invalidation**: Delete cache keys on data changes
- **TTL-based**: Automatic expiration for stale data

## Security Architecture

### Authentication
- **JWT Tokens**: Signed with HS256 algorithm
- **Password Hashing**: PBKDF2 with 100,000 iterations
- **Email Verification**: Required for new accounts
- **Password Reset**: Time-limited tokens (1 hour)

### Authorization
- **Middleware**: JWT verification on protected routes
- **User Context**: Attached to request context
- **Resource Ownership**: Verified before operations

### Data Protection
- **SQL Injection**: Prevented via prepared statements
- **XSS**: HTML sanitization on email content
- **CORS**: Configured for frontend domain
- **Rate Limiting**: KV-based request throttling

### Email Security
- **SPF**: Sender Policy Framework validation
- **DKIM**: DomainKeys Identified Mail verification
- **DMARC**: Domain-based Message Authentication
- **Spam Detection**: Maileroo spam filtering

## Performance Optimizations

### Edge Computing
- **Global Distribution**: Workers run in 300+ locations
- **Low Latency**: Sub-50ms response times
- **Auto-scaling**: Handles traffic spikes automatically

### Database Optimization
- **Indexes**: Strategic indexing on frequently queried columns
- **FTS5**: Full-text search for fast email search
- **Prepared Statements**: Query plan caching
- **Batch Operations**: Reduce round trips

### Caching
- **KV Cache**: Reduce database queries
- **Browser Cache**: Static assets cached
- **CDN**: Cloudflare CDN for global delivery

### Storage
- **R2**: Cost-effective object storage
- **Lazy Loading**: Attachments loaded on demand
- **Compression**: Gzip compression for text content

## Scalability

### Horizontal Scaling
- **Stateless Workers**: No server state
- **Distributed Database**: D1 replication
- **Global KV**: Multi-region key-value store
- **R2 Buckets**: Unlimited storage capacity

### Vertical Scaling
- **Worker CPU**: 50ms CPU time per request
- **D1 Limits**: 100k reads/day, 50k writes/day (free tier)
- **KV Limits**: 100k reads/day, 1k writes/day (free tier)
- **R2 Limits**: 10GB storage (free tier)

### Cost Optimization
- **Free Tier**: Generous free tier for all services
- **Pay-as-you-go**: Only pay for what you use
- **No Egress Fees**: R2 has no egress charges
- **Bundled Pricing**: Workers Paid plan includes all services

## Monitoring & Observability

### Logging
- **Worker Logs**: `wrangler tail` for real-time logs
- **Audit Logs**: Database-stored user actions
- **Error Tracking**: Console errors and exceptions

### Metrics
- **Cloudflare Analytics**: Request counts, latency, errors
- **D1 Metrics**: Query performance, storage usage
- **KV Metrics**: Cache hit rates, storage usage
- **R2 Metrics**: Storage usage, bandwidth

### Alerts
- **Error Rates**: Monitor 5xx errors
- **Latency**: Track p95, p99 response times
- **Storage**: Alert on quota limits
- **Security**: Failed login attempts

## Deployment Architecture

### Development
```
Local Machine
↓
npm run dev
↓
Vite Dev Server (Frontend)
+
Wrangler Dev (Workers)
+
Local D1 Database
```

### Production
```
GitHub Repository
↓
npm run build
↓
npm run deploy
↓
Cloudflare Workers
+
D1 Database
+
KV Namespaces
+
R2 Buckets
```

### CI/CD (Optional)
```
GitHub Actions
↓
Run Tests
↓
Build Application
↓
Deploy to Cloudflare
↓
Run Smoke Tests
```

## Future Enhancements

### Planned Features
1. **Email Templates**: Reusable email templates
2. **Email Scheduling**: Send emails at specific times
3. **Calendar Integration**: Meeting invites and events
4. **Team Features**: Shared mailboxes and delegation
5. **Mobile App**: React Native mobile client
6. **Advanced Search**: Filters, date ranges, attachments
7. **Email Signatures**: Rich text signatures
8. **Auto-responders**: Vacation and out-of-office replies
9. **Email Forwarding**: Automatic forwarding rules
10. **Import/Export**: Backup and migration tools

### Technical Improvements
1. **WebSocket Support**: Real-time email updates
2. **Service Worker**: Offline support
3. **Push Notifications**: Browser notifications
4. **Encryption**: End-to-end encryption option
5. **Multi-account**: Support multiple email accounts
6. **OAuth Integration**: Gmail, Outlook integration
7. **Advanced Analytics**: Email tracking and insights
8. **A/B Testing**: Feature experimentation
9. **Performance Monitoring**: APM integration
10. **Automated Testing**: E2E test suite

## Conclusion

My Mail demonstrates a modern, scalable email client architecture built entirely on Cloudflare's edge platform. The combination of Workers, D1, KV, and R2 provides a powerful foundation for building globally distributed applications with excellent performance and developer experience.

