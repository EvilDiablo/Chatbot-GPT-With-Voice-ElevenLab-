import React, { useEffect, useState } from "react";
import axios from "axios";

interface ConversationSummary {
  conversation_id: string;
  title: string;
  last_query: string;
  created_at: number;
}

interface ConversationSidebarProps {
  activeConversationId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
}

const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  activeConversationId,
  onSelect,
  onNew,
  onDelete,
  onRename,
}) => {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const fetchConversations = async () => {
    const res = await axios.get("http://localhost:8000/conversations");
    setConversations(res.data);
  };

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleRename = (id: string) => {
    if (renameValue.trim()) {
      onRename(id, renameValue.trim());
      setRenamingId(null);
      setRenameValue("");
      setTimeout(fetchConversations, 500);
    }
  };

  return (
    <div className="w-64 bg-slate-800 text-white h-full flex flex-col border-r border-slate-700">
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <span className="font-bold text-lg">Conversations</span>
        <button
          className="bg-green-600 px-2 py-1 rounded text-white hover:bg-green-700"
          onClick={onNew}
        >
          + New
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 && (
          <div className="p-4 text-gray-400">No conversations yet.</div>
        )}
        {conversations.map((conv) => (
          <div
            key={conv.conversation_id}
            className={`p-3 border-b border-slate-700 cursor-pointer flex items-center justify-between ${
              conv.conversation_id === activeConversationId ? "bg-slate-700" : "hover:bg-slate-700"
            }`}
            onClick={() => onSelect(conv.conversation_id)}
          >
            <div className="flex-1">
              {renamingId === conv.conversation_id ? (
                <input
                  className="bg-slate-600 text-white rounded px-2 py-1 w-full"
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onBlur={() => handleRename(conv.conversation_id)}
                  onKeyDown={e => {
                    if (e.key === "Enter") handleRename(conv.conversation_id);
                  }}
                  autoFocus
                />
              ) : (
                <div className="flex items-center">
                  <span className="font-semibold truncate max-w-[120px]">{conv.title}</span>
                  <button
                    className="ml-2 text-xs text-blue-300 hover:underline"
                    onClick={e => {
                      e.stopPropagation();
                      setRenamingId(conv.conversation_id);
                      setRenameValue(conv.title);
                    }}
                  >
                    Rename
                  </button>
                </div>
              )}
              <div className="text-xs text-gray-400 truncate max-w-[120px]">{conv.last_query}</div>
            </div>
            <button
              className="ml-2 text-xs text-red-400 hover:underline"
              onClick={e => {
                e.stopPropagation();
                onDelete(conv.conversation_id);
                setTimeout(fetchConversations, 500);
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConversationSidebar; 