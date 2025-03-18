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

  function processContentBlocks(blocks: any[]): string {
    if (!blocks || !Array.isArray(blocks)) return '';

    return blocks.map(block => {
      console.log('🔍 Processing block:', block);
      switch (block.__component) {
        case 'shared.rich-text':
          return block.body || '';
        case 'shared.quote':
          return `> ${block.body || ''}`;
        case 'shared.media':
          return block.caption || '';
        case 'shared.slider':
          return 'Slider content not displayed';
        default:
          return '';
      }
    }).join('\n\n');
  }

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
        // Log the raw blocks data for debugging
        console.log('🔍 Raw blocks data:', article.blocks);

        // Process content blocks
        const blocksContent = processContentBlocks(article.blocks);
        console.log('📝 Processed content blocks:', blocksContent);
        
        // Combine main content with blocks content
        const fullContent = [
          article.content,
          blocksContent
        ].filter(Boolean).join('\n\n');
        console.log('📝 Combined full content:', fullContent);

        // Create the text to embed using markdown formatting
        const textToEmbed = [
          '## Content',
          fullContent
        ].filter(Boolean).join('\n\n');
        console.log('📝 Text to embed:', textToEmbed);

        // Create the metadata with simplified values
        const metadata: Record<string, any> = {
          id: article.id.toString(),
          title: article.title,
          description: article.description || '',
          categories: article.categories.map(c => c.name.toLowerCase()),
          categoryIds: article.categories.map(c => c.id.toString()),
          author: article.author ? article.author.name : 'Unknown',
          createdAt: article.createdAt,
          updatedAt: article.updatedAt,
          status: article.status,
          slug: article.slug,
          cover: article.cover ? JSON.stringify(article.cover) : '',
          documentId: article.documentId
        };

        const assistant = getPineconeClient();
        
        // Create a temporary file with the content
        const tempDir = os.tmpdir();
        const filePath = path.join(tempDir, `article-${article.id}.md`);
        await fs.promises.writeFile(filePath, textToEmbed);
        console.log(`📝 Temporary file created at ${filePath} with content:\n${textToEmbed}`);

        // Upload to Pinecone
        await assistant.uploadFile({
          path: filePath,
          metadata
        });

        // Clean up temporary file
        await fs.promises.unlink(filePath);

        console.log(`✅ Article ${article.id} uploaded to Pinecone`);
        
        return {
          status: 'success',
          message: `Article ${article.title} uploaded successfully`,
          articleId: article.id,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        console.error(`❌ Failed to upload article ${article.id} to Pinecone:`, error);
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
            author: true,
            blocks: true // Ensure blocks are populated
          },
          status: 'published'  // Get only published articles
        });
        strapi.log.info(`Found ${articles.length} published articles in Strapi`);

        // Log the fetched articles data for debugging
        console.log('🔍 Fetched articles data:', JSON.stringify(articles, null, 2));

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
      
      console.log('🔍 ENTERING INSECT ARTICLE');
      try {
        // Get only the published version
        const publishedArticle = await strapi.entityService.findOne('api::article.article', articleId, {
          populate: {
            categories: true,
            author: true,
            blocks: true // Ensure blocks are populated
          },
          status: 'published'  // Get published version
        });

        // Log the entire published article data for debugging
        console.log('🔍 Full published article data:', JSON.stringify(publishedArticle, null, 2));

        if (!publishedArticle) {
          return {
            status: 'error',
            message: `Published article ${articleId} not found`,
            timestamp: new Date().toISOString()
          };
        }

        // Process content blocks for the published version
        const publishedContent = processContentBlocks(publishedArticle.blocks);

        // Log the raw article data for inspection
        strapi.log.info('Article inspection:', {
          id: articleId,
          hasPublished: !!publishedArticle,
          published: {
            title: publishedArticle.title,
            publishedAt: publishedArticle.publishedAt,
            updatedAt: publishedArticle.updatedAt,
            documentId: publishedArticle.documentId,
            content: publishedContent
          }
        });

        return {
          status: 'success',
          data: {
            id: articleId,
            version: {
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
              } : null,
              content: publishedContent
            },
            // Include raw data for debugging
            raw: {
              published: publishedArticle
            }
          },
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        strapi.log.error('Failed to inspect article:', error);
        throw error;
      }
    },

    async handleArticleUpdate(articleId: string | number) {
      try {
        // Get both draft and published versions
        const [draftArticle, publishedArticle] = await Promise.all([
          strapi.entityService.findOne('api::article.article', articleId, {
            populate: {
              categories: true,
              author: true
            },
            status: 'draft'
          }),
          strapi.entityService.findOne('api::article.article', articleId, {
            populate: {
              categories: true,
              author: true
            },
            status: 'published'
          })
        ]);

        // Log the update event
        strapi.log.info('Article update detected:', {
          articleId,
          hasDraft: !!draftArticle,
          hasPublished: !!publishedArticle,
          draft: draftArticle ? {
            id: draftArticle.id,
            documentId: draftArticle.documentId,
            publishedAt: draftArticle.publishedAt
          } : null,
          published: publishedArticle ? {
            id: publishedArticle.id,
            documentId: publishedArticle.documentId,
            publishedAt: publishedArticle.publishedAt
          } : null
        });

        // If there's a published version, update it in Pinecone
        if (publishedArticle) {
          const articleData: Article = {
            id: publishedArticle.id,
            title: publishedArticle.attributes?.title || publishedArticle.title,
            description: publishedArticle.attributes?.description || publishedArticle.description,
            content: publishedArticle.attributes?.content || publishedArticle.content,
            locale: publishedArticle.attributes?.locale || publishedArticle.locale,
            categories: publishedArticle.attributes?.categories?.data?.map(cat => ({
              id: cat.id,
              name: cat.attributes?.name || cat.name
            })) || publishedArticle.categories,
            author: publishedArticle.attributes?.author?.data ? {
              id: publishedArticle.attributes.author.data.id,
              name: publishedArticle.attributes.author.data.attributes?.name || publishedArticle.attributes.author.data.name
            } : publishedArticle.author,
            createdAt: publishedArticle.attributes?.createdAt || publishedArticle.createdAt,
            updatedAt: publishedArticle.attributes?.updatedAt || publishedArticle.updatedAt,
            status: 'published',
            slug: publishedArticle.attributes?.slug || publishedArticle.slug,
            cover: publishedArticle.attributes?.cover || publishedArticle.cover,
            blocks: publishedArticle.attributes?.blocks || publishedArticle.blocks,
            documentId: publishedArticle.documentId
          };

          // Delete the old version from Pinecone
          await this.deleteArticle(publishedArticle.id);
          
          // Upload the updated version
          await this.uploadArticle(articleData);
          
          strapi.log.info(`Updated published article ${articleData.id} in Pinecone`);
        }

        return {
          status: 'success',
          message: `Article ${articleId} update processed`,
          hasDraft: !!draftArticle,
          hasPublished: !!publishedArticle,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        strapi.log.error('Failed to handle article update:', error);
        throw error;
      }
    },

    async testArticle(articleId: string | number) {
      console.log('🔍 ENTERING TEST ARTICLE');
      try {
        // Fetch the article from Strapi
        const article = await strapi.entityService.findOne('api::article.article', articleId, {
          populate: {
            categories: true,
            author: true,
            blocks: true // Ensure blocks are populated
          },
          status: 'published'  // Get published version
        }) as Article;

        // Log the entire fetched article data for debugging
        console.log('🔍 Full fetched article data:', JSON.stringify(article, null, 2));

        if (!article) {
          return {
            status: 'error',
            message: `Article ${articleId} not found`,
            timestamp: new Date().toISOString()
          };
        }

        // Upload the article to Pinecone
        return await this.uploadArticle(article);
      } catch (error) {
        strapi.log.error('Failed to test article upload:', error);
        throw error;
      }
    }
  };
};
