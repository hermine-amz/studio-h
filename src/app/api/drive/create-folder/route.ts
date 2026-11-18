import { NextRequest, NextResponse } from 'next/server';
import { createDriveFolder } from '@/lib/google-drive';
import {
  createServerSupabase,
  isServerSupabaseConfigured,
} from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      prospectId,
      nomMarque,
      parentFolderId,
      subfolderName,
    }: {
      prospectId?: string;
      nomMarque?: string;
      parentFolderId?: string;
      subfolderName?: string;
    } = body;

    if (!nomMarque && !subfolderName) {
      return NextResponse.json(
        { error: 'Le nom de la marque ou du sous-dossier est requis.' },
        { status: 400 }
      );
    }

    const folderName = subfolderName
      ? subfolderName.trim()
      : `Client_${(nomMarque || 'Marque').trim().replace(/\s+/g, '_')}`;

    const { folderId, webViewLink, simulated } = await createDriveFolder(
      folderName,
      parentFolderId
    );

    // Update Supabase if creating a client root folder
    if (prospectId && !subfolderName && isServerSupabaseConfigured()) {
      const supabase = createServerSupabase();
      await supabase
        .from('prospects')
        .update({
          drive_folder_id: folderId,
          statut: 'Signé',
          date_dernier_contact: new Date().toISOString(),
        })
        .eq('id', prospectId);
    }

    return NextResponse.json({
      success: true,
      folderId,
      folderName,
      webViewLink,
      simulated,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Erreur lors de la création du dossier Google Drive.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

