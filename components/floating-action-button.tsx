"use client";

import Link from "next/link";

interface FloatingActionButtonProps {
  href: string;
  label: string;
  icon?: React.ReactNode;
}

export default function FloatingActionButton({
  href,
  label,
  icon,
}: FloatingActionButtonProps) {
  return (
    <Link
      href={href}
      className="md:hidden fixed bottom-6 right-6 z-30 flex items-center justify-center w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 active:scale-95 transition-all duration-200"
      aria-label={label}
      title={label}
    >
      {icon || (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
      )}
    </Link>
  );
}
