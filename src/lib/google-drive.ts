import { google } from 'googleapis';
import { Readable } from 'stream';

const DEFAULT_ROOT_FOLDER_ID = '18ztbERK7Ql20zy6dea40oour9K35Wr-w';

export function isRealDriveFolderId(id: string | null | undefined): boolean {
  return Boolean(
    id &&
      !id.startsWith('drv_') &&
      !id.startsWith('file_') &&
      !id.includes('your-google-drive')
  );
}

export function getRootDriveFolderId(): string {
  const envRoot = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  if (envRoot && isRealDriveFolderId(envRoot)) {
    return envRoot;
  }
  return DEFAULT_ROOT_FOLDER_ID;
}

export function isGoogleDriveConfigured(): boolean {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  return Boolean(
    email &&
      key &&
      !email.includes('your-gcp-project') &&
      !key.includes('YOUR_PRIVATE_KEY_HERE')
  );
}

function getDriveClient() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    throw new Error(
      'Variables GOOGLE_SERVICE_ACCOUNT_EMAIL et GOOGLE_PRIVATE_KEY manquantes sur ce serveur (pensez à importer .env.local dans Vercel > Settings > Environment Variables).'
    );
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
  const validParent = isRealDriveFolderId(parentFolderId)
    ? parentFolderId!
    : getRootDriveFolderId();

  const drive = getDriveClient();

  // Check if a folder with the exact same name already exists inside validParent to avoid duplicates
  try {
    const escapedName = folderName.replace(/'/g, "\\'");
    const existing = await drive.files.list({
      q: `name = '${escapedName}' and '${validParent}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name, webViewLink)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    if (existing.data.files && existing.data.files.length > 0) {
      const found = existing.data.files[0];
      if (found.id) {
        return {
          folderId: found.id,
          webViewLink:
            found.webViewLink ||
            `https://drive.google.com/drive/folders/${found.id}`,
          simulated: false,
        };
      }
    }
  } catch {
    // Proceed to creation if list check fails
  }

  const response = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [validParent],
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
  const targetFolderId = isRealDriveFolderId(folderId)
    ? folderId
    : getRootDriveFolderId();

  const drive = getDriveClient();
  const stream = Readable.from(buffer);

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [targetFolderId],
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
  const targetId = isRealDriveFolderId(folderId)
    ? folderId
    : getRootDriveFolderId();
  const publicUrl = `https://drive.google.com/drive/folders/${targetId}?usp=sharing`;

  const drive = getDriveClient();
  await drive.permissions.create({
    fileId: targetId,
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

export async function deleteDriveFile(fileId: string): Promise<void> {
  if (!isRealDriveFolderId(fileId)) {
    throw new Error('Identifiant de fichier Google Drive invalide.');
  }
  const drive = getDriveClient();
  await drive.files.delete({ fileId, supportsAllDrives: true });
}
