import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { motion } from "framer-motion";
import { toast } from "sonner";

const pageVariants = {
  initial: { opacity: 0, x: 100 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -100 },
};

const pageTransition = {
  type: "tween",
  ease: "easeInOut",
  duration: 0.4,
};


export default function Login() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        `${API_URL}/api/auth/login`,
        { name, password },
        {
          timeout: 5000,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.urole);
      localStorage.setItem("userName", res.data.name); // Add username storage
      navigate("/dashboard");
    } catch (err) {
      if (err.code === "ECONNABORTED") {
        toast.error("Connection timeout. Please check your network.");
      } else if (!err.response) {
        toast.error("Network error. Please check if the server is running.");
      } else {
        toast.error(err.response?.data?.message || "Login failed");
      }
    }
  };

  return (
    <motion.div
      className="flex items-center justify-center min-h-screen bg-zinc-900"
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={pageTransition}
    >
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-2">
      {/* Left side - Form */}
      <div className="bg-zinc-900 text-white flex items-center justify-center px-6">
        <div className="w-full max-w-md space-y-6">
          <h1 className="text-2xl font-bold text-center">Login to your account</h1>
          <p className="text-sm text-center text-muted-foreground">
            Enter your user name below to login to your account
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email">User Name</Label>
              <Input
                id="Name"
                placeholder="User Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Password"
              />
            </div>

            <button
                type="submit"
                className="w-full py-2 font-semibold text-white bg-orange-600 rounded-md hover:bg-orange-700"
                onClick={handleLogin}
              >
                Login
              </button>
          </form>
          <div className="text-center text-sm text-muted-foreground">
            <Link to="/performance" className="hover:underline underline-offset-4">
              Click to see Line Performance Chart
            </Link>
          </div>
        </div>
      </div>

      {/* Right side - Image */}
      <div className="hidden md:block">
        <img
          src="roland-logo.png" // 👈 Replace this path with your own image
          alt="Login visual"
          className="h-full w-full object-cover"
        />
      </div>
    </div>
    </motion.div>
    
  );
}
