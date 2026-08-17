"use client";

import { useEffect } from "react";

import { appConfig } from "@/lib/config";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[workflow]", {
      context: "app/global-error",
      name: error.name,
      digest: error.digest,
      message: error.message.slice(0, 300),
    });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.75rem",
          padding: "1.5rem",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
        }}
      >
        <p style={{ margin: 0, fontSize: "0.75rem", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {appConfig.name}
        </p>
        <h1 style={{ margin: 0, fontSize: "1.25rem" }}>Something went wrong</h1>
        <p style={{ margin: 0, maxWidth: "24rem", color: "#666", fontSize: "0.875rem" }}>
          The app failed to load. Try again in a moment.
        </p>
        {error.digest ? (
          <p style={{ margin: 0, fontSize: "0.75rem", color: "#888" }}>Reference: {error.digest}</p>
        ) : null}
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: "0.5rem",
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            border: "1px solid #ccc",
            background: "#111",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
