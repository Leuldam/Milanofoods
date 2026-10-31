"use client";

import { useEffect, useRef, useState } from "react";
import { LanguageCode, supportedLanguages } from "@/lib/localization";
import { useLocalization } from "./localization-provider";

function LanguageFlag({ language }: { language: LanguageCode }) {
  const flagProps = {
    "aria-hidden": true,
    className: "language-picker-flag",
    viewBox: "0 0 60 30",
    xmlns: "http://www.w3.org/2000/svg",
    translate: "no" as const,
  };

  if (language === "en") {
    return (
      <svg {...flagProps}>
        <rect width="60" height="30" fill="#012169" />
        <path d="M0 0 60 30M60 0 0 30" stroke="#fff" strokeWidth="7" />
        <path d="M0 0 60 30M60 0 0 30" stroke="#c8102e" strokeWidth="3" />
        <path d="M30 0v30M0 15h60" stroke="#fff" strokeWidth="11" />
        <path d="M30 0v30M0 15h60" stroke="#c8102e" strokeWidth="6" />
      </svg>
    );
  }

  if (language === "am") {
    return (
      <svg {...flagProps}>
        <rect width="60" height="10" fill="#078930" />
        <rect y="10" width="60" height="10" fill="#fedd00" />
        <rect y="20" width="60" height="10" fill="#da121a" />
        <circle cx="30" cy="15" r="7" fill="#0f47af" />
        <path d="m30 9 1.8 4h4.4l-3.5 2.6 1.3 4.2-4-2.5-4 2.5 1.3-4.2-3.5-2.6h4.4z" fill="#fedd00" />
      </svg>
    );
  }

  if (language === "ar") {
    return (
      <svg {...flagProps}>
        <rect width="60" height="30" fill="#006c35" />
        <text
          x="30"
          y="13"
          fill="#fff"
          fontSize="5"
          textAnchor="middle"
          direction="rtl"
        >
          لا إله إلا الله محمد رسول الله
        </text>
        <path d="M13 21h34l-3 2H17l-4-2Zm7-2v4m20-4v4" fill="#fff" />
      </svg>
    );
  }

  return (
    <svg {...flagProps}>
      <rect width="20" height="30" fill="#0055a4" />
      <rect x="20" width="20" height="30" fill="#fff" />
      <rect x="40" width="20" height="30" fill="#ef4135" />
    </svg>
  );
}

export function LanguageSelector() {
  const { language, setLanguage } = useLocalization();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected =
    supportedLanguages.find(({ code }) => code === language) ??
    supportedLanguages[0];

  useEffect(() => {
    function closeOnOutsideClick(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  function chooseLanguage(nextLanguage: LanguageCode) {
    setLanguage(nextLanguage);
    setOpen(false);
  }

  return (
    <div className="language-picker" ref={rootRef}>
      <button
        aria-controls="milano-language-options"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Language: ${selected.name}`}
        className="language-picker-trigger"
        onClick={() => setOpen((isOpen) => !isOpen)}
        title={selected.name}
        type="button"
      >
        <LanguageFlag language={selected.code} />
      </button>
      {open && (
        <div
          className="language-picker-menu"
          id="milano-language-options"
          role="listbox"
          aria-label="Choose language"
        >
          {supportedLanguages.map((option) => (
            <button
              aria-label={option.name}
              aria-selected={language === option.code}
              className="language-picker-option"
              key={option.code}
              onClick={() => chooseLanguage(option.code)}
              role="option"
              title={option.name}
              type="button"
            >
              <LanguageFlag language={option.code} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
