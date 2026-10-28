"use client";

import { useEffect } from "react";

/** Scroll rhythm shared by public pages; content stays visible without JavaScript. */
export function EditorialScrollMotion({ page }: { page: "home" | "studio" }) {
  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    void Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(
      ([gsapModule, triggerModule]) => {
        if (cancelled) return;
        const gsap = gsapModule.gsap;
        const ScrollTrigger = triggerModule.ScrollTrigger;
        gsap.registerPlugin(ScrollTrigger);
        const scope = document.querySelector<HTMLElement>(
          page === "home" ? ".hostora-home" : ".studio-page",
        );
        if (!scope) return;
        const media = gsap.matchMedia();
        media.add("(prefers-reduced-motion: no-preference)", () => {
          const headings = scope.querySelectorAll<HTMLElement>(
            page === "home" ? ".home-story h2" : ".studio-hero-copy",
          );
          headings.forEach((heading) => {
            gsap.from(heading, {
              y: 20,
              opacity: 0,
              duration: 0.65,
              ease: "power2.out",
              scrollTrigger: { trigger: heading, start: "top 90%", once: true },
            });
          });
          const progress = document.querySelector<HTMLElement>(
            ".cinema-scroll-progress > span",
          );
          if (progress) {
            gsap.fromTo(
              progress,
              { scaleX: 0 },
              {
                scaleX: 1,
                ease: "none",
                scrollTrigger: {
                  trigger: scope,
                  start: "top top",
                  end: "bottom bottom",
                  scrub: 0.2,
                },
              },
            );
          }
          if (page === "home") {
            const chapterDetails = scope.querySelectorAll<HTMLElement>(
              ".app-editorial-copy > p:not(.commerce-kicker), .app-editorial-copy > a, .app-specimen, .home-studio-grid > div:first-child > p, .home-studio-demo, .commerce-section-heading > p, .plan-rail-caption, .home-payment-fast .commerce-shell > *, .home-journal-intro > p, .home-journal-links > a",
            );
            chapterDetails.forEach((element) => {
              gsap.from(element, {
                y: 24,
                opacity: 0,
                duration: 0.8,
                ease: "power2.out",
                scrollTrigger: { trigger: element, start: "top 92%", once: true },
              });
            });
            gsap.from(scope.querySelectorAll(".home-quick-grid > *"), {
              y: 18,
              opacity: 0,
              duration: 0.55,
              stagger: 0.08,
              ease: "power2.out",
              scrollTrigger: {
                trigger: scope.querySelector(".home-quick-grid"),
                start: "top 86%",
                once: true,
              },
            });
            const icons = scope.querySelectorAll<HTMLElement>(
              ".home-quick-grid > a > svg, .plan-card li > svg, .home-journal-links svg, .home-studio-demo aside small",
            );
            icons.forEach((icon) => {
              gsap.from(icon, {
                scale: 0.55,
                rotate: -18,
                opacity: 0,
                duration: 0.55,
                ease: "back.out(1.7)",
                scrollTrigger: {
                  trigger: icon,
                  start: "top 92%",
                  once: true,
                },
              });
            });
          }
        });
        cleanup = () => media.revert();
      },
    );
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [page]);
  return (
    <div className="cinema-scroll-progress" aria-hidden="true">
      <span />
    </div>
  );
}
