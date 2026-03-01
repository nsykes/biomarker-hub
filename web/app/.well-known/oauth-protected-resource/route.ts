import {
  protectedResourceHandler,
  metadataCorsOptionsRequestHandler,
} from "mcp-handler";
import { getAppUrl } from "@/lib/mcp/url";

const handler = protectedResourceHandler({
  authServerUrls: [getAppUrl()],
  resourceUrl: getAppUrl(),
});

const corsHandler = metadataCorsOptionsRequestHandler();

export { handler as GET, corsHandler as OPTIONS };
