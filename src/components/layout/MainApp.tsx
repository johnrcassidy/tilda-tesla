import { useState } from 'react';
import Header from './Header';
import Footer from './Footer';
import VideoAnalysisTab from '../tabs/VideoAnalysisTab';
import ImageAnalysisTab from '../tabs/ImageAnalysisTab';
import RoadLearningTab from '../tabs/RoadLearningTab';
import type { TabType } from '../../types';
import './MainApp.css';

function MainApp() {
  const [activeTab, setActiveTab] = useState<TabType>('video');

  return (
    <div className="main-app">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="content-area">
        {activeTab === 'video' && <VideoAnalysisTab />}
        {activeTab === 'image' && <ImageAnalysisTab />}
        {activeTab === 'road-learning' && <RoadLearningTab />}
      </div>
      <Footer />
    </div>
  );
}

export default MainApp;

