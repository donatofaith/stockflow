"use client";

import { useEffect } from "react";

const COLLAPSED_HEIGHT = 220;
const EXPANDED_HEIGHT = 360;

export default function ActivityCollapseController() {
  useEffect(() => {
    let observer: MutationObserver | null = null;

    function findRecentActivityCard() {
      const section = document.getElementById("activity");

      if (!section) {
        return null;
      }

      const heading = Array.from(
        section.querySelectorAll("div")
      ).find(
        (element) =>
          element.textContent?.trim() === "Recent activity"
      );

      return heading?.parentElement ?? null;
    }

    function styleButton(button: HTMLButtonElement) {
      button.type = "button";
      button.dataset.activityToggle = "true";
      button.style.marginTop = "14px";
      button.style.width = "100%";
      button.style.height = "38px";
      button.style.borderRadius = "12px";
      button.style.border = "1px solid rgba(255,255,255,0.07)";
      button.style.background = "rgba(255,255,255,0.025)";
      button.style.color = "rgba(255,255,255,0.58)";
      button.style.fontSize = "10px";
      button.style.fontWeight = "600";
      button.style.letterSpacing = "0.02em";
      button.style.cursor = "pointer";
      button.style.transition = "background 160ms ease, color 160ms ease, border-color 160ms ease";
    }

    function applyCollapse() {
      const card = findRecentActivityCard();

      if (!card) {
        return;
      }

      const content = card.children.item(1) as HTMLElement | null;

      if (!content) {
        return;
      }

      const itemCount = content.children.length;
      let button = card.querySelector(
        "button[data-activity-toggle='true']"
      ) as HTMLButtonElement | null;

      if (itemCount <= 2) {
        content.style.maxHeight = "";
        content.style.overflowY = "";
        content.style.paddingRight = "";

        if (button) {
          button.remove();
        }

        return;
      }

      if (!button) {
        button = document.createElement("button");
        styleButton(button);
        button.textContent = `See more (${itemCount - 2})`;
        button.dataset.expanded = "false";

        button.addEventListener("mouseenter", () => {
          if (!button) return;
          button.style.background = "rgba(255,255,255,0.045)";
          button.style.color = "rgba(255,255,255,0.82)";
          button.style.borderColor = "rgba(255,255,255,0.11)";
        });

        button.addEventListener("mouseleave", () => {
          if (!button) return;
          button.style.background = "rgba(255,255,255,0.025)";
          button.style.color = "rgba(255,255,255,0.58)";
          button.style.borderColor = "rgba(255,255,255,0.07)";
        });

        button.addEventListener("click", () => {
          if (!button) return;

          const expanded = button.dataset.expanded === "true";
          const nextExpanded = !expanded;

          button.dataset.expanded = String(nextExpanded);

          if (nextExpanded) {
            content.style.maxHeight = `${EXPANDED_HEIGHT}px`;
            content.style.overflowY = "auto";
            content.style.paddingRight = "6px";
            button.textContent = "Show less";
          } else {
            content.scrollTop = 0;
            content.style.maxHeight = `${COLLAPSED_HEIGHT}px`;
            content.style.overflowY = "hidden";
            content.style.paddingRight = "0";
            button.textContent = `See more (${Math.max(
              content.children.length - 2,
              1
            )})`;
          }
        });

        card.appendChild(button);
      }

      const expanded = button.dataset.expanded === "true";

      if (expanded) {
        content.style.maxHeight = `${EXPANDED_HEIGHT}px`;
        content.style.overflowY = "auto";
        content.style.paddingRight = "6px";
        button.textContent = "Show less";
      } else {
        content.style.maxHeight = `${COLLAPSED_HEIGHT}px`;
        content.style.overflowY = "hidden";
        content.style.paddingRight = "0";
        button.textContent = `See more (${Math.max(itemCount - 2, 1)})`;
      }
    }

    applyCollapse();

    const section = document.getElementById("activity");

    if (section) {
      observer = new MutationObserver(() => {
        window.requestAnimationFrame(applyCollapse);
      });

      observer.observe(section, {
        childList: true,
        subtree: true,
      });
    }

    const retry = window.setTimeout(applyCollapse, 700);

    return () => {
      observer?.disconnect();
      window.clearTimeout(retry);

      const card = findRecentActivityCard();
      const button = card?.querySelector(
        "button[data-activity-toggle='true']"
      );

      button?.remove();
    };
  }, []);

  return null;
}
