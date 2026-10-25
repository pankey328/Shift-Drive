// Utility for extracting time and comparing hub operational hours

const getTimeString = (input) => {
  if (!input) return "00:00:00";
  const d = new Date(input);
  if (isNaN(d.getTime())) {
    if (typeof input === "string") {
      const match = input.match(/[T\s](\d{2}:\d{2}(?::\d{2})?)/);
      if (match) {
        return match[1].length === 5 ? `${match[1]}:00` : match[1];
      }
    }
    return "00:00:00";
  }

  // Format in Indian Standard Time (Asia/Kolkata, UTC+5:30) because all station operating hours are in Indian local time
  return d.toLocaleTimeString("en-GB", {
    timeZone: "Asia/Kolkata",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const isWithinOperatingHours = (timeStr, open, close) => {
  if (
    !open ||
    !close ||
    open === close ||
    (open === "00:00:00" && close >= "23:59:00")
  ) {
    return true; // 24/7 operations
  }

  const t = timeStr.slice(0, 8);
  const o = open.slice(0, 8);
  const c = close.slice(0, 8);

  if (o <= c) {
    // Normal day hours, e.g. 07:00:00 to 23:00:00
    return t >= o && t <= c;
  } else {
    // Overnight station hours, e.g. 20:00:00 to 06:00:00
    return t >= o || t <= c;
  }
};

module.exports = {
  getTimeString,
  isWithinOperatingHours,
};
