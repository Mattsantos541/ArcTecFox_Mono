import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import SEO from '../components/SEO';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export default function ApprovedSignup() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const token = searchParams.get('token');

  const [userDetails, setUserDetails] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
      return;
    }
  }, [user, navigate]);

  // Verify token on load
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError('No signup token provided');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${BACKEND_URL}/api/verify-signup-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ token })
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.detail || 'Invalid signup token');
        }

        setUserDetails(result);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/complete-approved-signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token,
          email: userDetails.email,
          password
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || 'Failed to create account');
      }

      // Account created successfully, redirect to login
      navigate('/login?message=account_created&email=' + encodeURIComponent(userDetails.email));

    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <>
        <SEO
          title="Setting up your account"
          description="Setting up your approved account"
          noindex={true}
        />
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Verifying your invitation...</p>
          </div>
        </div>
      </>
    );
  }

  if (error && !userDetails) {
    return (
      <>
        <SEO
          title="Invalid invitation"
          description="Invalid or expired invitation link"
          noindex={true}
        />
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-gray-900 mb-2">Invalid Invitation</h1>
              <p className="text-gray-600 mb-6">{error}</p>
              <button
                onClick={() => navigate('/')}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                Return to Home
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO
        title="Complete your account setup"
        description="Complete your approved account setup"
        noindex={true}
      />
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">Welcome to ArcTecFox!</h1>
            <p className="text-gray-600">Your access has been approved. Complete your account setup below.</p>
          </div>

          {userDetails && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-blue-900 mb-2">Account Details</h3>
              <div className="space-y-1 text-sm text-blue-800">
                <p><strong>Name:</strong> {userDetails.full_name}</p>
                <p><strong>Email:</strong> {userDetails.email}</p>
                <p><strong>Company:</strong> {userDetails.company_name}</p>
                <p><strong>Role:</strong> {userDetails.role_name}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Create Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your password"
                required
                minLength={6}
              />
              <p className="text-xs text-gray-500 mt-1">Must be at least 6 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Confirm your password"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Creating Account...' : 'Create My Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              By creating an account, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </div>
    </>
  );
}