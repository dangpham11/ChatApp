import React from "react";
import type { User } from "../types";

interface UserAvatarProps {
  user?: User | null;
  size?: "sm" | "md" | "lg" | "xl";
  showOnline?: boolean;
  className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  size = "md",
  showOnline = true,
}) => {
  if (!user) {
    return (
      <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
        ☁️
      </div>
    );
  }
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
    xl: "w-16 h-16",
  };

  const onlineIndicatorSizes = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4",
    xl: "w-4 h-4",
  };

  return (
    <div className="relative">
      <img
        src={user.avatar}
        alt={user.name}
        className={`${sizeClasses[size]} rounded-full object-cover ring-2 ring-white shadow-sm`}
      />
      {showOnline && (
        <div
          className={`absolute bottom-0 right-0 ${
            onlineIndicatorSizes[size]
          } rounded-full border-2 border-white ${
            user.isOnline ? "bg-green-500" : "bg-gray-400"
          }`}
        />
      )}
    </div>
  );
};
