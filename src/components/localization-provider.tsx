"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  LanguageCode,
  supportedLanguages,
  translateText,
} from "@/lib/localization";

type LocalizationContextValue = {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
};

const LocalizationContext = createContext<LocalizationContextValue | null>(null);
const originalText = new WeakMap<Text, string>();
const renderedText = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();
const renderedAttributes = new WeakMap<Element, Map<string, string>>();
const translatableAttributes = ["alt", "aria-label", "placeholder", "title"];

function getSourceValue(
  current: string,
  originals: Map<string, string>,
  rendered: Map<string, string>,
  key: string,
) {
  const knownOriginal = originals.get(key);
  if (knownOriginal === undefined || current !== rendered.get(key)) {
    originals.set(key, current);
    return current;
  }
  return knownOriginal;
}

function translateSubtree(root: Node, language: LanguageCode) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const textNode = node as Text;
    const parent = textNode.parentElement;
    if (
      !parent ||
      parent.closest(
        "script, style, noscript, textarea, [contenteditable='true'], [translate='no']",
      )
    ) {
      continue;
    }

    const current = textNode.nodeValue ?? "";
    const knownOriginal = originalText.get(textNode);
    const source =
      knownOriginal === undefined || current !== renderedText.get(textNode)
        ? current
        : knownOriginal;
    originalText.set(textNode, source);
    const leading = source.match(/^\s*/)?.[0] ?? "";
    const trailing = source.match(/\s*$/)?.[0] ?? "";
    const content = source.slice(leading.length, source.length - trailing.length);
    const translated =
      leading + translateText(content, language) + trailing;
    renderedText.set(textNode, translated);
    if (current !== translated) textNode.nodeValue = translated;
  }

  const elements: Element[] = [];
  if (root instanceof Element) elements.push(root);
  if (
    root instanceof Element ||
    root instanceof Document ||
    root instanceof DocumentFragment
  ) {
    elements.push(...root.querySelectorAll("*"));
  }

  for (const element of elements) {
    let originals = originalAttributes.get(element);
    if (!originals) {
      originals = new Map();
      originalAttributes.set(element, originals);
    }
    let rendered = renderedAttributes.get(element);
    if (!rendered) {
      rendered = new Map();
      renderedAttributes.set(element, rendered);
    }
    for (const attribute of translatableAttributes) {
      const current = element.getAttribute(attribute);
      if (current === null) continue;
      const source = getSourceValue(current, originals, rendered, attribute);
      const translated = translateText(source, language);
      rendered.set(attribute, translated);
      if (current !== translated) element.setAttribute(attribute, translated);
    }
  }
}

function clearGoogleTranslateCookie() {
  document.cookie = "googtrans=; Max-Age=0; path=/";
  document.cookie = `googtrans=; Max-Age=0; path=/; domain=${window.location.hostname}`;
}

export function LocalizationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [language, setLanguageState] = useState<LanguageCode>("en");

  const setLanguage = useCallback((nextLanguage: LanguageCode) => {
    window.localStorage.setItem("milano-language", nextLanguage);
    setLanguageState(nextLanguage);
  }, []);

  useEffect(() => {
    clearGoogleTranslateCookie();
    const savedLanguage = window.localStorage.getItem("milano-language");
    if (
      supportedLanguages.some(({ code }) => code === savedLanguage)
    ) {
      setLanguageState(savedLanguage as LanguageCode);
    }
  }, []);

  useEffect(() => {
    const selected = supportedLanguages.find(({ code }) => code === language);
    if (!selected) return;

    document.documentElement.lang = selected.code;
    document.documentElement.dir = selected.direction;
    if (!document.body) return;

    translateSubtree(document.body, language);
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "characterData" && record.target.parentNode) {
          translateSubtree(record.target.parentNode, language);
        }
        for (const addedNode of record.addedNodes) {
          translateSubtree(addedNode, language);
        }
      }
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: translatableAttributes,
      childList: true,
      characterData: true,
      subtree: true,
    });
    return () => observer.disconnect();
  }, [language]);

  return (
    <LocalizationContext.Provider value={{ language, setLanguage }}>
      {children}
    </LocalizationContext.Provider>
  );
}

export function useLocalization() {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error("LocalizationProvider is missing.");
  }
  return context;
}
