import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signIn, signUp, isProfileComplete } from "../api";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (isSignUp && password !== confirmPassword) {
      setError("Passwords do not match!");
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        await signUp(email, password);
        setConfirmationMessage("✅ Check your email to confirm your account!");
      } else {
        try {
          const user = await signIn(email, password);
          if (!user) {
            throw new Error("No user data returned");
          }
          const profileCompleted = await isProfileComplete(user.id);
          navigate(profileCompleted ? "/company-overview" : "/complete-profile");
        } catch (err) {
          console.error("Sign in error:", err);
          setError(err.message);
        }
      }
    } catch (err) {
      setError(err.message);
      console.error("❌ Authentication Error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-10 shadow-md">
        <h2 className="text-center text-3xl font-bold text-gray-900">
          {isSignUp ? "Create an Account" : "Sign In"}
        </h2>
        {confirmationMessage && <p className="text-green-500 text-center">{confirmationMessage}</p>}
        {error && <p className="text-red-500 text-center">{error}</p>}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <input type="email" required className="block w-full p-3 border rounded-md"
            placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" required className="block w-full p-3 border rounded-md"
            placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {isSignUp && (
            <input type="password" required className="block w-full p-3 border rounded-md"
              placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          )}
          <button type="submit" disabled={loading} className="w-full p-3 bg-blue-600 text-white rounded-md">
            {loading ? "Loading..." : isSignUp ? "Sign Up" : "Sign In"}
          </button>
        </form>

        <p className="text-center">
          {isSignUp ? "Already have an account? " : "Don't have an account? "}
          <button onClick={() => setIsSignUp(!isSignUp)} className="text-blue-600">
            {isSignUp ? "Sign In" : "Sign Up"}
          </button>
        </p>
      </div>
    </div>
  );
}

export default Login;