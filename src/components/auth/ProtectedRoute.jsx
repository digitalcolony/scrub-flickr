import { Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useAuthStore } from "../../stores/authStore.js";

/**
 * ProtectedRoute - wraps a route and redirects to home when unauthenticated
 */
export function ProtectedRoute({ children }) {
	const { status, user, token, initializeAuth, hasInitialized, initInProgress } = useAuthStore();
	const location = useLocation();

	const isAuthed = status === "authenticated" && !!user && !!token;

	// Debug current guard state
	try {
		console.log("[ROUTE GUARD] state", {
			status,
			hasUser: !!user,
			hasToken: !!token,
			isAuthed,
			initInProgress,
			hasInitialized,
		});
	} catch {
		/* noop */
	}

	// Try to restore session if we're unauthenticated
	useEffect(() => {
		if (!isAuthed && status === "unauthenticated" && !initInProgress && !hasInitialized) {
			try {
				console.log("[ROUTE GUARD] triggering initializeAuth");
			} catch {
				/* noop */
			}
			try {
				initializeAuth();
			} catch {
				/* noop */
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [status, isAuthed, initInProgress, hasInitialized]);

	// While actively authenticating OR before first initialization completes, hold route rather than redirecting
	if (!isAuthed && (status === "authenticating" || initInProgress || !hasInitialized)) {
		try {
			console.log("[ROUTE GUARD] holding route during init/auth or pre-init", {
				status,
				initInProgress,
				hasInitialized,
			});
		} catch {
			/* noop */
		}
		return null;
	}

	if (!isAuthed) {
		// Redirect to home and preserve where we were going
		try {
			console.log("[ROUTE GUARD] redirecting to / (unauthenticated)", { status });
		} catch {
			/* noop */
		}
		return <Navigate to="/" replace state={{ from: location }} />;
	}

	try {
		console.log("[ROUTE GUARD] rendering children (authenticated)");
	} catch {
		/* noop */
	}
	return children;
}
