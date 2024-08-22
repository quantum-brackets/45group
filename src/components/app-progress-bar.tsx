"use client";

import { useEffect } from "react";
import nProgress from "nprogress";

type PushStateInput = [data: any, unused: string, url?: string | URL | null | undefined];

export default function AppProgressBar() {
  useEffect(() => {
    nProgress.configure({ showSpinner: false });

    const handleAnchorClick = (event: MouseEvent) => {
      if (event.ctrlKey || event.metaKey) {
        return;
      }

      const targetUrl = (event.currentTarget as HTMLAnchorElement).href;
      const currentUrl = window.location.href;
      if (targetUrl !== currentUrl) {
        nProgress.start();
      }
    };

    const handleMutation: MutationCallback = () => {
      const anchorElements: NodeListOf<HTMLAnchorElement> = document.querySelectorAll("a[href]");

      anchorElements.forEach((anchor) => anchor.addEventListener("click", handleAnchorClick));
    };

    const mutationObserver = new MutationObserver(handleMutation);

    mutationObserver.observe(document, { childList: true, subtree: true });

    window.history.pushState = new Proxy(window.history.pushState, {
      apply: (target, thisArg, argArray: PushStateInput) => {
        nProgress.done();
        return target.apply(thisArg, argArray);
      },
    });
  });

  return <></>;
}
