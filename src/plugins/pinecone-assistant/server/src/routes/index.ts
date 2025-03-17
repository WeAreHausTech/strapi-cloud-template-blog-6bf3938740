import contentApi from './content-api';
import admin from './admin';

export default {
  'content-api': {
    type: 'content-api',
    routes: [
      ...contentApi,
      {
        method: 'GET',
        path: '/pinecone-assistant/status',
        handler: 'controller.getStatus',
        config: {
          policies: [],
          auth: false,
        },
      },
      {
        method: 'GET',
        path: '/pinecone-assistant/test-connection',
        handler: 'controller.testConnection',
        config: {
          policies: [],
          auth: false,
        },
      },
      {
        method: 'POST',
        path: '/pinecone-assistant/reindex-all',
        handler: 'controller.reindexAllArticles',
        config: {
          policies: [],
          auth: false,
        },
      },
      {
        method: 'GET',
        path: '/pinecone-assistant/inspect/:id',
        handler: 'controller.inspectArticle',
        config: {
          policies: [],
          auth: false,
          params: {
            id: {
              type: 'string',
              required: true,
            },
          },
        },
      },
    ],
  },
  admin: {
    type: 'admin',
    routes: [...admin],
  },
};
