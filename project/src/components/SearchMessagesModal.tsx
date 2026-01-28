import React, { useState } from "react";
import { SearchBar } from "./SearchBar";
import { conversationService } from "../services/conversationService";
import type { MessageResponse } from "../services/conversationService";

interface Props {
  isOpen: boolean;
  conversationId: number;
  onClose: () => void;
  onSelectMessage?: (messageId: string) => void;
}

export const SearchMessagesModal: React.FC<Props> = ({
  isOpen,
  conversationId,
  onClose,
  onSelectMessage,
}) => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MessageResponse[]>([]);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const doSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await conversationService.searchMessages(
        conversationId,
        query,
        1,
        50
      );
      setResults(data.items || []);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Search failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="p-4 border-b">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-semibold">Tìm kiếm tin nhắn</h3>
            <div className="flex-1" />
            <button
              onClick={onClose}
              className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
            >
              Đóng
            </button>
          </div>
          <div className="mt-3">
            <SearchBar
              value={query}
              onChange={setQuery}
              placeholder="Tìm kiếm trong cuộc trò chuyện..."
            />
            <div className="flex justify-end mt-2">
              <button
                onClick={doSearch}
                disabled={loading || !query.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:opacity-50"
              >
                {loading ? "Đang tìm..." : "Tìm"}
              </button>
            </div>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto p-4 space-y-3">
          {error && <div className="text-red-500">{error}</div>}
          {results.length === 0 && !loading && (
            <div className="text-gray-500">Không tìm thấy kết quả.</div>
          )}

          {results.map((m) => (
            <div
              key={m.id}
              className="p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
              onClick={() => {
                onSelectMessage?.(String(m.id));
                onClose();
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="text-sm font-medium">{m.senderName}</div>
                <div className="text-xs text-gray-500">
                  {new Date(m.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="text-sm text-gray-700 truncate">{m.content}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SearchMessagesModal;
