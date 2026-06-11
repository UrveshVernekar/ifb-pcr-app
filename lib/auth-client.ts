import forge from "node-forge";

const INTERNAL_IPS = ["10.0.2.243", "10.0.3.85", "172.24.1.244", "10.0.7.26", "localhost", "127.0.0.1"];

const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA52fFElJ56Bno4OTDWtT3
dHlyrnUblGV4a1lGTuY/b/VEFPRnvs8eh+3XNtSb4rSZHvYvMxFCBgaxL0WZiU+M
9RMPZq90ylLuO7Fe5G8XXpjfNACTONzTfB3Ab3vzT2WKGTij8HisFb3rwKNfw/fW
83QwbyOocXXpMT7XK6GTFt3xxt9fBvCP3Y4hSmHkDmeEqkOMPCOYeYj/mpcpuuyd
R3Xf1E9GTfLY/3MDnBOT5g3darWMs38jOuqCZQcjLTLXBknaZi2OjrMIIz+uM0QS
e8N4IotUDrxdIvw7Fp9B66v+ZmXhxHXXcSwW5cNgMIajA7v1A9rx6YZSnCRY6ukZ
TwIDAQAB
-----END PUBLIC KEY-----`;

export const getApiBaseUrl = () => {
    const envBase = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (envBase) return envBase.replace(/\/$/, "");

    if (typeof window !== "undefined") {
        const hostname = window.location.hostname;
        // Route API requests to the same hostname if testing on local or private networks
        if (hostname === "localhost" || hostname === "127.0.0.1" || /^10\./.test(hostname) || /^192\.168\./.test(hostname) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname) || INTERNAL_IPS.includes(hostname)) {
            return `http://${hostname}:5000/api`;
        }
    }
    return "https://iot.oneifb.co.in/api";
};

export const isInternalHost = (hostname: string) => INTERNAL_IPS.includes(hostname);

const isPrivateIpv4 = (hostname: string) => {
    if (/^10\./.test(hostname)) return true;
    if (/^192\.168\./.test(hostname)) return true;
    const m = hostname.match(/^172\.(\d+)\./);
    if (m) {
        const second = Number(m[1]);
        return second >= 16 && second <= 31;
    }
    return false;
};

export const shouldBypassAltcha = (hostname: string, apiBase: string) => {
    if (isInternalHost(hostname) || isPrivateIpv4(hostname)) return true;
    if (/localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+/.test(apiBase)) {
        return true;
    }
    return false;
};

export const encryptValue = (value: string) => {
    const publicKey = forge.pki.publicKeyFromPem(PUBLIC_KEY_PEM);
    const encrypted = publicKey.encrypt(value, "RSA-OAEP", {
        md: forge.md.sha256.create(),
        mgf1: { md: forge.md.sha256.create() },
    });
    return forge.util.encode64(encrypted);
};
