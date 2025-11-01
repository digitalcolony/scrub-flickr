# Authentication Service Contracts

**Feature**: Flickr Authentication
**Date**: 2025-11-01
**Type**: Service Layer API Contracts

## Authentication Service Interface

### FlickrAuthService

Primary service for handling OAuth authentication with Flickr.

#### `initiateAuth(options: AuthOptions): Promise<string>`

Initiates the OAuth authentication flow by generating PKCE parameters and returning the authorization URL.

**Parameters**:

```typescript
interface AuthOptions {
	permissions?: "read" | "write" | "delete"; // Default: 'delete'
	state?: string; // CSRF protection, auto-generated if not provided
}
```

**Returns**: Authorization URL string for redirect

**Behavior**:

- Generates PKCE code verifier and challenge
- Stores verifier in sessionStorage for callback
- Returns Flickr authorization URL with parameters

**Example**:

```javascript
const authUrl = await authService.initiateAuth({ permissions: "delete" });
window.location.href = authUrl;
```

#### `completeAuth(authCode: string, state: string): Promise<AuthResult>`

Completes the OAuth flow by exchanging authorization code for access token.

**Parameters**:

- `authCode`: Authorization code from callback URL
- `state`: State parameter for CSRF verification

**Returns**:

```typescript
interface AuthResult {
	success: boolean;
	user?: UserSession;
	token?: OAuthToken;
	error?: AuthError;
}
```

**Behavior**:

- Validates state parameter matches stored value
- Exchanges auth code for access token using PKCE verifier
- Fetches user profile information
- Stores token and user data securely

#### `validateToken(token: OAuthToken): Promise<boolean>`

Validates if the stored token is still valid and active.

**Parameters**: OAuthToken object from storage

**Returns**: Boolean indicating token validity

**Behavior**:

- Makes test API call to verify token
- Checks token expiration if available
- Returns false for any validation failure

#### `refreshToken(token: OAuthToken): Promise<OAuthToken | null>`

Attempts to refresh an expired token (if supported by Flickr).

**Parameters**: Current expired token

**Returns**: New token or null if refresh not possible

**Note**: Flickr OAuth 1.0a may not support token refresh

#### `logout(): Promise<void>`

Logs out the user and cleans up authentication data.

**Behavior**:

- Clears stored tokens from localStorage
- Resets authentication state
- Optionally revokes token with Flickr (if supported)

## Token Storage Service Interface

### TokenStorageService

Handles secure storage and retrieval of authentication tokens.

#### `storeToken(token: OAuthToken, user: UserSession): void`

Securely stores authentication token and user data.

**Parameters**:

- `token`: OAuth token to store
- `user`: User session data

**Behavior**:

- Encrypts sensitive token data
- Stores in localStorage with versioning
- Sets automatic cleanup for expired tokens

#### `retrieveToken(): { token: OAuthToken | null, user: UserSession | null }`

Retrieves stored authentication data.

**Returns**: Token and user data or null if not found/expired

**Behavior**:

- Validates stored data format and version
- Checks token expiration
- Returns null for invalid/expired data

#### `clearToken(): void`

Removes all stored authentication data.

**Behavior**:

- Removes all auth-related localStorage entries
- Clears any cached authentication state

## Error Handling Contracts

### AuthError Interface

```typescript
interface AuthError {
	type: "network" | "permission_denied" | "token_invalid" | "api_error" | "user_cancelled";
	message: string; // User-friendly message
	details?: string; // Technical details for debugging
	recoverable: boolean; // Can user retry?
	retryAfter?: number; // Seconds to wait before retry
}
```

### Error Types & Messages

#### Network Errors

```javascript
{
  type: 'network',
  message: 'Unable to connect to Flickr. Please check your internet connection and try again.',
  recoverable: true,
  retryAfter: 5
}
```

#### Permission Denied

```javascript
{
  type: 'permission_denied',
  message: 'Flickr permissions are required to access your photos. Please grant access to continue.',
  recoverable: true
}
```

#### Token Invalid

```javascript
{
  type: 'token_invalid',
  message: 'Your session has expired. Please sign in again.',
  recoverable: true
}
```

#### API Errors

```javascript
{
  type: 'api_error',
  message: 'Authentication failed. Please try again or contact support if the problem persists.',
  details: 'Flickr API returned: Invalid signature',
  recoverable: true
}
```

## State Management Contracts

### Authentication Store Actions

#### `setUser(user: UserSession): void`

Sets authenticated user data and updates authentication state.

#### `setToken(token: OAuthToken): void`

Stores OAuth token and marks user as authenticated.

#### `setLoading(isLoading: boolean): void`

Updates loading state during authentication operations.

#### `setError(error: AuthError | null): void`

Sets authentication error or clears existing error.

#### `logout(): void`

Clears user session and authentication data.

#### `incrementRetryCount(): void`

Tracks authentication retry attempts.

#### `resetRetryCount(): void`

Resets retry counter after successful authentication.

### Authentication Store Selectors

#### `isAuthenticated(): boolean`

Returns true if user is currently authenticated with valid token.

#### `getUser(): UserSession | null`

Returns current authenticated user data.

#### `getAuthStatus(): AuthStatus`

Returns current authentication status.

#### `getLastError(): AuthError | null`

Returns the most recent authentication error.

#### `canRetry(): boolean`

Returns true if authentication can be retried (under retry limit).

## Component Props Contracts

### LoginButton Props

```typescript
interface LoginButtonProps {
	onLoginStart?: () => void;
	onLoginSuccess?: (user: UserSession) => void;
	onLoginError?: (error: AuthError) => void;
	disabled?: boolean;
	className?: string;
	children?: React.ReactNode;
}
```

### UserProfile Props

```typescript
interface UserProfileProps {
	user: UserSession;
	onLogout?: () => void;
	showFullProfile?: boolean;
	className?: string;
}
```

### AuthError Props

```typescript
interface AuthErrorProps {
	error: AuthError;
	onRetry?: () => void;
	onDismiss?: () => void;
	className?: string;
}
```

## Testing Contracts

### Mock Service Interfaces

Services must be mockable for testing with these interfaces:

```typescript
interface MockAuthService {
	mockSuccessfulAuth(user: UserSession, token: OAuthToken): void;
	mockAuthError(error: AuthError): void;
	mockTokenExpired(): void;
	reset(): void;
}

interface MockTokenStorage {
	mockStoredToken(token: OAuthToken, user: UserSession): void;
	mockNoStoredToken(): void;
	reset(): void;
}
```

---

**API Contracts Complete**: All service interfaces, error handling, and component contracts defined for authentication feature.
