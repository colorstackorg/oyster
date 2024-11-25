import { Pinecone } from '@pinecone-database/pinecone';

// Environment Variables

const PINECONE_API_KEY = process.env.PINECONE_API_KEY as string;

// Instances

let pinecone: Pinecone;

if (PINECONE_API_KEY) {
  pinecone = new Pinecone({
    apiKey: PINECONE_API_KEY,
  });
} else {
  console.warn(
    'PINECONE_API_KEY is not set. Vector database operations will not be available.'
  );
}

// Types/Constants

type PineconeMetadata = {
  'slack-messages': {
    channelId: string;
    sentAt: string; // Date
  };
};

type PineconeIndexName = keyof PineconeMetadata;

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
export function getPineconeIndex<T extends PineconeIndexName>(name: T) {
  return pinecone.index<PineconeMetadata[T]>(name);
}
