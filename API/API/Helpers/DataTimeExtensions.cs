using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace API.Helpers;

public static class DateTimeExtensions
{
    public static string ToTimeAgo(this DateTime dateTime)
    {
        var span = DateTime.UtcNow - dateTime;

        if (span.Days > 365)
            return $"{span.Days / 365} year(s) ago";
        if (span.Days > 30)
            return $"{span.Days / 30} month(s) ago";
        if (span.Days > 0)
            return $"{span.Days} day(s) ago";
        if (span.Hours > 0)
            return $"{span.Hours} hour(s) ago";
        if (span.Minutes > 0)
            return $"{span.Minutes} minute(s) ago";

        return "Just now";
    }
}

