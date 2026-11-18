import { NextRequest, NextResponse } from 'next/server';
import {
  createDriveFolder,
  shareDriveFolderPublicRead,
} from '@/lib/google-drive';
import { sendBrevoDeliveryEmail } from '@/lib/brevo';
import {
  createServerSupabase,
  isServerSupabaseConfigured,
} from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      commandeId,
      driveSubfolderId,
      driveParentFolderId,
      contactEmail,
      contactName,
      brandName,
      packName,
      creationsCount,
    }: {
      commandeId: string;
      driveSubfolderId?: string | null;
      driveParentFolderId?: string | null;
      contactEmail?: string | null;
      contactName?: string | null;
      brandName: string;
      packName: string;
      creationsCount: number;
    } = body;

    if (!commandeId) {
      return NextResponse.json(
        { error: 'Identifiant de commande manquant.' },
        { status: 400 }
      );
    }

    // 1. Ensure subfolder ID exists
    let targetFolderId = driveSubfolderId;
    if (!targetFolderId) {
      const cleanName = `Livraison_${(brandName || 'Client').replace(/\s+/g, '_')}_${(packName || 'Pack').replace(/\s+/g, '_')}`;
      const created = await createDriveFolder(
        cleanName,
        driveParentFolderId || undefined
      );
      targetFolderId = created.folderId;
    }

    // 2. Set Drive permissions to "Anyone with link can read"
    const { publicUrl, simulated: driveSimulated } =
      await shareDriveFolderPublicRead(targetFolderId);

    // 3. Update order in Supabase if configured
    if (isServerSupabaseConfigured()) {
      const supabase = createServerSupabase();
      await supabase
        .from('commandes_ugc')
        .update({
          statut_production: 'Livré',
          drive_subfolder_id: targetFolderId,
          lien_livraison_public: publicUrl,
        })
        .eq('id', commandeId);
    }

    // 4. Send professional transactional email via Brevo
    let emailResult = { sent: false, simulated: true };
    if (contactEmail) {
      emailResult = await sendBrevoDeliveryEmail({
        toEmail: contactEmail,
        toName: contactName || brandName,
        brandName,
        packName,
        deliveryLink: publicUrl,
        creationsCount: creationsCount || 1,
      });
    }

    return NextResponse.json({
      success: true,
      driveSubfolderId: targetFolderId,
      lienLivraisonPublic: publicUrl,
      emailSent: emailResult.sent,
      simulated: driveSimulated || emailResult.simulated,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Erreur lors de la livraison de la commande.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

