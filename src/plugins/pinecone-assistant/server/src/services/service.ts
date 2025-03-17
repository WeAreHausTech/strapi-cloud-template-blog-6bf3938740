import type { Core } from '@strapi/strapi';

const service = ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.log.info('Pinecone Assistant plugin: Service initialized');
  
  return {
    getStatus() {
      return {
        status: 'ok',
        message: 'Pinecone Assistant service is running',
        timestamp: new Date().toISOString()
      };
    },
  };
};

export default service;
