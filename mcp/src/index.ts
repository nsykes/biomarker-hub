#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { BiomarkerHubClient } from "./client.js";
import { registerBiomarkerTools } from "./tools/biomarkers.js";
import { registerReportTools } from "./tools/reports.js";
import { registerRegistryTools } from "./tools/registry.js";
import { registerTrendTools } from "./tools/trends.js";
import { registerPrompts } from "./prompts/index.js";
import { registerResources } from "./resources/index.js";

const server = new McpServer({
  name: "biomarker-hub",
  version: "0.1.0",
});

const client = new BiomarkerHubClient();

registerBiomarkerTools(server, client);
registerReportTools(server, client);
registerRegistryTools(server, client);
registerTrendTools(server, client);
registerPrompts(server);
registerResources(server, client);

const transport = new StdioServerTransport();
await server.connect(transport);
