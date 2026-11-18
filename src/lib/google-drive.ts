import { google } from 'googleapis';
import { Readable } from 'stream';

export function isGoogleDriveConfigured(): boolean {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  const rootId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  return Boolean(
    email &&
      key &&
      rootId &&
      !email.includes('your-gcp-project') &&
      !key.includes('YOUR_PRIVATE_KEY_HERE') &&
      !rootId.includes('your-google-drive-root-folder-id')
  );
}

function getDriveClient() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    throw new Error('Identifiants Google Service Account manquants dans .env.local');
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  return google.drive({ version: 'v3', auth });
}

export async function createDriveFolder(
  folderName: string,
  parentFolderId?: string
): Promise<{ folderId: string; webViewLink: string; simulated: boolean }> {
  const targetParent = parentFolderId || process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

  if (!isGoogleDriveConfigured()) {
    const cleanSlug = folderName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const simulatedId = `drv_${cleanSlug}_${Date.now().toString(36)}`;
    return {
      folderId: simulatedId,
      webViewLink: `https://drive.google.com/drive/folders/${simulatedId}`,
      simulated: true,
    };
  }

  const drive = getDriveClient();
  const response = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: targetParent ? [targetParent] : undefined,
    },
    fields: 'id, name, webViewLink',
    supportsAllDrives: true,
  });

  const folderId = response.data.id;
  if (!folderId) {
    throw new Error('La création du dossier Google Drive a échoué (ID manquant).');
  }

  return {
    folderId,
    webViewLink:
      response.data.webViewLink ||
      `https://drive.google.com/drive/folders/${folderId}`,
    simulated: false,
  };
}

export async function uploadFileToDrive(params: {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  folderId: string;
}): Promise<{ fileId: string; webViewLink: string; simulated: boolean }> {
  const { fileName, mimeType, buffer, folderId } = params;

  if (!isGoogleDriveConfigured()) {
    const simulatedId = `file_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 7)}`;
    return {
      fileId: simulatedId,
      webViewLink: `https://drive.google.com/file/d/${simulatedId}/view`,
      simulated: true,
    };
  }

  const drive = getDriveClient();
  const stream = Readable.from(buffer);

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: 'id, name, webViewLink',
    supportsAllDrives: true,
  });

  const fileId = response.data.id;
  if (!fileId) {
    throw new Error("L'envoi du fichier sur Google Drive a échoué.");
  }

  return {
    fileId,
    webViewLink:
      response.data.webViewLink ||
      `https://drive.google.com/file/d/${fileId}/view`,
    simulated: false,
  };
}

export async function shareDriveFolderPublicRead(folderId: string): Promise<{
  publicUrl: string;
  simulated: boolean;
}> {
  const publicUrl = `https://drive.google.com/drive/folders/${folderId}?usp=sharing`;

  if (!isGoogleDriveConfigured()) {
    return {
      publicUrl,
      simulated: true,
    };
  }

  const drive = getDriveClient();
  await drive.permissions.create({
    fileId: folderId,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
    supportsAllDrives: true,
  });

  return {
    publicUrl,
    simulated: false,
  };
}

