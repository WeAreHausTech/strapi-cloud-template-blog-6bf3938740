import type { Core } from '@strapi/strapi';
import { Pinecone } from '@pinecone-database/pinecone';
import { PineconeSettings, defaultSettings } from '../config/settings';
import { Article, PineconeFile } from '../types';
import fs from 'fs';
import path from 'path';
import os from 'os';

export default ({ strapi }: { strapi: Core.Strapi }) => {
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
      `- Status: ${article.status || 'draft'}`,
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
      updatedAt: article.updatedAt,
      status: article.status || 'draft'
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

    async deleteArticle(documentId: string | number) {
      try {
        const assistant = getPineconeClient();
        const files = await assistant.listFiles();
        
        // Find the file with matching documentId in metadata
        const fileToDelete = files.files.find(file => (file as PineconeFile).metadata.id === String(documentId));
        
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
    },

    async reindexAllArticles() {
      try {
        const assistant = getPineconeClient();
        
        // Helper function to sleep
        const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
        
        // 1. Delete all existing files from Pinecone
        const files = await assistant.listFiles();
        strapi.log.info(`Found ${files.files.length} files in Pinecone to delete`);
        for (const file of files.files) {
          strapi.log.info(`Deleting file: ${(file as PineconeFile).metadata.title} (ID: ${(file as PineconeFile).id})`);
          await assistant.deleteFile((file as PineconeFile).id);
          // Add longer delay after each deletion (5 seconds)
          await sleep(5000);
        }
        strapi.log.info(`Deleted ${files.files.length} files from Pinecone`);
        
        // Wait longer after all deletions are complete (10 seconds)
        await sleep(10000);

        // 2. Get all published articles from Strapi
        const articles = await strapi.entityService.findMany('api::article.article', {
          populate: {
            categories: true,
            author: true
          },
          status: 'published'  // Get only published articles
        });
        strapi.log.info(`Found ${articles.length} published articles in Strapi`);

        // Wait before starting uploads (5 seconds)
        await sleep(5000);

        // 3. Upload all articles
        const results = [];
        if (Array.isArray(articles)) {
          for (const article of articles) {
            try {
              // Debug logging for raw article data
              strapi.log.info('Raw article data:', {
                id: article.id,
                documentId: article.documentId,
                title: article.title,
                publishedAt: article.publishedAt,
                updatedAt: article.updatedAt
              });

              // Transform the article data to match our Article interface
              const articleData: Article = {
                id: article.id,
                title: article.attributes?.title || article.title,
                description: article.attributes?.description || article.description,
                content: article.attributes?.content || article.content,
                locale: article.attributes?.locale || article.locale,
                categories: article.attributes?.categories?.data?.map(cat => ({
                  id: cat.id,
                  name: cat.attributes?.name || cat.name
                })) || article.categories,
                author: article.attributes?.author?.data ? {
                  id: article.attributes.author.data.id,
                  name: article.attributes.author.data.attributes?.name || article.attributes.author.data.name
                } : article.author,
                createdAt: article.attributes?.createdAt || article.createdAt,
                updatedAt: article.attributes?.updatedAt || article.updatedAt,
                status: 'published',  // We know it's published because we used status: 'published'
                slug: article.attributes?.slug || article.slug,
                cover: article.attributes?.cover || article.cover,
                blocks: article.attributes?.blocks || article.blocks,
                documentId: article.documentId  // Include documentId to track versions
              };

              // Debug logging for transformed article data
              strapi.log.info('Transformed article data:', {
                id: articleData.id,
                documentId: articleData.documentId,
                title: articleData.title,
                status: articleData.status,
                publishedAt: article.publishedAt
              });

              const result = await this.uploadArticle(articleData);
              results.push(result);
              strapi.log.info(`Uploaded published article ${articleData.id} (documentId: ${articleData.documentId}): ${articleData.title}`);
              
              // Add a longer delay between uploads (8 seconds)
              await sleep(8000);
            } catch (error) {
              strapi.log.error(`Failed to upload article ${article.id}:`, error);
              results.push({
                status: 'error',
                message: `Failed to upload article ${article.attributes?.title || article.title}`,
                articleId: article.id,
                documentId: article.documentId,
                error: error.message,
                timestamp: new Date().toISOString()
              });
              // Add longer delay even after errors (8 seconds)
              await sleep(8000);
            }
          }
        } else {
          strapi.log.error('Articles is not an array:', articles);
        }

        return {
          status: 'completed',
          message: `Reindex completed. Processed ${articles.length} published articles.`,
          results,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        strapi.log.error('Failed to reindex articles:', error);
        throw error;
      }
    },

    async inspectArticle(articleId: string | number) {
      try {
        // Get both draft and published versions using the correct status parameter
        const [draftArticle, publishedArticle] = await Promise.all([
          strapi.entityService.findOne('api::article.article', articleId, {
            populate: {
              categories: true,
              author: true
            },
            status: 'draft'  // Get draft version
          }),
          strapi.entityService.findOne('api::article.article', articleId, {
            populate: {
              categories: true,
              author: true
            },
            status: 'published'  // Get published version
          })
        ]);

        if (!draftArticle && !publishedArticle) {
          return {
            status: 'error',
            message: `Article ${articleId} not found`,
            timestamp: new Date().toISOString()
          };
        }

        // Log the raw article data for inspection
        strapi.log.info('Article inspection:', {
          id: articleId,
          hasDraft: !!draftArticle,
          hasPublished: !!publishedArticle,
          draft: draftArticle ? {
            title: draftArticle.title,
            publishedAt: draftArticle.publishedAt,
            updatedAt: draftArticle.updatedAt,
            documentId: draftArticle.documentId
          } : null,
          published: publishedArticle ? {
            title: publishedArticle.title,
            publishedAt: publishedArticle.publishedAt,
            updatedAt: publishedArticle.updatedAt,
            documentId: publishedArticle.documentId
          } : null
        });

        return {
          status: 'success',
          data: {
            id: articleId,
            versions: {
              draft: draftArticle ? {
                title: draftArticle.title,
                status: 'draft',
                documentId: draftArticle.documentId,
                timestamps: {
                  publishedAt: draftArticle.publishedAt,
                  createdAt: draftArticle.createdAt,
                  updatedAt: draftArticle.updatedAt
                },
                categories: draftArticle.categories?.map(cat => ({
                  id: cat.id,
                  name: cat.name,
                  publishedAt: cat.publishedAt
                })),
                author: draftArticle.author ? {
                  id: draftArticle.author.id,
                  name: draftArticle.author.name,
                  publishedAt: draftArticle.author.publishedAt
                } : null
              } : null,
              published: publishedArticle ? {
                title: publishedArticle.title,
                status: 'published',
                documentId: publishedArticle.documentId,
                timestamps: {
                  publishedAt: publishedArticle.publishedAt,
                  createdAt: publishedArticle.createdAt,
                  updatedAt: publishedArticle.updatedAt
                },
                categories: publishedArticle.categories?.map(cat => ({
                  id: cat.id,
                  name: cat.name,
                  publishedAt: cat.publishedAt
                })),
                author: publishedArticle.author ? {
                  id: publishedArticle.author.id,
                  name: publishedArticle.author.name,
                  publishedAt: publishedArticle.author.publishedAt
                } : null
              } : null
            },
            // Include raw data for debugging
            raw: {
              draft: draftArticle,
              published: publishedArticle
            }
          },
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        strapi.log.error('Failed to inspect article:', error);
        throw error;
      }
    }
  };
};
