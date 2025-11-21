if (typeof window !== "undefined") {
  const path = window.location.pathname;
  const isExcluded =
    path === "/" ||
    path.startsWith("/#") ||
    path === "/blog" ||
    path.startsWith("/blog/");

  if (!isExcluded) {
    window.addEventListener("load", () => {
      const init = async () => {
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
      };

      if ("requestIdleCallback" in window) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).requestIdleCallback(init);
      } else {
        setTimeout(init, 2000);
      }
    });
  }
}
