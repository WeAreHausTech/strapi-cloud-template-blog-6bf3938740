export default {
  'pinecone-assistant': {
    enabled: true,
    resolve: './src/plugins/pinecone-assistant',
    settings: {
      apiKey: process.env.PINECONE_API_KEY || '',
      assistantId: process.env.PINECONE_ASSISTANT_ID || '',
    },
  },
}; 