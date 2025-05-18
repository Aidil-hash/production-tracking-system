import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../components/ui/select";

import { motion } from "framer-motion";

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

export default function Register() {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/users`, { name, role, password });
      setSuccess("User registered successfully!");
      setError("");
      setTimeout(() => navigate("/"), 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
      setSuccess("");
    }
  };

  return (
    <motion.div
      className="flex items-center justify-center min-h-screen bg-zinc-900 px-4"
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={pageTransition}
    >
      <div className="bg-zinc-900 text-white flex items-center justify-center px-6">
        <div className="w-[600px] max-w-xl px-10 py-8 bg-zinc-900 rounded-lg shadow-md space-y-6">
        <h2 className="text-2xl font-bold text-center">Register</h2>

        {error && (
          <p className="text-red-500 text-sm text-center font-medium">{error}</p>
        )}
        {success && (
          <p className="text-green-600 text-sm text-center font-medium">{success}</p>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Enter your name"
            />
          </div>

          <div className="space-y-1 relative z-10">
            <Label htmlFor="role">Role</Label>
            <Select onValueChange={(value) => setRole(value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-zinc-900 text-white border border-zinc-700">
              <SelectItem
                value="operator"
                className="hover:bg-orange-600 focus:bg-orange-600 cursor-pointer"
              >
                Operator
              </SelectItem>
              <SelectItem
                value="FG operator"
                className="hover:bg-orange-600 focus:bg-orange-600 cursor-pointer"
              >
                FG Operator
              </SelectItem>
              <SelectItem
                value="leader"
                className="hover:bg-orange-600 focus:bg-orange-600 cursor-pointer"
              >
                Leader
              </SelectItem>
              <SelectItem
                value="supervisor"
                className="hover:bg-orange-600 focus:bg-orange-600 cursor-pointer"
              >
                Supervisor
              </SelectItem>
              <SelectItem
                value="engineer"
                className="hover:bg-orange-600 focus:bg-orange-600 cursor-pointer"
              >
                Engineer
              </SelectItem>
            </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-orange-600 hover:bg-orange-700 text-white"
          >
            Register
          </Button>
        </form>

        <div className="text-center">
          <Link
            to="/"
            className="inline-block mt-4 text-sm text-orange-600 hover:underline"
          >
            ← Return to Login
          </Link>
        </div>
      </div>
    </div>
    </motion.div>
    
  );
}
