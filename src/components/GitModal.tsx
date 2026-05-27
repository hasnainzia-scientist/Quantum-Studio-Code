import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { GitBranch, GitCommit, RefreshCw, UploadCloud, DownloadCloud, X, Play } from 'lucide-react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface GitModalProps {
  projectId: string;
  onClose: () => void;
  isDark: boolean;
}

export const GitModal: React.FC<GitModalProps> = ({ projectId, onClose, isDark }) => {
  const [status, setStatus] = useState<any>(null);
  const [log, setLog] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [remoteUrl, setRemoteUrl] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [notification, setNotification] = useState<{msg: string, type: 'success'|'error'} | null>(null);

  const notify = (msg: string, type: 'success'|'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/git/${projectId}/status`);
      setStatus(res.data);
      if (res.data.isRepo) {
        const logRes = await axios.get(`/api/git/${projectId}/log`);
        setLog(logRes.data.log);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  const handleInit = async () => {
    setActionLoading("init");
    await axios.post(`/api/git/${projectId}/init`);
    notify("Repository initialized");
    await loadData();
    setActionLoading("");
  };

  const handleCommit = async () => {
    if (!message) return;
    setActionLoading("commit");
    await axios.post(`/api/git/${projectId}/commit`, { message, authorName: 'IDE User', authorEmail: 'user@ide.local' });
    setMessage("");
    notify("Changes committed successfully");
    await loadData();
    setActionLoading("");
  };

  const handleSetRemote = async () => {
    if (!remoteUrl) return;
    setActionLoading("remote");
    await axios.post(`/api/git/${projectId}/remote`, { url: remoteUrl });
    setRemoteUrl("");
    notify("Remote URL set!");
    setActionLoading("");
  };

  const handlePush = async () => {
    setActionLoading("push");
    try {
      await axios.post(`/api/git/${projectId}/push`);
      notify("Pushed successfully");
    } catch (e: any) {
      notify("Failed to push: " + (e.response?.data?.details || e.message), 'error');
    }
    setActionLoading("");
  };

  const handlePull = async () => {
    setActionLoading("pull");
    try {
       await axios.post(`/api/git/${projectId}/pull`);
       notify("Pulled successfully! (Please refresh to see new files)");
    } catch(e: any) {
      notify("Failed to pull: " + (e.response?.data?.details || e.message), 'error');
    }
    setActionLoading("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className={cn("w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]", isDark ? "bg-[#161b22] text-[#e6edf3] border border-[#30363d]" : "bg-white text-gray-900 border border-gray-200")}>
        <div className={cn("px-4 py-3 flex items-center justify-between border-b shrink-0 relative", isDark ? "border-[#30363d] bg-[#0d1117]" : "border-gray-200 bg-gray-50")}>
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-blue-500" />
            Git Source Control
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-black/10 rounded">
            <X className="w-4 h-4" />
          </button>
          
          {notification && (
            <div className={cn("absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 rounded-full text-xs font-medium shadow-md transition-all z-10 animate-in fade-in slide-in-from-top-2", notification.type === 'error' ? "bg-red-500 text-white" : "bg-green-500 text-white")}>
              {notification.msg}
            </div>
          )}
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {loading ? (
             <div className="flex items-center justify-center h-40"><RefreshCw className="w-6 h-6 animate-spin text-gray-500" /></div>
          ) : !status?.isRepo ? (
             <div className="text-center py-12">
                <GitBranch className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">No Repository Found</h3>
                <p className="text-sm text-gray-500 mb-6">Initialize a Git repository to start tracking changes.</p>
                <button disabled={!!actionLoading} onClick={handleInit} className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-2">
                  {actionLoading === "init" && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Initialize Repository
                </button>
             </div>
          ) : (
             <div className="space-y-6">
                
                {/* Commit Action */}
                <div className={cn("p-4 rounded-lg border", isDark ? "border-[#30363d] bg-[#0d1117]" : "border-gray-200 bg-gray-50")}>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <GitCommit className="w-4 h-4" /> Commit Changes
                  </h3>
                  <div className="flex flex-col gap-2">
                    <input type="text" value={message} onChange={e => setMessage(e.target.value)} placeholder="Commit message..." className={cn("px-3 py-2 text-sm rounded border", isDark ? "bg-[#161b22] border-[#30363d] text-white" : "bg-white border-gray-300")} />
                    <button disabled={!message || !!actionLoading} onClick={handleCommit} className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 self-end">
                       Commit
                    </button>
                  </div>
                </div>

                {/* Sync Actions */}
                <div className={cn("p-4 rounded-lg border", isDark ? "border-[#30363d] bg-[#0d1117]" : "border-gray-200 bg-gray-50")}>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" /> Remote Sync
                  </h3>
                  <div className="flex flex-col gap-3">
                     <div className="flex gap-2">
                       <input type="text" value={remoteUrl} onChange={e => setRemoteUrl(e.target.value)} placeholder="Remote URL (e.g., https://github.com/user/repo.git)" className={cn("flex-1 px-3 py-2 text-sm rounded border", isDark ? "bg-[#161b22] border-[#30363d]" : "bg-white border-gray-300")} />
                       <button onClick={handleSetRemote} disabled={!!actionLoading || !remoteUrl} className="px-4 py-2 bg-gray-700 text-white rounded text-sm hover:bg-gray-600 disabled:opacity-50">Set Remote</button>
                     </div>
                     <div className="flex gap-2">
                        <button onClick={handlePull} disabled={!!actionLoading} className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-800 rounded text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-700 flex items-center justify-center gap-2 disabled:opacity-50">
                          <DownloadCloud className="w-4 h-4" /> Fetch & Pull
                        </button>
                        <button onClick={handlePush} disabled={!!actionLoading} className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-800 rounded text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-700 flex items-center justify-center gap-2 disabled:opacity-50">
                          <UploadCloud className="w-4 h-4" /> Push to Remote
                        </button>
                     </div>
                  </div>
                </div>

                {/* History */}
                <div>
                   <h3 className="text-sm font-semibold mb-3">Commit History</h3>
                   <div className="flex flex-col gap-2">
                     {log && log.all && log.all.length > 0 ? (
                       log.all.map((c: any) => (
                         <div key={c.hash} className={cn("p-3 rounded border text-sm flex flex-col gap-1", isDark ? "bg-[#0d1117] border-[#30363d]" : "bg-white border-gray-200")}>
                           <div className="flex items-center justify-between">
                             <span className="font-semibold">{c.message}</span>
                             <span className="text-xs text-gray-500 font-mono">{c.hash.substring(0, 7)}</span>
                           </div>
                           <div className="text-xs text-gray-400">
                             {c.author_name} • {new Date(c.date).toLocaleString()}
                           </div>
                         </div>
                       ))
                     ) : (
                       <div className="text-sm text-gray-500 italic py-2">No commits yet.</div>
                     )}
                   </div>
                </div>

             </div>
          )}
        </div>
      </div>
    </div>
  );
};
