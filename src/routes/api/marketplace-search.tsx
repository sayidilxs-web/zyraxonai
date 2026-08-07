/**
 * ZYRAXON AI — Marketplace Search API
 * 
 * API route for searching VS Code Marketplace and Open VSX.
 * This route handles the actual API calls to the external marketplaces
 * and returns the data to the frontend.
 */

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/marketplace-search")({
  server: {
    handler: async ({ request }) => {
      const url = new URL(request.url);
      const query = url.searchParams.get("query") || "";
      const category = url.searchParams.get("category") || "";
      const sortBy = url.searchParams.get("sortBy") || "Installs";
      const pageSize = parseInt(url.searchParams.get("pageSize") || "50");
      const source = url.searchParams.get("source") || "marketplace";

      const VSCODE_MARKETPLACE_API = "https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery";
      const OPEN_VSX_API = "https://open-vsx.org/api";

      try {
        if (source === "openvsx") {
          const openVSXResponse = await fetch(
            `${OPEN_VSX_API}/search?query=${encodeURIComponent(query)}&size=${pageSize}`,
            { headers: { Accept: "application/json" } }
          );
          if (openVSXResponse.ok) {
            const data = await openVSXResponse.json();
            return Response.json({ success: true, source: "openvsx", data });
          }
        }

        // VS Code Marketplace
        const criteria = [
          { filterType: 8, value: "Microsoft.VisualStudio.Code" },
        ];
        if (query) {
          criteria.push({ filterType: 10, value: query });
        }
        if (category) {
          criteria.push({ filterType: 12, value: category });
        }

        const body = {
          assetTypes: [],
          filters: [{
            criteria,
            direction: 2,
            pageSize,
            pageNumber: 1,
            sortBy: sortBy === "Installs" ? 4 : sortBy === "Rating" ? 12 : sortBy === "LastUpdated" ? 8 : 6,
            sortOrder: 0,
          }],
          flags: 0x192,
        };

        const response = await fetch(VSCODE_MARKETPLACE_API, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json;api-version=6.1-preview.1",
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          return Response.json({ error: `Marketplace API error: ${response.status}` }, { status: 500 });
        }

        const data = await response.json();
        return Response.json({ success: true, source: "marketplace", data });
      } catch (error) {
        console.error("Marketplace search error:", error);
        return Response.json({ error: "Internal server error" }, { status: 500 });
      }
    },
  },
});
