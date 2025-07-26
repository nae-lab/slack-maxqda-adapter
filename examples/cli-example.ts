#!/usr/bin/env ts-node

import { SlackMaxqdaAdapter } from 'slack-maxqda-adapter';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

const argv = yargs(hideBin(process.argv))
  .option('channelId', {
    alias: 'c',
    type: 'string',
    description: 'The ID of the channel to fetch messages from',
    demandOption: true,
  })
  .option('startDate', {
    alias: 's',
    type: 'string',
    description: 'Start date to fetch messages from (YYYY-MM-DD)',
    demandOption: true,
  })
  .option('endDate', {
    alias: 'e',
    type: 'string',
    description: 'End date to fetch messages to (YYYY-MM-DD)',
  })
  .option('format', {
    alias: 'f',
    type: 'string',
    choices: ['docx', 'md'] as const,
    default: 'docx' as const,
    description: 'Output format (docx or md)',
  })
  .option('concurrency', {
    alias: 'p',
    type: 'number',
    default: 4,
    description: '並列処理の同時実行数',
  })
  .parseSync();

async function main() {
  const token = process.env.SLACK_API_TOKEN;
  if (!token) {
    console.error('SLACK_API_TOKEN environment variable is required');
    process.exit(1);
  }

  const adapter = new SlackMaxqdaAdapter({
    token,
    concurrency: argv.concurrency,
  });

  const endDate = argv.endDate || argv.startDate;

  // Generate output path
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const isSingleDay = argv.startDate === endDate;
  const extension = argv.format === 'md' ? 'md' : 'docx';
  const baseFileName = isSingleDay
    ? `channel_${argv.startDate}_${timestamp}`
    : `channel_${argv.startDate}--${endDate}_${timestamp}`;
  
  const outputDir = path.join(process.cwd(), 'out');
  const outputPath = path.join(outputDir, `${baseFileName}.${extension}`);

  try {
    const result = await adapter.export({
      channelId: argv.channelId,
      startDate: argv.startDate,
      endDate,
      format: argv.format,
      outputPath,
    });

    console.log(`✅ Export completed successfully!`);
    console.log(`📁 Output file: ${result.filePath}`);
    console.log(`📊 Channel: ${result.channelName}`);
    console.log(`💬 Messages: ${result.messageCount}`);
    console.log(`📝 Format: ${result.format}`);
  } catch (error) {
    console.error('❌ Export failed:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);