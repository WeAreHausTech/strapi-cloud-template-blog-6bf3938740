import React from 'react';

function App() {
  return React.createElement('div', { style: { padding: '24px' } },
    React.createElement('h1', null, 'Local Plugin'),
    React.createElement('p', null, 'Welcome to the Local Plugin!')
  );
}

App.displayName = 'LocalPluginApp';

export default App; 