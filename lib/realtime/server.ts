import { Rest } from "ably";
import type { TokenParams } from "ably";
import type { RealtimeChannel, RealtimeEvent } from "@shared/realtime";

let restClient: Rest | null = null;

function getRestClient(): Rest | null {
  if (!process.env.ABLY_API_KEY) {
    console.warn("[Ably] ABLY_API_KEY is not configured.");
    return null;
  }

  if (!restClient) {
    restClient = new Rest({ key: process.env.ABLY_API_KEY });
  }

  return restClient;
}

async function publish(channelName: RealtimeChannel, event: RealtimeEvent) {
  const client = getRestClient();
  if (!client) return;

  const channel = client.channels.get(channelName);
  await channel.publish(event.type, event);
}

export async function publishEvent(event: RealtimeEvent) {
  await publish("pulse-global", event);
}

export async function publishToUser(userId: number, event: RealtimeEvent) {
  await publish(`user:${userId}`, event);
}

export async function createRealtimeTokenRequest(params: {
  clientId: string;
  capability: TokenParams["capability"];
}) {
  const client = getRestClient();
  if (!client) {
    throw new Error("ABLY_API_KEY is not configured");
  }

  return await client.auth.createTokenRequest({
    clientId: params.clientId,
    capability: params.capability,
  });
}

