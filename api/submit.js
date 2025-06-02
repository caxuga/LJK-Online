import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const data = req.body;
  const { nama, kelas, mapel } = data;
  const filename = `${nama}_${kelas}_${mapel}.doc`;
  let content = `Nama: ${nama}\nKelas: ${kelas}\nMapel: ${mapel}\n\nJawaban Pilihan Ganda:\n`;

  for (let i = 1; i <= 30; i++) {
    content += `No ${i}: ${data[`pg${i}`] || '-'}\n`;
  }

  content += `\nJawaban Esai:\n`;
  for (let i = 1; i <= 5; i++) {
    content += `Esai ${i}:\n${data[`esai${i}`] || ''}\n\n`;
  }

  // Tulis file sementara
  const tempPath = path.join('/tmp', filename);
  await promisify(fs.writeFile)(tempPath, content);

  // Konfigurasi Google Auth
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  const drive = google.drive({ version: 'v3', auth });

  // Upload file ke Google Drive
  try {
    await drive.files.create({
      requestBody: {
        name: filename,
        parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
      },
      media: {
        mimeType: 'application/msword',
        body: fs.createReadStream(tempPath),
      },
    });

    res.status(200).json({ message: 'Jawaban berhasil dikirim dan diunggah ke Google Drive.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mengunggah jawaban ke Google Drive.' });
  }
}