import React, { useState } from "react";
import { Smile } from "lucide-react";

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const emojiCategories = {
  Smileys: [
    "😀",
    "😃",
    "😄",
    "😁",
    "😆",
    "😅",
    "😂",
    "🤣",
    "😊",
    "😇",
    "🙂",
    "🙃",
    "😉",
    "😌",
    "😍",
    "🥰",
    "😘",
    "😗",
    "😙",
    "😚",
    "😋",
    "😛",
    "😝",
    "😜",
    "🤪",
    "🤨",
    "🧐",
    "🤓",
    "😎",
    "🤩",
    "🥳",
  ],
  Gestures: [
    "👍",
    "👎",
    "👌",
    "🤌",
    "🤏",
    "✌️",
    "🤞",
    "🤟",
    "🤘",
    "🤙",
    "👈",
    "👉",
    "👆",
    "🖕",
    "👇",
    "☝️",
    "👏",
    "🙌",
    "👐",
    "🤲",
    "🤝",
    "🙏",
  ],
  Hearts: [
    "❤️",
    "🧡",
    "💛",
    "💚",
    "💙",
    "💜",
    "🖤",
    "🤍",
    "🤎",
    "💔",
    "❣️",
    "💕",
    "💞",
    "💓",
    "💗",
    "💖",
    "💘",
    "💝",
  ],
  Objects: [
    "🎉",
    "🎊",
    "🎈",
    "🎁",
    "🏆",
    "🥇",
    "🥈",
    "🥉",
    "⭐",
    "🌟",
    "💫",
    "✨",
    "🔥",
    "💯",
    "💢",
    "💥",
    "💦",
    "💨",
  ],
};

export const EmojiPicker: React.FC<EmojiPickerProps> = ({
  onEmojiSelect,
  isOpen,
  onToggle,
}) => {
  const [activeCategory, setActiveCategory] = useState("Smileys");

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-150"
        title="Add emoji"
      >
        <Smile className="w-5 h-5 text-gray-600" />
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="p-2 bg-blue-100 text-blue-600 rounded-full transition-colors duration-150"
        title="Add emoji"
      >
        <Smile className="w-5 h-5" />
      </button>

      <div className="absolute bottom-12 right-0 bg-white border border-gray-200 rounded-2xl shadow-xl w-80 h-96 flex flex-col z-50">
        {/* Category Tabs */}
        <div className="flex border-b border-gray-200 p-2">
          {Object.keys(emojiCategories).map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-3 py-2 text-sm rounded-lg transition-colors duration-150 ${
                activeCategory === category
                  ? "bg-blue-100 text-blue-600"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Emoji Grid */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-8 gap-2">
            {emojiCategories[
              activeCategory as keyof typeof emojiCategories
            ].map((emoji, index) => (
              <button
                key={index}
                onClick={() => {
                  onEmojiSelect(emoji);
                  onToggle();
                }}
                className="w-8 h-8 flex items-center justify-center text-xl hover:bg-gray-100 rounded-lg transition-colors duration-150"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Recently Used */}
        <div className="border-t border-gray-200 p-3">
          <div className="text-xs text-gray-500 mb-2">Recently used</div>
          <div className="flex space-x-2">
            {["😀", "👍", "❤️", "😂", "🎉"].map((emoji, index) => (
              <button
                key={index}
                onClick={() => {
                  onEmojiSelect(emoji);
                  onToggle();
                }}
                className="w-8 h-8 flex items-center justify-center text-xl hover:bg-gray-100 rounded-lg transition-colors duration-150"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
