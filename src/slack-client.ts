import { slackClient } from "./config";
import { MessageElement, MessagesResult } from "./types";

// Add this function to export the token for file downloads
export function getSlackToken(): string {
  // Return the token from environment or wherever you're storing it
  return process.env.SLACK_TOKEN || '';
}

export async function retrieveMessages(
  channelId: string,
  oldest: number,
  latest: number,
  cursor?: string
): Promise<MessagesResult> {
  let messages: MessageElement[] = [];
  let result = await slackClient.conversations.history({
    channel: channelId,
    oldest: oldest.toString(),
    latest: latest.toString(),
    limit: 1000,
    cursor: cursor,
  });

  if (result.ok && result.messages) {
    messages = result.messages;
  }

  return { messages, result };
}

export async function retrieveThreadMessages(
  channelId: string,
  threadTs: string
): Promise<MessageElement[]> {
  let messages: MessageElement[] = [];
  let result = await slackClient.conversations.replies({
    channel: channelId,
    ts: threadTs,
    limit: 1000,
  });

  if (result.ok && result.messages) {
    messages = result.messages;
  }

  return messages;
}

export async function getUserName(userId: string) {
  const userInfo = await slackClient.users.info({
    user: userId,
  });
  return (
    userInfo.user?.profile?.real_name_normalized ||
    userInfo.user?.profile?.real_name ||
    userInfo.user?.real_name ||
    userInfo.user?.profile?.display_name
  );
}

export async function fetchChannelMessages(channelId: string, date?: string) {
  try {
    // dateの指定があれば、その日付の0時00分から23時59分までのメッセージを取得する
    const dateOldest = date ? new Date(date) : new Date();
    dateOldest.setHours(0, 0, 0, 0);
    const dateLatest = new Date(dateOldest);
    dateLatest.setHours(23, 59, 59, 999);

    let messages: MessageElement[] = [];

    let { messages: _messages, result: _result } = await retrieveMessages(
      channelId,
      dateOldest.getTime() / 1000,
      dateLatest.getTime() / 1000
    );
    messages = messages.concat(_messages);
    let result = _result;

    while (result.has_more) {
      const nextCursor = result.response_metadata?.next_cursor;
      if (!nextCursor) {
        break;
      }
      let { messages: _messages, result: _result } = await retrieveMessages(
        channelId,
        dateOldest.getTime() / 1000,
        dateLatest.getTime() / 1000,
        nextCursor
      );
      result = _result;
      messages = messages.concat(_messages);
    }

    return messages;
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

export async function fetchChannelMessagesForDateRange(
  channelId: string,
  startDate: string,
  endDate: string
): Promise<{ date: string; messages: MessageElement[] }[]> {
  try {
    const results: { date: string; messages: MessageElement[] }[] = [];

    // Convert dates to Date objects
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error("Invalid date format. Use YYYY-MM-DD");
    }

    // Loop through each day in the range
    const current = new Date(start);

    while (current <= end) {
      // Format the current date
      const dateStr = current.toISOString().split("T")[0];
      console.log(`Fetching messages for ${dateStr}...`);

      // Get messages for the current day
      const messages = await fetchChannelMessages(channelId, dateStr);

      if (messages && messages.length > 0) {
        results.push({
          date: dateStr,
          messages: [...messages].reverse(), // Oldest first
        });
      }

      // Move to next day
      current.setDate(current.getDate() + 1);
    }

    return results;
  } catch (error) {
    console.error("Error fetching messages for date range:", error);
    return [];
  }
}
