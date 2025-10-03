// Handles ISO string OR Java LocalDateTime JSON object
const toDate = (v) => {
    if (!v) return null;
    if (typeof v === "string") return new Date(v);
    if (typeof v === "object" && "year" in v) {
        const y = v.year, m = (v.monthValue ?? v.month) - 1, d = v.dayOfMonth ?? v.day;
        const hh = v.hour ?? 0, mm = v.minute ?? 0, ss = v.second ?? 0, ms = Math.floor((v.nano ?? 0) / 1e6);
        return new Date(y, m, d, hh, mm, ss, ms);
    }
    return null;
};

export const fmtTime = (v) => {
    const d = toDate(v);
    if (!d) return "";
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    const time = new Intl.DateTimeFormat([], { hour: "2-digit", minute: "2-digit" }).format(d);
    if (sameDay) return time;
    const date = new Intl.DateTimeFormat([], { day: "2-digit", month: "2-digit" }).format(d);
    return `${date} ${time}`;
};