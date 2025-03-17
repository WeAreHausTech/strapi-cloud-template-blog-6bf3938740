export default [
  {
    method: 'GET',
    path: '/status',
    handler: 'controller.getStatus',
    config: {
      policies: [],
      auth: false,
    },
  },
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
    path: '/list-articles',
    handler: 'controller.listArticles',
    config: {
      policies: [],
      auth: false,
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
  }
]; 