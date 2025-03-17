import type { Core } from '@strapi/strapi';
import { Pinecone } from '@pinecone-database/pinecone';
import { PineconeSettings, defaultSettings } from '../config/settings';
import fs from 'fs';
import path from 'path';
import os from 'os';

interface Article {
  id: string;
  title: string;
  description?: string;
  content: string;
  locale?: string;
  categories?: Array<{ id: string; name: string }>;
  author?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

interface PineconeFile {
  id: string;
  metadata: {
    id: string;
    title: string;
    categories: string[];
    categoryIds: string[];
    author: string;
    authorId: string;
    locale: string;
    type: string;
    createdAt: string;
    updatedAt: string;
  };
}

const service = ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.log.info('Pinecone Assistant plugin: Service initialized');
  
  const getPineconeClient = () => {
    const settings = strapi.config.get('pinecone-assistant.settings') as PineconeSettings || defaultSettings;
    if (!settings.apiKey) {
      throw new Error('Pinecone API key is not configured');
    }
    if (!settings.assistantId) {
      throw new Error('Pinecone Assistant ID is not configured');
    }
    const pinecone = new Pinecone({ apiKey: settings.apiKey });
    return pinecone.assistant(settings.assistantId);
  };

  const formatArticleToMarkdown = (article: Article): string => {
    return [
      `# ${article.title}`,
      article.description ? `> ${article.description}` : '',
      '---',
      `- Categories: ${article.categories?.map(c => c.name).join(', ') || 'Uncategorized'}`,
      `- Language: ${article.locale || 'default'}`,
      `- ID: ${article.id}`,
      `- Author: ${article.author?.name || 'Unknown'}`,
      `- Created: ${article.createdAt}`,
      `- Last Updated: ${article.updatedAt}`
    ].filter(Boolean).join('\n\n');
  };

  const getArticleMetadata = (article: Article): Record<string, any> => {
    return {
      id: article.id,
      title: article.title,
      categories: article.categories?.map(c => c.name) || [],
      categoryIds: article.categories?.map(c => String(c.id)) || [],
      author: article.author?.name,
      authorId: article.author?.id,
      locale: article.locale || 'default',
      type: 'article',
      createdAt: article.createdAt,
      updatedAt: article.updatedAt
    };
  };

  return {
    getStatus() {
      return {
        status: 'ok',
        message: 'Pinecone Assistant service is running',
        timestamp: new Date().toISOString()
      };
    },

    async testConnection() {
      try {
        const assistant = getPineconeClient();
        const files = await assistant.listFiles();
        
        return {
          status: 'success',
          message: 'Successfully connected to Pinecone Assistant',
          assistantId: strapi.config.get('pinecone-assistant.settings.assistantId'),
          fileCount: files.files.length,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        strapi.log.error('Pinecone connection test failed:', error);
        throw error;
      }
    },

    async uploadArticle(article: Article) {
      try {
        const assistant = getPineconeClient();
        const content = formatArticleToMarkdown(article);
        const metadata = getArticleMetadata(article);

        // Create a temporary file with the content
        const tempDir = os.tmpdir();
        const filePath = path.join(tempDir, `article-${article.id}.md`);
        await fs.promises.writeFile(filePath, content);

        // Upload to Pinecone
        await assistant.uploadFile({
          path: filePath,
          metadata
        });

        // Clean up temporary file
        await fs.promises.unlink(filePath);

        return {
          status: 'success',
          message: `Article ${article.title} uploaded successfully`,
          articleId: article.id,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        strapi.log.error('Failed to upload article:', error);
        throw error;
      }
    },

    async deleteArticle(documentId: string) {
      try {
        const assistant = getPineconeClient();
        const files = await assistant.listFiles();
        
        // Find the file with matching documentId in metadata
        const fileToDelete = files.files.find(file => (file as PineconeFile).metadata.id === documentId);
        
        if (fileToDelete) {
          await assistant.deleteFile((fileToDelete as PineconeFile).id);
          return {
            status: 'success',
            message: `Article ${documentId} deleted successfully`,
            timestamp: new Date().toISOString()
          };
        }

        return {
          status: 'not_found',
          message: `Article ${documentId} not found in Pinecone`,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        strapi.log.error('Failed to delete article:', error);
        throw error;
      }
    },

    async listArticles() {
      try {
        const assistant = getPineconeClient();
        const files = await assistant.listFiles();
        
        return files.files.map(file => ({
          id: (file as PineconeFile).metadata.id,
          title: (file as PineconeFile).metadata.title,
          metadata: (file as PineconeFile).metadata
        }));
      } catch (error) {
        strapi.log.error('Failed to list articles:', error);
        throw error;
      }
    },

    async forceReindexArticle(article: Article) {
      try {
        // First delete the existing article
        await this.deleteArticle(article.id);
        
        // Then upload the new version
        return await this.uploadArticle(article);
      } catch (error) {
        strapi.log.error('Failed to force reindex article:', error);
        throw error;
      }
    }
  };
};

export default service;
