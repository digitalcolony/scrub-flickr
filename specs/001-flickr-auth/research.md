# Research: Flickr Authentication Implementation

**Feature**: Flickr Authentication
**Date**: 2025-11-01
**Scope**: OAuth 2.0 implementation patterns, security best practices, React authentication flows

## Research Objectives

1. OAuth 2.0 implementation patterns for client-side applications
2. Flickr API authentication requirements and best practices
3. Secure token storage mechanisms for browser applications
4. React authentication state management patterns
5. Error handling strategies for OAuth flows

## Decisions & Findings

### Decision 1: OAuth 2.0 Flow Type

**Decision**: Authorization Code flow with PKCE (Proof Key for Code Exchange)

**Rationale**:

- PKCE is the recommended security enhancement for public clients (SPAs)
- Protects against authorization code interception attacks
- Flickr API supports PKCE for enhanced security
- Industry standard for client-side web applications

**Alternatives Considered**:

- Implicit flow: Deprecated due to security vulnerabilities
- Client credentials: Not applicable for user authentication

**Implementation Pattern**:

```javascript
// Generate PKCE challenge and verifier
const codeVerifier = generateCodeVerifier();
const codeChallenge = await generateCodeChallenge(codeVerifier);

// Redirect to authorization endpoint
const authUrl =
	`https://www.flickr.com/services/oauth/authorize?` +
	`response_type=code&` +
	`client_id=${clientId}&` +
	`redirect_uri=${redirectUri}&` +
	`code_challenge=${codeChallenge}&` +
	`code_challenge_method=S256&` +
	`perms=delete`;
```

### Decision 2: Token Storage Strategy

**Decision**: Secure localStorage with automatic expiration handling

**Rationale**:

- Provides session persistence across browser tabs/refreshes
- More secure than sessionStorage for long-lived tokens
- Easier to implement than httpOnly cookies for SPA
- Allows for automatic cleanup of expired tokens

**Alternatives Considered**:

- sessionStorage: Loses auth state on tab close
- httpOnly cookies: Requires backend for token management
- In-memory only: Poor UX, loses state on refresh

**Security Measures**:

- Token expiration validation before each API call
- Automatic token refresh when possible
- Clear tokens on logout or security events
- Encrypt sensitive token data if needed

### Decision 3: State Management Pattern

**Decision**: Zustand store with React hooks abstraction

**Rationale**:

- Aligns with constitution requirement for Zustand
- Provides global authentication state
- Simple, predictable state updates
- Easy to test and debug

**Store Structure**:

```javascript
const useAuthStore = create((set, get) => ({
	user: null,
	isAuthenticated: false,
	isLoading: false,
	error: null,
	token: null,

	setUser: (user) => set({ user, isAuthenticated: true }),
	setToken: (token) => set({ token }),
	setLoading: (isLoading) => set({ isLoading }),
	setError: (error) => set({ error }),
	logout: () => set({ user: null, isAuthenticated: false, token: null }),
}));
```

### Decision 4: Error Handling Strategy

**Decision**: Categorized error handling with user-friendly messages

**Rationale**:

- Different error types require different user messaging
- Network errors vs permission denied vs API errors need distinct handling
- Recovery actions vary by error type

**Error Categories**:

1. **Network Errors**: Retry with exponential backoff
2. **Permission Denied**: Explain why permissions are needed
3. **Token Expired**: Automatic refresh attempt, then re-auth
4. **API Errors**: Display specific error from Flickr API
5. **User Cancellation**: Return to initial state gracefully

### Decision 5: Flickr API Integration Approach

**Decision**: Service layer abstraction with axios interceptors

**Rationale**:

- Centralizes API configuration and error handling
- Automatic token attachment to requests
- Rate limiting and retry logic in one place
- Easy to mock for testing

**Service Structure**:

```javascript
class FlickrAuthService {
	constructor(baseURL, clientId) {
		this.client = axios.create({ baseURL });
		this.clientId = clientId;
		this.setupInterceptors();
	}

	async authenticate(authCode, codeVerifier) {
		// Exchange auth code for access token
	}

	async validateToken(token) {
		// Verify token is still valid
	}

	async getUserInfo(token) {
		// Fetch user profile information
	}
}
```

## Implementation Patterns

### Authentication Flow Sequence

1. **Initial Load**: Check localStorage for existing valid token
2. **Login Initiation**: Generate PKCE, redirect to Flickr
3. **Callback Handling**: Extract auth code, exchange for token
4. **Token Storage**: Securely store token and user info
5. **API Requests**: Attach token to all Flickr API calls
6. **Token Validation**: Check expiration before each request
7. **Error Recovery**: Handle various failure scenarios
8. **Logout**: Clear all stored authentication data

### Component Architecture

```
AuthProvider (Context + Zustand)
├── LoginButton (Initiates OAuth flow)
├── AuthCallback (Handles redirect, exchanges code)
├── UserProfile (Displays authenticated user info)
├── AuthError (Shows authentication errors)
└── ProtectedRoute (Guards photo access features)
```

### Security Considerations

1. **PKCE Implementation**: Prevents code interception attacks
2. **State Parameter**: CSRF protection during OAuth flow
3. **Token Validation**: Regular checks for token expiration
4. **Secure Storage**: Proper localStorage handling
5. **Error Information**: Avoid leaking sensitive details in errors

## Technical Dependencies

### Required Libraries

- **crypto-js**: For PKCE code challenge generation
- **axios**: HTTP client with interceptor support
- **zustand**: Global state management
- **react-router-dom**: Route protection for authenticated areas

### Flickr API Requirements

- **Client ID**: Register application with Flickr
- **Permissions**: Request 'delete' permission level for photo management
- **Redirect URI**: Configure callback URL for OAuth flow
- **Rate Limits**: Respect 3600 requests/hour limit

## Testing Strategy

### Unit Tests

- PKCE generation and validation
- Token storage and retrieval
- Error message formatting
- State management actions

### Integration Tests

- Complete OAuth flow simulation
- Token expiration handling
- Network error recovery
- User profile data fetching

### Manual Testing Scenarios

- First-time authentication
- Permission denial handling
- Network failure during auth
- Token expiration mid-session
- Logout and re-authentication

## Performance Considerations

- **Bundle Size**: OAuth libraries add ~15KB to bundle
- **Initial Load**: Token validation adds <500ms to startup
- **Network Requests**: Minimize API calls during auth flow
- **Caching**: Cache user profile data to reduce API calls

## Accessibility Requirements

- **Keyboard Navigation**: All auth buttons accessible via keyboard
- **Screen Readers**: Proper ARIA labels for auth status
- **Error Announcements**: Screen reader compatible error messages
- **Focus Management**: Proper focus handling during redirects

---

**Research Complete**: All implementation decisions documented with rationale and alternatives considered. Ready for Phase 1 design.
