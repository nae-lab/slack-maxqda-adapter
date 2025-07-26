import { WebClient } from '@slack/web-api';

let slackClient: WebClient | null = null;

/**
 * Initialize the Slack client with the provided token
 */
export function initializeSlackClient(token: string): WebClient {
  slackClient = new WebClient(token);
  return slackClient;
}

/**
 * Get the initialized Slack client
 */
export function getSlackClient(): WebClient {
  if (!slackClient) {
    throw new Error('Slack client not initialized. Call initializeSlackClient() first.');
  }
  return slackClient;
}

/**
 * Check if the Slack client is initialized
 */
export function isSlackClientInitialized(): boolean {
  return slackClient !== null;
}