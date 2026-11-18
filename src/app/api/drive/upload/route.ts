import { NextRequest, NextResponse } from 'next/server';
import {
  createDriveFolder,
  deleteDriveFile,
  uploadFileToDrive,
} from '@/lib/google-drive';
import { requireStudioAdmin } from '@/lib/supabase/admin';
import type { TypeMedia } from '@/types/database';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 100 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, { type: TypeMedia; extensions: string[] }> = {
  'image/jpeg': { type: 'image', extensions: ['jpg', 'jpeg'] },
  'image/png': { type: 'image', extensions: ['png'] },
  'image/webp': { type: 'image', extensions: ['webp'] },
  'image/gif': { type: 'image', extensions: ['gif'] },
  'video/mp4': { type: 'video', extensions: ['mp4'] },
  'video/quicktime': { type: 'video', extensions: ['mov'] },
  'video/webm': { type: 'video', extensions: ['webm'] },
};

function hasValidFileSignature(buffer: Buffer, mime: string): boolean {
  switch (mime) {
    case 'image/jpeg':
      return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case 'image/png':
      return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case 'image/gif':
      return buffer.subarray(0, 6).toString('ascii').match(/^GIF8[79]a$/) !== null;
    case 'image/webp':
      return buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
    case 'video/mp4':
    case 'video/quicktime':
      return buffer.length >= 12 && buffer.subarray(4, 8).toString('ascii') === 'ftyp';
    case 'video/webm':
      return buffer.length >= 4 && buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
    default:
      return false;
  }
}

function safeFileName(name: string): string {
  const leaf = name.split(/[\\/]/).pop() || 'media';
  return leaf.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 180) || 'media';
}

function safeFolderPart(value: string): string {
  return value.normalize('NFKC').replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 60) || 'Client';
}

export async function POST(request: NextRequest) {
  const auth = await requireStudioAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let uploadedFileId: string | null = null;

  try {
    const formData = await request.formData();
    const fileEntry = formData.get('file');
    const commandeId = formData.get('commandeId');

    if (!(fileEntry instanceof File) || typeof commandeId !== 'string') {
      return NextResponse.json(
        { error: 'Fichier et identifiant de commande requis.' },
        { status: 400 }
      );
    }

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(commandeId)) {
      return NextResponse.json({ error: 'Identifiant de commande invalide.' }, { status: 400 });
    }

    if (fileEntry.size <= 0 || fileEntry.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Le fichier doit peser entre 1 octet et 100 Mo.' },
        { status: 413 }
      );
    }

    const fileName = safeFileName(fileEntry.name);
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    const mime = fileEntry.type.toLowerCase();
    const allowed = ALLOWED_TYPES[mime];
    if (!allowed || !allowed.extensions.includes(extension)) {
      return NextResponse.json(
        { error: 'Format non autorisé. Formats acceptés : JPG, PNG, WEBP, GIF, MP4, MOV et WEBM.' },
        { status: 415 }
      );
    }

    const { data: commande, error: orderError } = await auth.supabase
      .from('commandes_ugc')
      .select('id, prospect_id, nom_pack, drive_subfolder_id')
      .eq('id', commandeId)
      .maybeSingle();

    if (orderError) throw orderError;
    if (!commande) {
      return NextResponse.json({ error: 'Commande introuvable.' }, { status: 404 });
    }

    const { data: prospect, error: prospectError } = await auth.supabase
      .from('prospects')
      .select('nom_marque')
      .eq('id', commande.prospect_id)
      .maybeSingle();

    if (prospectError) throw prospectError;
    const brandName = prospect?.nom_marque || 'Client';

    let folderId = commande.drive_subfolder_id;
    if (!folderId) {
      const folder = await createDriveFolder(
        'Commande_' + safeFolderPart(brandName) + '_' + safeFolderPart(commande.nom_pack)
      );
      folderId = folder.folderId;

      const { error: folderUpdateError } = await auth.supabase
        .from('commandes_ugc')
        .update({ drive_subfolder_id: folderId })
        .eq('id', commandeId);
      if (folderUpdateError) throw folderUpdateError;
    }

    const buffer = Buffer.from(await fileEntry.arrayBuffer());
    if (!hasValidFileSignature(buffer, mime)) {
      return NextResponse.json(
        { error: 'Le contenu du fichier ne correspond pas au format annoncé.' },
        { status: 415 }
      );
    }

    const uploaded = await uploadFileToDrive({
      fileName,
      mimeType: mime,
      buffer,
      folderId,
    });
    uploadedFileId = uploaded.fileId;

    const { data: media, error: mediaError } = await auth.supabase
      .from('medias_creations')
      .insert({
        commande_id: commandeId,
        nom_fichier: fileName,
        type_media: allowed.type,
        drive_file_id: uploaded.fileId,
        pret_pour_livraison: false,
      })
      .select('*')
      .single();

    if (mediaError || !media) {
      throw mediaError || new Error('Impossible d’enregistrer le média dans Studio H.');
    }

    return NextResponse.json({
      success: true,
      media,
      driveSubfolderId: folderId,
      simulated: uploaded.simulated,
    });
  } catch (error) {
    if (uploadedFileId) {
      try {
        await deleteDriveFile(uploadedFileId);
      } catch {
        // Keep the original failure; the orphaned Drive file can be cleaned up manually.
      }
    }
    console.error('[drive/upload]', error);
    return NextResponse.json(
      { error: 'Échec de l’envoi du média. Vérifie le fichier et réessaie.' },
      { status: 500 }
    );
  }
}
