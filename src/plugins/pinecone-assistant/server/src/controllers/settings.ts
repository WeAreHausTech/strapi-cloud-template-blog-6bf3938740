export default ({ strapi }) => ({
  async getSettings(ctx) {
    try {
      const settings = await strapi.entityService.findMany('plugin::pinecone-assistant.settings', {
        populate: '*',
      });

      if (!settings || settings.length === 0) {
        return ctx.send({ agentId: '' });
      }

      return ctx.send(settings[0]);
    } catch (error) {
      return ctx.badRequest('Failed to get settings');
    }
  },

  async updateSettings(ctx) {
    try {
      const { agentId } = ctx.request.body;

      const existingSettings = await strapi.entityService.findMany('plugin::pinecone-assistant.settings', {
        populate: '*',
      });

      if (existingSettings && existingSettings.length > 0) {
        const updatedSettings = await strapi.entityService.update('plugin::pinecone-assistant.settings', existingSettings[0].id, {
          data: { agentId },
        });
        return ctx.send(updatedSettings);
      }

      const newSettings = await strapi.entityService.create('plugin::pinecone-assistant.settings', {
        data: { agentId },
      });

      return ctx.send(newSettings);
    } catch (error) {
      return ctx.badRequest('Failed to update settings');
    }
  },
}); 