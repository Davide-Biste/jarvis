import crypto from 'crypto';

// Funzione per criptare un dato utilizzando AES
export function encryptData(data, encryptionKey) {
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey, 'hex'), crypto.randomBytes(16));
    let encryptedData = cipher.update(data, 'utf8', 'hex');
    encryptedData += cipher.final('hex');
    return encryptedData;
}

// Funzione per decriptare un dato utilizzando AES
export function decryptData(encryptedData, encryptionKey) {
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(encryptionKey, 'hex'), crypto.randomBytes(16));
    let decryptedData = decipher.update(encryptedData, 'hex', 'utf8');
    decryptedData += decipher.final('utf8');
    return decryptedData;
}
