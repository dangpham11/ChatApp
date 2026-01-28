import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

export const parseTimestamp = (timestamp: string | Date) => {
  if (timestamp instanceof Date) {
    return dayjs(timestamp).tz("Asia/Ho_Chi_Minh").toDate();
  }

  // Nếu string, kiểm tra xem có 'Z' không
  const ts = timestamp.endsWith("Z") ? timestamp : timestamp + "Z";
  return dayjs.utc(ts).tz("Asia/Ho_Chi_Minh").toDate();
};
