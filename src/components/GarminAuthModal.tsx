'use client';

import React, { useState, useEffect } from 'react';

const GarminAuthModal = ({
  onSubmit,
  onCancel
}: {
  onSubmit: (email: string, pass: string) => void;
  onCancel: () => void;
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    setEmail(localStorage.getItem('garminEmail') || '');
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={e => e.stopPropagation()}
      onPointerDown={e => e.stopPropagation()}
    >
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-6">
        <h3 className="text-xl font-bold text-white">Garmin Connect Login</h3>
        <p className="text-zinc-400 text-sm">
          Please enter your Garmin credentials to upload workouts. Your password will be securely stored in your system's keychain.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">Email</label>
            <input type="email" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">Password</label>
            <input type="password" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onCancel} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg transition-colors font-medium">
            Cancel
          </button>
          <button type="button" onClick={() => onSubmit(email, password)} disabled={!email || !password} className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed">
            Upload Activity
          </button>
        </div>
      </div>
    </div>
  );
};

export default GarminAuthModal;
