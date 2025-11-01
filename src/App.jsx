import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useAuthStore } from "./stores/authStore.js";
import { AuthCallback } from "./components/auth/AuthCallback.jsx";

function HomePage() {
	const { isAuthenticated, user, startAuth, logout, isLoading, error } = useAuthStore();

	return (
		<div className="min-h-screen bg-gray-50 p-8">
			<div className="max-w-4xl mx-auto">
				<h1 className="text-4xl font-bold text-gray-900 mb-8 text-center">Scrub Flickr</h1>

				<div className="bg-white rounded-lg shadow-md p-6 text-center">
					{error && (
						<div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
							<p className="text-red-700">{error.message}</p>
							{error.recoverable && (
								<button
									onClick={startAuth}
									className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
								>
									Try Again
								</button>
							)}
						</div>
					)}

					{isAuthenticated() ? (
						<div>
							<h2 className="text-2xl font-semibold text-gray-800 mb-4">
								Welcome back, {user?.username}!
							</h2>
							<p className="text-gray-600 mb-6">You're successfully connected to Flickr.</p>
							<button
								onClick={logout}
								disabled={isLoading}
								className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
							>
								{isLoading ? "Disconnecting..." : "Disconnect from Flickr"}
							</button>
						</div>
					) : (
						<div>
							<h2 className="text-2xl font-semibold text-gray-800 mb-4">Connect to Flickr</h2>
							<p className="text-gray-600 mb-6">
								Sign in with your Flickr account to access your photos.
							</p>
							<button
								onClick={startAuth}
								disabled={isLoading}
								className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
							>
								{isLoading ? "Connecting..." : "Connect to Flickr"}
							</button>
						</div>
					)}
				</div>

				{/* Development Info */}
				{import.meta.env.DEV && (
					<div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
						<h3 className="font-semibold text-yellow-800 mb-2">Development Info</h3>
						<p className="text-sm text-yellow-700">
							Make sure to set your Flickr API keys in .env.local
						</p>
						<p className="text-sm text-yellow-700">
							Callback URL: {import.meta.env.VITE_FLICKR_CALLBACK_URL}
						</p>
					</div>
				)}
			</div>
		</div>
	);
}

function App() {
	return (
		<Router>
			<Routes>
				<Route path="/" element={<HomePage />} />
				<Route path="/auth/callback" element={<AuthCallback />} />
			</Routes>
		</Router>
	);
}

export default App;
