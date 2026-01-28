import React, { useState } from "react";
import {
  X,
  Camera,
  CreditCard as Edit3,
  Save,
  User,
  Mail,
  Phone,
  MapPin,
  Lock,
} from "lucide-react";
import type { User as UserType } from "../types";
import { UserAvatar } from "./UserAvatar";
import { ChangePasswordModal } from "./ChangePasswordModal";
import { AvatarUploadModal } from "./AvatarUploadModal";
import { authService } from "../services/authService";
import { Toast } from "./Toast";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserType;
  onUpdateProfile: (updatedUser: Partial<UserType>) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onUpdateProfile,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showAvatarUpload, setShowAvatarUpload] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // ⚡ NEW: giữ avatar file tạm thời để gửi cùng FormData
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(
    null
  );

  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email || "",
    phone: user.phoneNumber || "+1 (555) 123-4567",
    location: user.location || "San Francisco, CA",
    bio:
      user.bio ||
      "Love connecting with people and sharing great conversations!",
    dateBirth: user.dateBirth || "1990-01-01",
  });

  if (!isOpen) return null;

  const handleSave = async (avatarFile?: File) => {
    setIsLoading(true);
    try {
      const updatedUser = await authService.updateProfile({
        Name: formData.name,
        Bio: formData.bio,
        PhoneNumber: formData.phone,
        Location: formData.location,
        DateBirth: formData.dateBirth,
        avatarFile: avatarFile || undefined,
      });

      onUpdateProfile({
        ...updatedUser,
        id: updatedUser.id.toString(), // ép kiểu sang string
      });

      setToast({ message: "Profile updated successfully", type: "success" });
      setIsEditing(false);
      setSelectedAvatarFile(null);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      setToast({ message: error.message, type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user.name,
      email: user.email || "",
      phone: user.phoneNumber || "+1 (555) 123-4567",
      location: user.location || "San Francisco, CA",
      bio:
        user.bio ||
        "Love connecting with people and sharing great conversations!",
      dateBirth: user.dateBirth || "1990-01-01",
    });
    setIsEditing(false);
    setSelectedAvatarFile(null);
  };

  const handleChangePassword = async (
    currentPassword: string,
    newPassword: string
  ): Promise<boolean> => {
    try {
      await authService.changePassword({ currentPassword, newPassword });
      setToast({ message: "Password changed successfully", type: "success" });
      return true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      setToast({
        message: error.message || "Failed to change password",
        type: "error",
      });
      return false;
    }
  };

  const handleAvatarChange = async (avatarFile: File) => {
    if (!avatarFile) return;

    setIsLoading(true); // show loading nếu cần
    setSelectedAvatarFile(avatarFile);

    // Cập nhật UI tạm thời ngay
    const tempUrl = URL.createObjectURL(avatarFile);
    onUpdateProfile({ avatar: tempUrl });

    try {
      // Gọi API update-profile chỉ với avatarFile
      const updatedUser = await authService.updateProfile({
        Name: formData.name, // giữ nguyên các trường hiện có
        Bio: formData.bio,
        PhoneNumber: formData.phone,
        Location: formData.location,
        DateBirth: formData.dateBirth,
        avatarFile: avatarFile,
      });

      // Cập nhật avatar chính thức từ server
      onUpdateProfile({
        ...updatedUser,
        id: updatedUser.id.toString(), // ép kiểu sang string
      });

      setToast({ message: "Avatar updated successfully", type: "success" });
      setSelectedAvatarFile(null);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      setToast({
        message: error.message || "Failed to update avatar",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl w-[500px] max-w-[90vw] max-h-[90vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900">Profile</h3>
            <div className="flex items-center space-x-2">
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-150"
                  title="Edit Profile"
                >
                  <Edit3 className="w-5 h-5 text-gray-600" />
                </button>
              ) : (
                <div className="flex space-x-2">
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-150"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSave(selectedAvatarFile || undefined)}
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-150 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>{isLoading ? "Saving..." : "Save"}</span>
                  </button>
                </div>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-150"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Profile Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Avatar Section */}
            <div className="text-center mb-8">
              <div className="relative inline-block">
                <UserAvatar user={user} size="lg" showOnline={false} />
                <button
                  onClick={() => setShowAvatarUpload(true)}
                  className="absolute bottom-0 right-0 w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors duration-150 shadow-lg"
                >
                  <Camera className="w-5 h-5" />
                </button>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mt-4">
                {user.name}
              </h2>
              <div className="flex items-center justify-center mt-2">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="text-sm text-gray-600">Online</span>
              </div>
            </div>

            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">
                  Basic Information
                </h4>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <User className="w-5 h-5 text-gray-400" />
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              name: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      ) : (
                        <p className="text-gray-900">{formData.name}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address
                      </label>
                      {isEditing ? (
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              email: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      ) : (
                        <p className="text-gray-900">{formData.email}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number
                      </label>
                      {isEditing ? (
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              phone: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      ) : (
                        <p className="text-gray-900">{formData.phone}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Location
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.location}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              location: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      ) : (
                        <p className="text-gray-900">{formData.location}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* About Section */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">
                  About
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bio
                    </label>
                    {isEditing ? (
                      <textarea
                        value={formData.bio}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            bio: e.target.value,
                          }))
                        }
                        rows={3}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        placeholder="Tell us about yourself..."
                      />
                    ) : (
                      <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">
                        {formData.bio}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date of Birth
                    </label>
                    {isEditing ? (
                      <input
                        type="date"
                        value={formData.dateBirth}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            dateBirth: e.target.value,
                          }))
                        }
                      />
                    ) : (
                      <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">
                        {formData.dateBirth}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Privacy & Settings */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">
                  Privacy & Settings
                </h4>
                <div className="space-y-3">
                  <button
                    onClick={() => setShowChangePassword(true)}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-150"
                  >
                    <div className="flex items-center space-x-3">
                      <Lock className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-900">Change Password</span>
                    </div>
                    <span className="text-gray-400">›</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        onChangePassword={handleChangePassword}
      />

      <AvatarUploadModal
        isOpen={showAvatarUpload}
        onClose={() => setShowAvatarUpload(false)}
        currentAvatar={user.avatar}
        onAvatarChange={handleAvatarChange} // set selectedAvatarFile
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          icon={toast.type === "success" ? "check" : "alert"}
          isVisible={!!toast}
          duration={4000}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
};
