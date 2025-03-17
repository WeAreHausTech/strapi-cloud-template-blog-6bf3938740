import type { Core } from '@strapi/strapi';

const bootstrap = ({ strapi }: { strapi: Core.Strapi }) => {
  console.log('Pinecone Assistant plugin: Bootstrap phase started');
  strapi.log.info('Pinecone Assistant plugin: Bootstrap phase started');

  // Register routes
  const routes = strapi.plugin('pinecone-assistant').routes;
  console.log('Pinecone Assistant plugin: Routes in bootstrap:', routes);
  strapi.log.info('Pinecone Assistant plugin: Routes in bootstrap:', routes);

  // Register permissions
  const permissions = strapi.plugin('pinecone-assistant').permissions;
  console.log('Pinecone Assistant plugin: Permissions in bootstrap:', permissions);
  strapi.log.info('Pinecone Assistant plugin: Permissions in bootstrap:', permissions);
};

export default bootstrap;
