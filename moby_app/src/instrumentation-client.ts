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
        const Sentry = await import("@sentry/nextjs"); // 🔥 dynamic import here

        Sentry.init({
          dsn: "https://40fcd0bd64e5502763362ab491ef7a32@o4510229131821056.ingest.us.sentry.io/4510229150957568",
          integrations: [
            Sentry.replayIntegration(),
            Sentry.feedbackIntegration({
              colorScheme: "light",
              buttonLabel: "Report",
              submitButtonLabel: "Submit",
              formTitle: "Submit Report",
              showBranding: false,
              triggerLabel: "Report",
              triggerAriaLabel: "Report",
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
