import type { Core } from '@strapi/strapi';
import { Pinecone } from '@pinecone-database/pinecone';
import { PineconeSettings, defaultSettings } from '../config/settings';

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
    async testConnection() {
      try {
        const settings = strapi.config.get('pinecone-assistant.settings') as PineconeSettings || defaultSettings;
        
        if (!settings.apiKey) {
          throw new Error('Pinecone API key is not configured');
        }

        if (!settings.assistantId) {
          throw new Error('Pinecone Assistant ID is not configured');
        }

        const pinecone = new Pinecone({ apiKey: settings.apiKey });
        const assistant = pinecone.assistant(settings.assistantId);
        
        // Test the connection by listing files
        const files = await assistant.listFiles();
        
        return {
          status: 'success',
          message: 'Successfully connected to Pinecone Assistant',
          assistantId: settings.assistantId,
          fileCount: files.files.length,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        strapi.log.error('Pinecone connection test failed:', error);
        throw error;
      }
    },
  };
};

export default service;
