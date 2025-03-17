export default [
  {
    method: 'GET',
    path: '/',
    // name of the controller file & the method.
    handler: 'controller.index',
    config: {
      policies: [],
    },
  },
  {
    method: 'GET',
    path: '/test-connection',
    handler: 'controller.testConnection',
    config: {
      policies: [],
    },
  },
  {
    method: 'GET',
    path: '/test-article',
    handler: 'controller.testArticle',
    config: {
      policies: [],
    },
  },
  {
    method: 'GET',
    path: '/list-articles',
    handler: 'controller.listArticles',
    config: {
      policies: [],
    },
  },
  {
    method: 'POST',
    path: '/force-reindex/:id',
    handler: 'controller.forceReindexArticle',
    config: {
      policies: [],
    },
  }
];
