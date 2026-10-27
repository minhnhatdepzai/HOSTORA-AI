"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

type HeadingLevel = "h1" | "h2";
type RevealSegment = {
  text: string;
  emphasis?: boolean;
  breakBefore?: boolean;
};

function graphemes(value: string) {
  if (typeof Intl.Segmenter === "function") {
    return [
      ...new Intl.Segmenter("vi", { granularity: "grapheme" }).segment(value),
    ].map((item) => item.segment);
  }
  return Array.from(value);
}

/** Staggered Vietnamese-safe glyph reveal that starts when the heading enters view. */
export function TextRevealHeading({
  segments,
  level = "h2",
  className,
  delay = 0,
  stagger = 0.022,
}: {
  segments: RevealSegment[];
  level?: HeadingLevel;
  className?: string;
  delay?: number;
  stagger?: number;
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.28 });
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  const Heading = level === "h1" ? motion.h1 : motion.h2;
  const accessibleText = segments.map((segment) => segment.text).join(" ");
  let glyphIndex = 0;

  return (
    <Heading ref={ref} aria-label={accessibleText} className={className}>
      {segments.map((segment, segmentIndex) => {
        const content = segment.text.split(/(\s+)/).map((part, partIndex) => {
          if (/^\s+$/.test(part)) return part;
          const glyphs = graphemes(part).map((glyph, glyphPartIndex) => {
            const order = glyphIndex++;
            return (
              <motion.span
                key={`${segmentIndex}-${partIndex}-${glyphPartIndex}`}
                aria-hidden="true"
                className="text-reveal-glyph"
                initial={{ opacity: 0, y: 18, filter: "blur(4px)" }}
                animate={
                  mounted && (reduceMotion || inView)
                    ? { opacity: 1, y: 0, filter: "blur(0px)" }
                    : { opacity: 0, y: 18, filter: "blur(4px)" }
                }
                transition={{
                  duration: reduceMotion ? 0 : 0.48,
                  delay: reduceMotion ? 0 : delay + order * stagger,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                {glyph}
              </motion.span>
            );
          });
          return (
            <span
              key={`${segmentIndex}-${partIndex}`}
              className="text-reveal-word"
            >
              {glyphs}
            </span>
          );
        });

        return (
          <span
            key={segmentIndex}
            className={segment.emphasis ? "text-reveal-emphasis" : undefined}
          >
            {segment.breakBefore ? <br /> : null}
            {segment.emphasis ? <em>{content}</em> : content}
          </span>
        );
      })}
    </Heading>
  );
}
