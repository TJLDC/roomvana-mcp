# Roomvana MCP server

An [MCP](https://modelcontextprotocol.io) server for **[Roomvana](https://roomvana.ai)** — AI interior design. It lets an AI assistant browse the room types and design styles Roomvana supports and hand the user a studio link with their choices pre-selected. Upload a photo of any room and get a realistic redesign in about 30 seconds at **[roomvana.ai](https://roomvana.ai)**.

Read-only and no sign-in required: this server never uploads photos or spends credits. The actual redesign happens on the website.

## Tools

| Tool | What it does |
| --- | --- |
| `list_design_styles` | Lists the design styles Roomvana can render (modern, japandi, industrial, coastal, …), each with a short description. |
| `list_room_types` | Lists the rooms and outdoor spaces Roomvana can redesign — interior rooms, house exterior, and garden/patio/backyard. |
| `design_a_room` | Returns a [roomvana.ai](https://roomvana.ai) studio link with the chosen room and style pre-selected; validates both against Roomvana's live catalog. |

## Install

Requires Node.js 18+.

```json
{
  "mcpServers": {
    "roomvana": {
      "command": "npx",
      "args": ["-y", "roomvana-mcp"]
    }
  }
}
```

Add that to your MCP client config (Claude Desktop: `claude_desktop_config.json`; other clients: their MCP config file), then restart the client.

### From source

```bash
npm install
npm run build
npm start
```

## Example

> "I want to redo my bedroom in a japandi style."

The assistant calls `design_a_room` with `room=bedroom`, `style=japandi` and returns:

```
https://roomvana.ai/design?room=bedroom&style=japandi
```

Open it, upload a photo of the room, and generate a redesign. Your walls, windows and layout stay put — only the look changes.

## How it works

The list of supported rooms and styles is fetched live from Roomvana's public catalog endpoint (`https://api.roomvana.co/options`), so the server never offers something Roomvana can't render. If that endpoint is unreachable, it falls back to a bundled snapshot.

## Links

- Website: https://roomvana.ai
- Design studio: https://roomvana.ai/design

## License

MIT
