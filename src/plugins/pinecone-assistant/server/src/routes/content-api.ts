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
];
