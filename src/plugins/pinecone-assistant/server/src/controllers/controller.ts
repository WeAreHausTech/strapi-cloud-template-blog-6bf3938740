import type { Context } from 'koa';
import type { Core } from '@strapi/strapi';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async getStatus(ctx: Context) {
    try {
      const result = await strapi.service('plugin::pinecone-assistant.service').getStatus();
      ctx.body = result;
    } catch (error) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  },

  async testConnection(ctx: Context) {
    try {
      const result = await strapi.service('plugin::pinecone-assistant.service').testConnection();
      ctx.body = result;
    } catch (error) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  },

  async testArticle(ctx: Context) {
    try {
      const article = await strapi.entityService.findOne('api::article.article', 1, {
        populate: {
          categories: true,
          author: true
        }
      });

      if (!article) {
        ctx.status = 404;
        ctx.body = { error: 'Test article not found' };
        return;
      }

      const result = await strapi.service('plugin::pinecone-assistant.service').forceReindexArticle(article);
      ctx.body = result;
    } catch (error) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  },

  async listArticles(ctx: Context) {
    try {
      const result = await strapi.service('plugin::pinecone-assistant.service').listArticles();
      ctx.body = result;
    } catch (error) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  },

  async forceReindexArticle(ctx: Context) {
    try {
      const { id } = ctx.params;
      const article = await strapi.entityService.findOne('api::article.article', id, {
        populate: {
          categories: true,
          author: true
        }
      });

      if (!article) {
        ctx.status = 404;
        ctx.body = { error: `Article ${id} not found` };
        return;
      }

      const result = await strapi.service('plugin::pinecone-assistant.service').forceReindexArticle(article);
      ctx.body = result;
    } catch (error) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  },

  async reindexAllArticles(ctx: Context) {
    try {
      const result = await strapi.service('plugin::pinecone-assistant.service').reindexAllArticles();
      ctx.body = result;
    } catch (error) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  },

  async inspectArticle(ctx: Context) {
    try {
      const { id } = ctx.params;
      const result = await strapi.service('plugin::pinecone-assistant.service').inspectArticle(id);
      ctx.body = result;
    } catch (error) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  }
});
