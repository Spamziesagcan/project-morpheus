"use client";

import React from "react";

const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "+14155238886";

const whatsappLink =
  WHATSAPP_NUMBER && WHATSAPP_NUMBER.trim().length > 0
    ? `https://wa.me/${encodeURIComponent(
        WHATSAPP_NUMBER.replace("+", "")
      )}?text=${encodeURIComponent(
        "Hi, I’d like career guidance about jobs and my skills."
      )}`
    : null;

export function WhatsAppFab() {
  if (!whatsappLink) return null;

  return (
    <a
      href={whatsappLink}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#1ebe57] shadow-xl transition-transform transform hover:scale-105"
      aria-label="Chat with Career Counselor on WhatsApp"
      title="Chat with Career Counselor on WhatsApp"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 32 32"
        className="w-8 h-8 text-white"
      >
        <path
          fill="currentColor"
          d="M16 3C9.383 3 4 8.383 4 15c0 2.11.553 4.064 1.512 5.78L4 29l8.42-1.48A11.86 11.86 0 0 0 16 27c6.617 0 12-5.383 12-12S22.617 3 16 3zm0 2c5.535 0 10 4.465 10 10s-4.465 10-10 10a9.82 9.82 0 0 1-3.93-.812l-.28-.12-4.92.863.86-4.78-.145-.246A9.77 9.77 0 0 1 6 15c0-5.535 4.465-10 10-10zm-4.314 5.002a1.01 1.01 0 0 0-.707.34c-.2.23-.73.715-.73 1.742c0 1.027.75 2.02.854 2.164c.105.145 1.48 2.36 3.59 3.32c1.78.79 2.14.72 2.52.68c.38-.04 1.24-.505 1.416-.994c.176-.49.176-.91.123-.998c-.052-.09-.2-.145-.417-.25c-.218-.11-1.29-.64-1.49-.713c-.2-.07-.345-.11-.49.11c-.145.22-.56.713-.687.86c-.126.145-.253.16-.47.055c-.218-.11-.92-.34-1.753-1.085c-.648-.58-1.085-1.296-1.212-1.515c-.126-.22-.013-.338.095-.447c.098-.097.218-.25.327-.376c.108-.126.145-.214.218-.36c.073-.145.036-.27-.018-.376c-.055-.11-.49-1.21-.69-1.66c-.18-.43-.36-.37-.49-.38z"
        />
      </svg>
    </a>
  );
}

