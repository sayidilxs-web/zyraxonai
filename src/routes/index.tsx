import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ZYRAXON AI — All in One. Anything. Nothing is Impossible." },
      {
        name: "description",
        content:
          "The most powerful free & open-source desktop AI coding agent. 50+ tools, Beast Mode, Screen Vision, Unlimited Memory.",
      },
      { property: "og:title", content: "ZYRAXON AI — All in One. Anything. Nothing is Impossible." },
      {
        property: "og:description",
        content: "The most powerful free & open-source desktop AI coding agent. 50+ tools, Beast Mode, Screen Vision, Unlimited Memory.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  useEffect(() => {
    window.location.replace("/zyraxon.html");
  }, []);
  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#fff", display: "grid", placeItems: "center", fontFamily: "system-ui" }}>
      <p>Loading ZYRAXON-AI…</p>
    </div>
  );
}
