using API.Interfaces;
using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;

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
