using API.Interfaces;
using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using NAudio.Wave;

namespace API.Services
{
    public class CloudinaryService : ICloudinaryService
    {
        private readonly Cloudinary _cloudinary;

        public CloudinaryService(IConfiguration config)
        {
            var account = new Account(
                config["Cloudinary:CloudName"],
                config["Cloudinary:ApiKey"],
                config["Cloudinary:ApiSecret"]
            );
            _cloudinary = new Cloudinary(account);
        }

        public async Task<double?> GetAudioDurationAsync(IFormFile audioFile)
        {
            if (audioFile == null || audioFile.Length == 0)
                return null;

            // Tạo đường dẫn file tạm
            var tempPath = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString() + Path.GetExtension(audioFile.FileName));

            try
            {
                // Lưu tạm file âm thanh
                using (var stream = new FileStream(tempPath, FileMode.Create))
                {
                    await audioFile.CopyToAsync(stream);
                }

                // Đọc thời lượng bằng NAudio
                using var reader = new AudioFileReader(tempPath);
                var duration = reader.TotalTime.TotalSeconds;

                return Math.Round(duration, 2); // làm tròn 2 chữ số thập phân
            }
            catch
            {
                return null; // nếu đọc lỗi thì trả về null
            }
            finally
            {
                // Xóa file tạm
                if (File.Exists(tempPath))
                    File.Delete(tempPath);
            }
        }

        public async Task<string> UploadFileAsync(IFormFile file, string folder)
        {
            if (file == null || file.Length == 0)
                throw new ArgumentException("File không hợp lệ");

            var ext = Path.GetExtension(file.FileName).ToLower();

            // Nếu là ảnh
            if (ext == ".jpg" || ext == ".jpeg" || ext == ".png" || ext == ".gif" || ext == ".webp")
            {
                var uploadParams = new ImageUploadParams
                {
                    File = new FileDescription(file.FileName, file.OpenReadStream()),
                    Folder = folder
                };

                var result = await _cloudinary.UploadAsync(uploadParams);
                if (result.StatusCode != System.Net.HttpStatusCode.OK)
                    throw new Exception("Upload ảnh lỗi: " + result.Error?.Message);

                return result.SecureUrl.ToString();
            }
            else
            {
                var uploadParams = new RawUploadParams
                {
                    File = new FileDescription(file.FileName, file.OpenReadStream()),
                    Folder = folder
                };

                var result = await _cloudinary.UploadAsync(uploadParams);
                if (result.StatusCode != System.Net.HttpStatusCode.OK)
                    throw new Exception("Upload file lỗi: " + result.Error?.Message);

                return result.SecureUrl.ToString();
            }
        }
    }
}
