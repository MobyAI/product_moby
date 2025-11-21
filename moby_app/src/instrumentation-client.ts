if (typeof window !== "undefined") {
  let sentryInitialized = false;

  const isExcludedPath = (path: string) => {
    return (
      path === "/" ||
      path.startsWith("/#") ||
      path === "/blog" ||
      path.startsWith("/blog/")
    );
  };

  const initSentry = async () => {
    if (sentryInitialized) return;

    const Sentry = await import("@sentry/nextjs");

    Sentry.init({
      dsn: "https://40fcd0bd64e5502763362ab491ef7a32@o4510229131821056.ingest.us.sentry.io/4510229150957568",
      integrations: [
        Sentry.replayIntegration({
          unblock: [".sentry-unblock, [data-sentry-unblock]"],
          unmask: [".sentry-unmask, [data-sentry-unmask]"],
        }),
        Sentry.feedbackIntegration({
          colorScheme: "light",
          buttonLabel: "Did something go wrong?",
          submitButtonLabel: "Submit",
          formTitle: "Let us know! We'll look into it right away.",
          messagePlaceholder:
            "What went wrong? Please provide as much detail as you can to help us narrow down the issue.",
          showBranding: false,
          triggerLabel: "Did something go wrong?",
          triggerAriaLabel: "Report error",
          successMessageText: "Thank you for your feedback! 🎉",
        }),
      ],
      tracesSampleRate: 1,
      enableLogs: true,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      debug: false,
    });

    sentryInitialized = true;
  };

  const checkAndInitSentry = () => {
    const currentPath = window.location.pathname;
    if (!isExcludedPath(currentPath) && !sentryInitialized) {
      if ("requestIdleCallback" in window) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).requestIdleCallback(initSentry);
      } else {
        setTimeout(initSentry, 0);
      }
    }
  };

  // Check on initial load
  window.addEventListener("load", () => {
    checkAndInitSentry();
  });

  // Listen for URL changes (works with Next.js client-side navigation)
  let lastPathname = window.location.pathname;

  const observer = new MutationObserver(() => {
    const currentPathname = window.location.pathname;
    if (currentPathname !== lastPathname) {
      lastPathname = currentPathname;
      checkAndInitSentry();
    }
  });

  // Observe changes to the document (Next.js updates the DOM on route changes)
  observer.observe(document, { subtree: true, childList: true });

  // Also listen to popstate for back/forward navigation
  window.addEventListener("popstate", checkAndInitSentry);
}
