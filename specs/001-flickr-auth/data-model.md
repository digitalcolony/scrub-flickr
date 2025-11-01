# Data Model: Flickr Authentication

**Feature**: Flickr Authentication
**Date**: 2025-11-01
**Source**: Derived from functional requirements and research decisions

## Core Entities

### User Session

Represents an authenticated user's connection to the application.

**Fields**:

- `userId` (string): Flickr user NSID (unique identifier)
- `username` (string): Flickr username for display
- `fullName` (string, optional): User's full name from profile
- `profileUrl` (string, optional): URL to user's Flickr profile
- `isAuthenticated` (boolean): Current authentication status
- `authenticatedAt` (timestamp): When authentication was completed
- `lastActivity` (timestamp): Last user activity for session timeout

**Validation Rules**:

- `userId` must be valid Flickr NSID format
- `username` must be non-empty string
- `isAuthenticated` determines access to protected features
- `authenticatedAt` used for session age validation

**State Transitions**:

```
unauthenticated → authenticating → authenticated
authenticated → error (on token validation failure)
authenticated → unauthenticated (on logout)
error → authenticating (on retry)
```

### OAuth Token

Secure credential for accessing user's Flickr account.

**Fields**:

- `accessToken` (string): OAuth access token for API calls
- `tokenSecret` (string): OAuth token secret (OAuth 1.0a requirement)
- `permissions` (string): Granted permission level ('read', 'write', 'delete')
- `expiresAt` (timestamp, optional): Token expiration if available
- `issuedAt` (timestamp): When token was issued
- `refreshToken` (string, optional): For automatic token refresh

**Validation Rules**:

- `accessToken` must be non-empty valid OAuth token
- `tokenSecret` required for OAuth 1.0a signature generation
- `permissions` must be one of Flickr's permission levels
- `expiresAt` used for automatic token refresh triggering

**Security Properties**:

- Tokens stored encrypted in localStorage
- Automatic cleanup on expiration
- Secure transmission only (HTTPS)

### Authentication State

Current status of user's authentication process.

**Fields**:

- `status` (enum): Current authentication state
- `error` (object, optional): Last authentication error
- `isLoading` (boolean): Authentication in progress indicator
- `lastAttempt` (timestamp): Last authentication attempt time
- `retryCount` (number): Number of retry attempts

**Status Values**:

- `unauthenticated`: No valid authentication
- `authenticating`: OAuth flow in progress
- `authenticated`: Successfully authenticated
- `token_expired`: Token needs refresh
- `error`: Authentication failed
- `logout_pending`: Logout in progress

**Error Object Structure**:

```javascript
{
  type: 'network' | 'permission_denied' | 'token_invalid' | 'api_error',
  message: 'User-friendly error description',
  details: 'Technical error details for debugging',
  timestamp: Date.now(),
  recoverable: boolean
}
```

## Relationships

```
User Session (1) ←→ (1) OAuth Token
User Session (1) ←→ (1) Authentication State

Authentication State manages the lifecycle of both User Session and OAuth Token
```

## State Management Schema

### Zustand Store Structure

```javascript
{
  // User Session data
  user: {
    userId: string | null,
    username: string | null,
    fullName: string | null,
    profileUrl: string | null,
    authenticatedAt: timestamp | null,
    lastActivity: timestamp | null
  },

  // OAuth Token data (stored separately in localStorage)
  token: {
    accessToken: string | null,
    tokenSecret: string | null,
    permissions: string | null,
    issuedAt: timestamp | null,
    expiresAt: timestamp | null
  },

  // Authentication State
  auth: {
    status: 'unauthenticated' | 'authenticating' | 'authenticated' | 'token_expired' | 'error' | 'logout_pending',
    isLoading: boolean,
    error: ErrorObject | null,
    lastAttempt: timestamp | null,
    retryCount: number
  }
}
```

### LocalStorage Schema

```javascript
// Key: 'flickr-scrub-auth'
{
  token: {
    accessToken: string,
    tokenSecret: string,
    permissions: string,
    issuedAt: timestamp,
    expiresAt: timestamp | null
  },
  user: {
    userId: string,
    username: string,
    fullName: string | null,
    authenticatedAt: timestamp
  },
  version: string // For future migration compatibility
}
```

## Validation & Business Rules

### Authentication Flow Rules

1. **Token Validation**: Before each API call, verify token hasn't expired
2. **Session Timeout**: Users inactive for >24 hours require re-authentication
3. **Permission Verification**: Ensure token has required permissions for requested actions
4. **Error Retry Logic**: Maximum 3 retry attempts with exponential backoff
5. **Concurrent Auth**: Only one authentication attempt allowed at a time

### Data Persistence Rules

1. **Automatic Cleanup**: Remove expired tokens from localStorage
2. **Secure Storage**: Encrypt sensitive token data before storage
3. **Version Compatibility**: Handle localStorage schema changes gracefully
4. **Privacy Protection**: Clear all data on logout or revoke actions

### Error Handling Rules

1. **Graceful Degradation**: App remains functional during auth errors
2. **User Communication**: All errors have user-friendly messages
3. **Recovery Actions**: Provide clear next steps for error resolution
4. **Logging Limits**: Don't log sensitive authentication data

## Integration Points

### External APIs

- **Flickr OAuth 1.0a**: Token exchange and validation
- **Flickr REST API**: User profile information retrieval

### Internal Services

- **Token Storage Service**: Secure localStorage management
- **Authentication Service**: OAuth flow coordination
- **API Client**: Automatic token attachment to requests

### UI Components

- **LoginButton**: Initiates authentication flow
- **UserProfile**: Displays authenticated user information
- **AuthError**: Shows authentication error states
- **ProtectedRoute**: Conditional rendering based on auth status

---

**Data Model Complete**: All entities, relationships, and validation rules defined. Ready for contract generation.
