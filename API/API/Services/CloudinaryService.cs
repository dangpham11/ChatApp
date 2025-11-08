using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using System.IO;
using System.Threading.Tasks;

namespace API.Services
{
    public class CloudinaryService : ICloudinaryService
    {
        private readonly Cloudinary _cloudinary;

        public CloudinaryService(IConfiguration configuration)
        {
            var cloudName = configuration["Cloudinary:CloudName"];
            var apiKey = configuration["Cloudinary:ApiKey"];
            var apiSecret = configuration["Cloudinary:ApiSecret"];

            var account = new Account(cloudName, apiKey, apiSecret);
            _cloudinary = new Cloudinary(account);
        }

        public async Task<CloudinaryUploadResult> UploadFileAsync(IFormFile file)
        {
            if (file == null || file.Length == 0)
                throw new System.Exception("File is empty");

            await using var stream = file.OpenReadStream();
            var uploadParams = new RawUploadParams()
            {
                File = new FileDescription(file.FileName, stream),
                PublicId = Path.GetFileNameWithoutExtension(file.FileName),
                Overwrite = true
            };

            var uploadResult = await _cloudinary.UploadAsync(uploadParams);

            if (uploadResult.StatusCode != System.Net.HttpStatusCode.OK && uploadResult.StatusCode != System.Net.HttpStatusCode.Created)
                throw new System.Exception(uploadResult.Error?.Message);

            return new CloudinaryUploadResult
            {
                Url = uploadResult.SecureUrl?.ToString() ?? string.Empty,
                PublicId = uploadResult.PublicId,
                Format = uploadResult.Format,
                ResourceType = uploadResult.ResourceType,
                Bytes = uploadResult.Bytes
            };
        }

        public async Task<bool> DeleteFileAsync(string publicId)
        {
            if (string.IsNullOrEmpty(publicId))
                throw new System.Exception("PublicId is required");

            var deleteParams = new DeletionParams(publicId)
            {
                ResourceType = ResourceType.Auto // Cloudinary tự nhận loại file
            };

            var result = await _cloudinary.DestroyAsync(deleteParams);
            return result.Result == "ok" || result.Result == "not found";
        }
    }
}
