import React from 'react';
import DisclaimerModal from './components/DisclaimerModal';
import DownloadButton from './components/DownloadButton';

const App = () => {
  return (
    <div>
      <DisclaimerModal />
      <header>
        {/* Your existing header content */}
      </header>
      <main>
        {/* Your existing main content */}
        <DownloadButton />
      </main>
    </div>
  );
};

export default App;