import { NextRequest, NextResponse } from 'next/server';
import { createDriveFolder, uploadFileToDrive } from '@/lib/google-drive';
import {
  createServerSupabase,
  isServerSupabaseConfigured,
} from '@/lib/supabase/server';
import type { TypeMedia } from '@/types/database';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const commandeId = formData.get('commandeId') as string | null;
    const nomPack = (formData.get('nomPack') as string | null) || 'Pack_UGC';
    const nomMarque = (formData.get('nomMarque') as string | null) || 'Client';
    let driveSubfolderId = formData.get('driveSubfolderId') as string | null;
    const driveParentFolderId = formData.get('driveParentFolderId') as
      | string
      | null;

    if (!file || !commandeId) {
      return NextResponse.json(
        { error: 'Fichier et identifiant de commande requis.' },
        { status: 400 }
      );
    }

    // 1. Ensure order Drive subfolder exists
    if (!driveSubfolderId) {
      const cleanFolderName = `Commande_${nomMarque.replace(/\s+/g, '_')}_${nomPack.replace(/\s+/g, '_')}`;
      const folderResult = await createDriveFolder(
        cleanFolderName,
        driveParentFolderId || undefined
      );
      driveSubfolderId = folderResult.folderId;

      if (isServerSupabaseConfigured()) {
        const supabase = createServerSupabase();
        await supabase
          .from('commandes_ugc')
          .update({ drive_subfolder_id: driveSubfolderId })
          .eq('id', commandeId);
      }
    }

    // 2. Determine media type ('video' or 'image')
    const mimeType = file.type || 'application/octet-stream';
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const isVideo =
      mimeType.startsWith('video/') || ['mp4', 'mov', 'webm', 'm4v'].includes(ext);
    const typeMedia: TypeMedia = isVideo ? 'video' : 'image';

    // 3. Upload file to Google Drive
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult = await uploadFileToDrive({
      fileName: file.name,
      mimeType,
      buffer,
      folderId: driveSubfolderId,
    });

    // 4. Record in Supabase medias_creations if configured
    let mediaRecord = {
      id: crypto.randomUUID(),
      commande_id: commandeId,
      nom_fichier: file.name,
      type_media: typeMedia,
      drive_file_id: uploadResult.fileId,
      pret_pour_livraison: false,
      created_at: new Date().toISOString(),
    };

    if (isServerSupabaseConfigured()) {
      const supabase = createServerSupabase();
      const { data, error } = await supabase
        .from('medias_creations')
        .insert({
          commande_id: commandeId,
          nom_fichier: file.name,
          type_media: typeMedia,
          drive_file_id: uploadResult.fileId,
          pret_pour_livraison: false,
        })
        .select('*')
        .single();

      if (!error && data) {
        mediaRecord = data;
      }
    }

    return NextResponse.json({
      success: true,
      media: mediaRecord,
      driveSubfolderId,
      simulated: uploadResult.simulated,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erreur lors de l'envoi du média vers Google Drive.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

