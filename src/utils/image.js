export const DEFAULT_AVATAR_URL = "/assets/default-avatar.png";

export const resolveAvatarSrc = (val) => {
    if (!val || !val.trim()) return DEFAULT_AVATAR_URL;
    // schon absolute/relative URL?
    if (/^(https?:|\/|data:)/i.test(val)) return val;
    // sonst Dateiname -> Prefix
    const PREFIX = import.meta.env.VITE_AVATAR_PREFIX || "/assets/";
    return `${PREFIX}${val}`;
};
