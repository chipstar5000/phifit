"use client";

import { useState, useEffect } from "react";

interface TokenBalanceProps {
  challengeId: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export default function TokenBalance({
  challengeId,
  size = "md",
  showLabel = true,
}: TokenBalanceProps) {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const response = await fetch(`/api/challenges/${challengeId}/tokens/balance`);
        if (!response.ok) {
          throw new Error("Failed to fetch token balance");
        }
        const data = await response.json();
        setBalance(data.balance);
      } catch (err) {
        console.error("Error fetching token balance:", err);
        setError("Failed to load");
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();
  }, [challengeId]);

  const sizeClasses = {
    sm: {
      container: "text-xs px-2 py-1",
      icon: "w-3 h-3",
      text: "text-xs",
    },
    md: {
      container: "text-sm px-3 py-1.5",
      icon: "w-4 h-4",
      text: "text-sm",
    },
    lg: {
      container: "text-base px-4 py-2",
      icon: "w-5 h-5",
      text: "text-base",
    },
  };

  const { container, icon, text } = sizeClasses[size];

  if (loading) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-full ${container} animate-pulse`}
      >
        <svg className={`${icon}`} fill="currentColor" viewBox="0 0 20 20">
          <circle cx="10" cy="10" r="8" opacity="0.3" />
        </svg>
        <span className={text}>...</span>
      </div>
    );
  }

  if (error) {
    return null; // Silently fail to avoid cluttering UI
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-300 text-yellow-900 rounded-full ${container} font-medium`}
    >
      {/* Coin icon */}
      <svg className={`${icon}`} fill="currentColor" viewBox="0 0 20 20">
        <circle
          cx="10"
          cy="10"
          r="8"
          fill="url(#goldGradient)"
          stroke="currentColor"
          strokeWidth="1"
        />
        <defs>
          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FCD34D" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
        </defs>
      </svg>

      {/* Balance */}
      <span className={text}>{balance ?? 0}</span>

      {/* Label */}
      {showLabel && (
        <span className={`${text} font-normal`}>
          {balance === 1 ? "token" : "tokens"}
        </span>
      )}
    </div>
  );
}
