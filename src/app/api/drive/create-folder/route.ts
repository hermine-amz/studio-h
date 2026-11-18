import { NextRequest, NextResponse } from 'next/server';
import { createDriveFolder, isRealDriveFolderId } from '@/lib/google-drive';
import { requireStudioAdmin } from '@/lib/supabase/admin';

function cleanFolderName(value: string): string {
  return value.normalize('NFKC').replace(/[\\u0000-\\u001f\\u007f]/g, '').trim().replace(/[\\/\\\\]+/g, '_').slice(0, 100);
}

export async function POST(request: NextRequest) {
  const auth = await requireStudioAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const prospectId = typeof body?.prospectId === 'string' ? body.prospectId : '';
    const suppliedName = typeof body?.nomMarque === 'string' ? body.nomMarque : '';
    const subfolderName = typeof body?.subfolderName === 'string' ? body.subfolderName : '';
    const parentFolderId = typeof body?.parentFolderId === 'string' ? body.parentFolderId : '';

    if (parentFolderId && !isRealDriveFolderId(parentFolderId)) {
      return NextResponse.json({ error: 'Identifiant du dossier parent invalide.' }, { status: 400 });
    }

    let brandName = suppliedName;
    if (prospectId) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(prospectId)) {
        return NextResponse.json({ error: 'Identifiant prospect invalide.' }, { status: 400 });
      }

      const { data: prospect, error: prospectError } = await auth.supabase
        .from('prospects')
        .select('id, nom_marque')
        .eq('id', prospectId)
        .maybeSingle();

      if (prospectError) throw prospectError;
      if (!prospect) {
        return NextResponse.json({ error: 'Prospect introuvable.' }, { status: 404 });
      }
      brandName = prospect.nom_marque;
    }

    const rawFolderName = subfolderName
      ? subfolderName
      : 'Client_' + (brandName || 'Marque').trim().replace(/\\s+/g, '_');
    const folderName = cleanFolderName(rawFolderName);

    if (!folderName) {
      return NextResponse.json(
        { error: 'Le nom de la marque ou du sous-dossier est requis.' },
        { status: 400 }
      );
    }

    const { folderId, webViewLink, simulated } = await createDriveFolder(
      folderName,
      parentFolderId || undefined
    );

    if (prospectId && !subfolderName) {
      const { error: updateError } = await auth.supabase
        .from('prospects')
        .update({
          drive_folder_id: folderId,
          statut: 'Signé',
          date_dernier_contact: new Date().toISOString(),
        })
        .eq('id', prospectId);

      if (updateError) {
        return NextResponse.json(
          { error: 'Le dossier Drive a été créé, mais la fiche prospect n’a pas pu être mise à jour.' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      folderId,
      folderName,
      webViewLink,
      simulated,
    });
  } catch (error) {
    console.error('[drive/create-folder]', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création du dossier Google Drive.' },
      { status: 500 }
    );
  }
}
