import { useEffect, useState } from "react";
import { axiosInstance } from "../config/api";

export const VerifyEmailPage = () => {
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      setStatus("error");
      return;
    }

    axiosInstance
      .get(`/Auth/verify-email?token=${token}`)
      .then(() => setStatus("success"))
      .catch(() => setStatus("error"));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      {status === "loading" && <p>⏳ Đang xác thực email...</p>}
      {status === "success" && (
        <div className="text-center">
          <h2 className="text-xl font-bold text-green-600">
            ✅ Xác thực email thành công
          </h2>
          <p className="mt-2">Bạn có thể quay lại đăng nhập</p>
        </div>
      )}
      {status === "error" && (
        <div className="text-center">
          <h2 className="text-xl font-bold text-green-600">
            ✅ Xác thực email thành công
          </h2>
          <p className="mt-2">Bạn có thể quay lại đăng nhập</p>
        </div>
      )}
    </div>
  );
};
