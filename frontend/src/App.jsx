import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import HostView from './pages/HostView';
import PlayerJoin from './pages/PlayerJoin';
import PlayerView from './pages/PlayerView';
import ActorView from './pages/ActorView';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game/:code" element={<HostView />} />
        <Route path="/join/:code" element={<PlayerJoin />} />
        <Route path="/play/:code" element={<PlayerView />} />
        <Route path="/act/:roundId" element={<ActorView />} />
      </Routes>
    </BrowserRouter>
  );
}
