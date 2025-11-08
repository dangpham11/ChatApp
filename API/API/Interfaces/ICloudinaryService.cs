using Microsoft.AspNetCore.Http;
using System.Threading.Tasks;

namespace API.Services
{
    public class CloudinaryUploadResult
    {
        public string Url { get; set; } = string.Empty;
        public string PublicId { get; set; } = string.Empty;
        public string Format { get; set; } = string.Empty;
        public string ResourceType { get; set; } = string.Empty;
        public long Bytes { get; set; }
    }

    public interface ICloudinaryService
    {
        Task<CloudinaryUploadResult> UploadFileAsync(IFormFile file);
        Task<bool> DeleteFileAsync(string publicId);
    }
}
