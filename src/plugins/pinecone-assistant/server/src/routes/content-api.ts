export default [
  {
    method: 'GET',
    path: '/test-connection',
    handler: 'controller.testConnection',
    config: {
      policies: [],
      auth: false,
    },
  },
  {
    method: 'GET',
    path: '/test-article',
    handler: 'controller.testArticle',
    config: {
      policies: [],
      auth: false,
    },
  },
  {
    method: 'GET',
    path: '/list-articles',
    handler: 'controller.listArticles',
    config: {
      policies: [],
      auth: false,
    },
  },
  {
    method: 'POST',
    path: '/force-reindex/:id',
    handler: 'controller.forceReindexArticle',
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
  {
    method: 'POST',
    path: '/reindex-all',
    handler: 'controller.reindexAllArticles',
    config: {
      policies: [],
      auth: false,
    },
  },
  {
    method: 'GET',
    path: '/inspect/:id',
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
  }
];
