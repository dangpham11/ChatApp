import React, { useState } from "react";
import { MapPin } from "lucide-react";

interface LocationMessageBubbleProps {
  latitude: number;
  longitude: number;
  isOwn: boolean;
  isExpired?: boolean;
  createdAt?: string | Date;
}

export const LocationMessageBubble: React.FC<LocationMessageBubbleProps> = ({
  latitude,
  longitude,
  isOwn,
  isExpired,
}) => {
  const [distanceText] = useState<string>("");

  const handleViewLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;

          // Google Maps Directions URL: from current location to target
          const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${latitude},${longitude}&travelmode=driving`;

          window.open(mapsUrl, "_blank");
        },
        (err) => {
          console.error("Không lấy được vị trí hiện tại:", err);
          // Nếu không lấy được vị trí, chỉ mở vị trí người chia sẻ
          window.open(
            `https://www.google.com/maps?q=${latitude},${longitude}`,
            "_blank",
          );
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      );
    } else {
      // Trình duyệt không hỗ trợ Geolocation
      window.open(
        `https://www.google.com/maps?q=${latitude},${longitude}`,
        "_blank",
      );
    }
  };

  // Hàm tính khoảng cách giữa 2 tọa độ (Haversine formula)

  if (isExpired) {
    return (
      <div
        className={`max-w-xs px-4 py-3 rounded-lg text-sm ${
          isOwn
            ? "bg-gray-300 text-gray-700 ml-auto"
            : "bg-gray-200 text-gray-700"
        }`}
      >
        📍 Vị trí đã hết hạn (sau 1 giờ)
      </div>
    );
  }
  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-2`}>
      <div
        className={`max-w-xs rounded-2xl p-4 shadow-sm ${
          isOwn ? "bg-blue-500 text-white" : "bg-white text-gray-800"
        }`}
      >
        <div className="flex items-start space-x-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              isOwn ? "bg-blue-600" : "bg-blue-500"
            }`}
          >
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h4
              className={`font-semibold mb-1 ${
                isOwn ? "text-white" : "text-gray-900"
              }`}
            >
              Vị trí trực tiếp
            </h4>
            <p
              className={`text-xs mb-3 ${
                isOwn ? "text-blue-100" : "text-gray-500"
              }`}
            >
              Bạn đã bắt đầu chia sẻ
            </p>
            <button
              onClick={handleViewLocation}
              className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                isOwn
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }`}
            >
              Xem vị trí
            </button>
            {distanceText && (
              <p
                className={`text-xs mt-2 ${
                  isOwn ? "text-blue-100" : "text-gray-400"
                }`}
              >
                Khoảng cách đến bạn: {distanceText}
              </p>
            )}
          </div>
        </div>
        <div
          className={`text-xs mt-2 text-right ${
            isOwn ? "text-blue-100" : "text-gray-400"
          }`}
        >
          Đã gửi
        </div>
      </div>
    </div>
  );
};
