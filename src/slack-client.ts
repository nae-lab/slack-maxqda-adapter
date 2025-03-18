import { slackClient } from "./config";
import { MessageElement, MessagesResult } from "./types";

// Add this function to export the token for file downloads
export function getSlackToken(): string {
  // Return the token from environment or wherever you're storing it
  return process.env.SLACK_API_TOKEN || "";
}

export async function retrieveMessages(
  channelId: string,
  oldest: number,
  latest: number,
  cursor?: string
): Promise<MessagesResult> {
  try {
    const result = await slackClient.conversations.history({
      channel: channelId,
      oldest: oldest.toString(),
      latest: latest.toString(),
      limit: 999,
      cursor: cursor,
    });
    if (result.ok && result.messages) {
      return { messages: result.messages, result };
    } else {
      return { messages: [], result };
    }
  } catch (error: any) {
    throw error;
  }
}

export async function retrieveThreadMessages(
  channelId: string,
  threadTs: string
): Promise<MessageElement[]> {
  try {
    const result = await slackClient.conversations.replies({
      channel: channelId,
      ts: threadTs,
      limit: 1000,
    });
    if (result.ok && result.messages) {
      return result.messages;
    } else {
      return [];
    }
  } catch (error: any) {
    throw error;
  }
}

export async function getUserName(userId: string | undefined) {
  if (!userId) {
    return "Unknown User";
  }

  const userInfo = await slackClient.users.info({
    user: userId,
  });
  return (
    userInfo.user?.profile?.real_name_normalized ||
    userInfo.user?.profile?.real_name ||
    userInfo.user?.real_name ||
    userInfo.user?.profile?.display_name ||
    userId
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
    // Convert dates to Date objects
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error("Invalid date format. Use YYYY-MM-DD");
    }

    // 日付の範囲全体に対して一度にメッセージを取得
    const startOldest = new Date(start);
    startOldest.setHours(0, 0, 0, 0);
    const endLatest = new Date(end);
    endLatest.setHours(23, 59, 59, 999);

    console.log(`Fetching all messages from ${startDate} to ${endDate}...`);

    // すべてのメッセージを一括取得
    let allMessages: MessageElement[] = [];
    let hasMore = true;
    let cursor: string | undefined;

    while (hasMore) {
      const { messages, result } = await retrieveMessages(
        channelId,
        startOldest.getTime() / 1000,
        endLatest.getTime() / 1000,
        cursor
      );

      if (messages) {
        allMessages = allMessages.concat(messages);
      }

      hasMore = !!result.has_more;
      cursor = result.response_metadata?.next_cursor;

      if (!cursor) {
        hasMore = false;
      }
    }

    console.log(`Retrieved ${allMessages.length} messages in total.`);

    // 取得したメッセージを日付ごとに分類
    const messagesByDate: Record<string, MessageElement[]> = {};

    // 日付範囲内のすべての日付を初期化
    const current = new Date(start);
    while (current <= end) {
      // ローカルタイムゾーンでの日付を取得
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, "0");
      const day = String(current.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;

      messagesByDate[dateStr] = [];
      current.setDate(current.getDate() + 1);
    }

    // メッセージを日付ごとに仕分け
    for (const message of allMessages) {
      if (message.ts) {
        const timestamp = parseFloat(message.ts) * 1000;
        const messageDate = new Date(timestamp);

        // ローカルタイムゾーンでの日付を取得
        const year = messageDate.getFullYear();
        const month = String(messageDate.getMonth() + 1).padStart(2, "0");
        const day = String(messageDate.getDate()).padStart(2, "0");
        const dateStr = `${year}-${month}-${day}`;

        // 指定された日付範囲内のメッセージのみを追加
        if (messagesByDate[dateStr] !== undefined) {
          messagesByDate[dateStr].push(message);
        }
      }
    }

    // 結果を整形
    const results: { date: string; messages: MessageElement[] }[] = [];

    Object.entries(messagesByDate).forEach(([date, messages]) => {
      if (messages.length > 0) {
        // メッセージを時刻順（古い順）に並べ替え
        const sortedMessages = [...messages].sort((a, b) => {
          return (a.ts ? parseFloat(a.ts) : 0) - (b.ts ? parseFloat(b.ts) : 0);
        });

        results.push({
          date,
          messages: sortedMessages,
        });
      }
    });

    // 日付順に並べ替え
    results.sort((a, b) => a.date.localeCompare(b.date));

    return results;
  } catch (error) {
    console.error("Error fetching messages for date range:", error);
    return [];
  }
}

// New helper to fetch workspace URL using slackClient
export async function fetchWorkspaceUrl(): Promise<string> {
  // Use slackClient exposed from config.ts
  const response = await slackClient.team.info();
  const domain =
    response.team && response.team.domain ? response.team.domain : "default";
  return `https://${domain}.slack.com`;
}

// New helper to generate Slack message URL using the workspace URL from the API
export async function generateSlackMessageUrl(
  channelId: string,
  messageTs: string | undefined,
  threadTs: string | undefined,
  parentUserId: string | undefined
): Promise<string> {
  const workspaceUrl = await fetchWorkspaceUrl();

  if (!messageTs) {
    return `${workspaceUrl}/archives/${channelId}`;
  }

  let messageUrl = `${workspaceUrl}/archives/${channelId}/p${messageTs.replace(
    ".",
    ""
  )}`;

  if (parentUserId && threadTs) {
    messageUrl += `?thread_ts=${threadTs}&cid=${channelId}`;
  }

  return messageUrl;
}

export async function getChannelName(channelId: string): Promise<string> {
  const info = await slackClient.conversations.info({ channel: channelId });
  return info.ok && info.channel && info.channel.name
    ? info.channel.name
    : channelId;
}

/**
 * ユーザーグループIDからグループ名を取得する
 * 
 * @param usergroupId ユーザーグループID（S0XXXXXXXX形式）
 * @returns グループ名またはID（取得できない場合）
 */
export async function getUserGroupName(usergroupId: string | undefined): Promise<string> {
  if (!usergroupId) {
    return "Unknown Group";
  }

  // IDがSで始まらない場合、または予期しない形式の場合
  if (!usergroupId.match(/^S[A-Z0-9]+$/)) {
    return usergroupId;
  }

  try {
    // ユーザーグループ一覧を取得
    const response = await slackClient.usergroups.list();
    
    if (response.ok && response.usergroups) {
      // 指定されたIDのユーザーグループを検索
      const usergroup = response.usergroups.find(group => group.id === usergroupId);
      
      // グループが見つかった場合は名前を返す、なければIDをそのまま返す
      return usergroup?.name || usergroupId;
    }
    
    return usergroupId;
  } catch (error) {
    console.error(`Error fetching usergroup info for ${usergroupId}:`, error);
    return usergroupId;
  }
}
