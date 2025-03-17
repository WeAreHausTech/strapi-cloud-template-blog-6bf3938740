import type { Core } from '@strapi/strapi';

const controller = ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.log.info('Pinecone Assistant plugin: Controller initialized');

  return {
    index(ctx) {
      ctx.body = { message: 'Pinecone Assistant plugin is running' };
    },
    async testConnection(ctx) {
      try {
        const result = await strapi.service('plugin::pinecone-assistant.service').testConnection();
        ctx.body = result;
      } catch (error) {
        ctx.status = 500;
        ctx.body = { 
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          timestamp: new Date().toISOString()
        };
      }
    },
  };
};

export default controller;
