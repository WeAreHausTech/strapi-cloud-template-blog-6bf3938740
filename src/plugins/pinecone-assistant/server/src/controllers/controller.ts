import type { Core } from '@strapi/strapi';

const controller = ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.log.info('Pinecone Assistant plugin: Controller initialized');

  return {
    index(ctx) {
      ctx.body = strapi
        .plugin('pinecone-assistant')
        .service('service')
        .getStatus();
    },
  };
};

export default controller;
