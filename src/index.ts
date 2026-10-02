#!/usr/bin/env node
// Roomvana MCP server — a small, read-only, no-auth server that lets an AI
// agent browse Roomvana's supported room types and design styles and build a
// ready-to-open link into the Roomvana studio (https://roomvana.ai), where the
// actual photo redesign happens. It never uploads images or spends credits;
// image generation stays on the website, behind sign-in.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  SITE_BASE,
  getCatalog,
  designLink,
  styleLabel,
  roomLabel,
} from "./catalog.js";

const server = new McpServer({
  name: "roomvana",
  version: "0.1.1",
});

const FOOTER = `\nGenerate the actual redesign from your photo at ${SITE_BASE} (free to try after signing in with Google).`;

server.tool(
  "list_design_styles",
  "List the interior-design styles Roomvana can render (e.g. modern, japandi, industrial), each with a short description. Use this to pick a `style` for design_a_room.",
  {},
  async () => {
    const cat = await getCatalog();
    const lines = cat.styles.map((id) => `- ${id} — ${styleLabel(id)}`);
    const text =
      `Roomvana supports ${cat.styles.length} design styles:\n\n${lines.join("\n")}` +
      FOOTER;
    return { content: [{ type: "text", text }] };
  },
);

server.tool(
  "list_room_types",
  "List the room and outdoor space types Roomvana can redesign (interior rooms, house exterior, and garden/outdoor spaces). Use this to pick a `room` for design_a_room.",
  {},
  async () => {
    const cat = await getCatalog();
    const section = (title: string, ids: string[]) =>
      ids.length
        ? `${title}:\n${ids.map((id) => `- ${id} — ${roomLabel(id)}`).join("\n")}`
        : "";
    const text =
      [
        section("Interior rooms", cat.rooms),
        section("Exterior", cat.exteriors),
        section("Garden & outdoor", cat.gardens),
      ]
        .filter(Boolean)
        .join("\n\n") + FOOTER;
    return { content: [{ type: "text", text }] };
  },
);

server.tool(
  "design_a_room",
  "Turn a room + style choice into a Roomvana studio link with those options pre-selected. The user opens the link, uploads a photo of the room, and gets an AI redesign. Validates the room and style against Roomvana's live catalog.",
  {
    room: z
      .string()
      .describe("Room or space id, e.g. 'bedroom', 'kitchen', 'backyard'. See list_room_types."),
    style: z
      .string()
      .optional()
      .describe("Optional design style id, e.g. 'japandi', 'modern'. See list_design_styles."),
    notes: z
      .string()
      .optional()
      .describe("Optional free-text notes about the desired look (echoed back to help the user; not encoded in the link)."),
  },
  async ({ room, style, notes }) => {
    const cat = await getCatalog();
    const allRooms = [...cat.rooms, ...cat.exteriors, ...cat.gardens];

    if (!allRooms.includes(room)) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text:
              `"${room}" is not a room Roomvana supports. Call list_room_types for the valid IDs. ` +
              `Interior rooms include: ${cat.rooms.join(", ")}.`,
          },
        ],
      };
    }
    if (style && !cat.styles.includes(style)) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text:
              `"${style}" is not a style Roomvana supports. Call list_design_styles for the valid IDs.`,
          },
        ],
      };
    }

    const link = designLink(room, style);
    const parts = [
      `Roomvana studio link (opens with your choices pre-selected):`,
      link,
      ``,
      `Room: ${room} — ${roomLabel(room)}`,
      style ? `Style: ${style} — ${styleLabel(style)}` : `Style: not set (pick one in the studio)`,
    ];
    if (notes) parts.push(`Notes: ${notes}`);
    parts.push(
      ``,
      `Next: open the link, upload a photo of the room, and generate a redesign. Your walls, windows and layout stay put — only the look changes.`,
    );
    return { content: [{ type: "text", text: parts.join("\n") }] };
  },
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdio transport: never write to stdout (it's the protocol channel).
  console.error("roomvana-mcp server running on stdio");
}

main().catch((err) => {
  console.error("roomvana-mcp fatal:", err);
  process.exit(1);
});
