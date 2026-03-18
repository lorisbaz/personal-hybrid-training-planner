'use client';

import React from 'react';
import { Calendar as CalendarIcon, User } from 'lucide-react';

const Header = ({ isLoaded, onOpenProfile }: { isLoaded: boolean; onOpenProfile: () => void }) => (
  <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-10">
    <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-lg">
          <CalendarIcon className="text-white" size={24} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Your Personal Training Plan</h1>
        </div>
      </div>
      <button
        onClick={onOpenProfile}
        className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full transition-colors text-zinc-400 hover:text-white"
        title="Edit Profile"
      >
        <User size={20} />
      </button>
    </div>
  </header>
);

export default Header;
