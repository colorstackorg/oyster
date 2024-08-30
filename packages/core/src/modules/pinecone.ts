import { Pinecone } from '@pinecone-database/pinecone';

// Environment Variables

const PINECONE_API_KEY = process.env.PINECONE_API_KEY as string;

// Instances

const pinecone = new Pinecone({
  apiKey: PINECONE_API_KEY,
});

// Types/Constants

type SlackMessageMetadata = {
  channelId: string;
  id: string;
  sentAt: string; // Date
  threadId?: string;
};

const PineconeIndex = {
  'slack-messages': pinecone.index<SlackMessageMetadata>('slack-messages'),
} as const;

type PineconeIndexName = keyof typeof PineconeIndex;

/**
 * Gets a Pinecone index by name.
 *
 * Indices in vector databases are semantically equivalent to a table in a
 * relational database.
 *
 * @param name - The name of the Pinecone index to get.
 * @returns The Pinecone index.
 *
 * @see https://docs.pinecone.io/guides/indexes/understanding-indexes
 */
export function getPineconeIndex(name: PineconeIndexName) {
  return PineconeIndex[name];
}
