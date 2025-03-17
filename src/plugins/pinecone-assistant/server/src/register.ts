import type { Core } from '@strapi/strapi';

const register = ({ strapi }: { strapi: Core.Strapi }) => {
  console.log('Pinecone Assistant plugin: Starting registration...');
  strapi.log.info('Pinecone Assistant plugin: Starting registration...');
  
  // Log the plugin configuration
  const config = strapi.config.get('plugin.pinecone-assistant');
  console.log('Pinecone Assistant plugin: Configuration loaded in register:', config);
  strapi.log.info('Pinecone Assistant plugin: Configuration loaded in register:', config);
  
  // Log available routes
  const routes = strapi.plugin('pinecone-assistant').routes;
  console.log('Pinecone Assistant plugin: Available routes:', routes);
  strapi.log.info('Pinecone Assistant plugin: Available routes:', routes);
  
  console.log('Pinecone Assistant plugin: Registration completed');
  strapi.log.info('Pinecone Assistant plugin: Registration completed');
};

export default register;
