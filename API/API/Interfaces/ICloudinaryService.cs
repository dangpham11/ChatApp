using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace API.Interfaces
{
    public interface ICloudinaryService
    {
        Task<double?> GetAudioDurationAsync(IFormFile audioFile);
        Task<string> UploadFileAsync(IFormFile file, string folder);
    }

}
