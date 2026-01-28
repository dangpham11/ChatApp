import { axiosInstance } from "../config/api";

export interface UploadResult {
  url: string;
  publicId: string;
  format: string;
  resourceType: string;
  bytes: number;
}

export const fileService = {
  async uploadFile(file: File): Promise<UploadResult> {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const { data } = await axiosInstance.post<UploadResult>(
        "/Files/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return data;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "File upload failed");
    }
  },

  async deleteFile(publicId: string): Promise<void> {
    try {
      await axiosInstance.delete(`/Files/delete/${publicId}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "File deletion failed");
    }
  },
};
