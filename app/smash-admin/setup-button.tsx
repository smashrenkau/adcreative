'use client';

import { useState } from 'react';

export default function SetupButton() {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSetup = async () => {
    setLoading(true);
    setStatus(null);
    const res = await fetch('/api/smash-admin/setup', { method: 'POST' });
    const data = await res.json();
    setLoading(false);
    setStatus(res.ok ? data.message : `エラー: ${data.error}`);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleSetup}
        disabled={loading}
        className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
      >
        {loading ? '実行中...' : 'DBセットアップ'}
      </button>
      {status && <span className="text-xs text-gray-500">{status}</span>}
    </div>
  );
}
