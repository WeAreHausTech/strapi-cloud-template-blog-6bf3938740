import { Puzzle } from '@strapi/icons';

const pluginId = 'local-plugin';
const pluginName = 'Local Plugin';

export default {
  register(app) {
    const plugin = {
      id: pluginId,
      name: pluginName,
    };

    app.registerPlugin(plugin);

    app.addMenuLink({
      to: `/plugins/${pluginId}`,
      icon: Puzzle,
      intlLabel: {
        id: `${pluginId}.plugin.name`,
        defaultMessage: pluginName,
      },
      Component: async () => {
        const component = await import('./pages/App/index.jsx');
        return component.default;
      },
      permissions: [],
    });
  },

  bootstrap() {},
  
  async registerTrads() {
    return Promise.resolve([]);
  },
}; 