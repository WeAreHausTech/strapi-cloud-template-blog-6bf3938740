import type { Context } from 'koa';
import type { Core } from '@strapi/strapi';

const controller = ({ strapi }: { strapi: Core.Strapi }) => ({
  async index(ctx: Context) {
    ctx.body = { message: 'Pinecone Assistant plugin is running' };
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
      // Get a test article from Strapi
      const article = await strapi.entityService.findOne('api::article.article', 1, {
        populate: ['categories', 'author']
      });

      if (!article) {
        ctx.status = 404;
        ctx.body = { error: 'No test article found' };
        return;
      }

      const result = await strapi.service('plugin::pinecone-assistant.service').uploadArticle(article);
      ctx.body = result;
    } catch (error) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  },

  async listArticles(ctx: Context) {
    try {
      const articles = await strapi.service('plugin::pinecone-assistant.service').listArticles();
      ctx.body = articles;
    } catch (error) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  },

  async forceReindexArticle(ctx: Context) {
    try {
      const { id } = ctx.params;
      
      // Get the article from Strapi
      const article = await strapi.entityService.findOne('api::article.article', id, {
        populate: ['categories', 'author']
      });

      if (!article) {
        ctx.status = 404;
        ctx.body = { error: 'Article not found' };
        return;
      }

      const result = await strapi.service('plugin::pinecone-assistant.service').forceReindexArticle(article);
      ctx.body = result;
    } catch (error) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  }
});

export default controller;
