import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ZYRAXON AI — All in One. Anything. Nothing is Impossible." },
      {
        name: "description",
        content:
          "The most powerful free & open-source desktop AI coding agent. 50+ tools, Beast Mode, Screen Vision, Unlimited Memory.",
      },
      { property: "og:title", content: "ZYRAXON AI — Free Desktop AI Coding Agent" },
      {
        property: "og:description",
        content: "50+ tools, Beast Mode, Screen Vision, Unlimited Memory. 100% free & open source.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <iframe
      src="/zyraxon.html"
      title="ZYRAXON AI"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        border: 0,
      }}
    />
  );
}
