// utils/timeHelper.js
const getMalaysiaTime = () => {
  const now = new Date();
  // Malaysia is UTC+8 (no DST)
  return new Date(now.getTime() + (8 * 60 * 60 * 1000));
};

const formatMalaysiaTime = (date) => {
  return date.toLocaleString('en-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

function getMalaysiaShiftEnd(hour, minute) {
  const date = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" }); // YYYY-MM-DD
  const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
  return new Date(`${date}T${time}+00:00`);
}

module.exports = { getMalaysiaTime, formatMalaysiaTime, getMalaysiaShiftEnd };