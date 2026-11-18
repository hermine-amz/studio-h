import { NextRequest, NextResponse } from 'next/server';
import { createDriveFolder, shareDriveFolderPublicRead } from '@/lib/google-drive';
import { sendBrevoDeliveryEmail } from '@/lib/brevo';
import { requireStudioAdmin } from '@/lib/supabase/admin';

function safeFolderPart(value: string): string {
  return value.normalize('NFKC').replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 60) || 'Client';
}

export async function POST(request: NextRequest) {
  const auth = await requireStudioAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const commandeId = typeof body?.commandeId === 'string' ? body.commandeId : '';

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(commandeId)) {
      return NextResponse.json({ error: 'Identifiant de commande invalide.' }, { status: 400 });
    }

    const { data: commande, error: orderError } = await auth.supabase
      .from('commandes_ugc')
      .select('id, prospect_id, nom_pack, statut_paiement, nombre_creations, drive_subfolder_id')
      .eq('id', commandeId)
      .maybeSingle();

    if (orderError) throw orderError;
    if (!commande) {
      return NextResponse.json({ error: 'Commande introuvable.' }, { status: 404 });
    }

    if (commande.statut_paiement !== 'Payé') {
      return NextResponse.json(
        { error: 'Livraison bloquée : le paiement de cette commande n’est pas confirmé.' },
        { status: 409 }
      );
    }

    if (!commande.prospect_id) {
      return NextResponse.json({ error: 'Cette commande n’est liée à aucune fiche client.' }, { status: 409 });
    }

    const { data: prospect, error: prospectError } = await auth.supabase
      .from('prospects')
      .select('nom_marque, contact_nom, contact_email, drive_folder_id')
      .eq('id', commande.prospect_id)
      .maybeSingle();

    if (prospectError) throw prospectError;
    if (!prospect) {
      return NextResponse.json({ error: 'Fiche client introuvable.' }, { status: 409 });
    }
    if (!prospect.contact_email) {
      return NextResponse.json({ error: 'Adresse e-mail du client manquante dans sa fiche.' }, { status: 409 });
    }

    const { data: medias, error: mediaError } = await auth.supabase
      .from('medias_creations')
      .select('id, pret_pour_livraison')
      .eq('commande_id', commandeId);

    if (mediaError) throw mediaError;

    const expectedCount = Math.max(1, commande.nombre_creations || 0);
    if (!medias || medias.length < expectedCount || medias.some((media) => media.pret_pour_livraison !== true)) {
      return NextResponse.json(
        { error: 'Livraison bloquée : toutes les créations prévues doivent être enregistrées et marquées comme prêtes.' },
        { status: 409 }
      );
    }

    const brandName = prospect.nom_marque || 'Client';
    const packName = commande.nom_pack || 'Pack UGC';
    let folderId = commande.drive_subfolder_id;

    if (!folderId) {
      const folder = await createDriveFolder(
        'Livraison_' + safeFolderPart(brandName) + '_' + safeFolderPart(packName),
        prospect.drive_folder_id || undefined
      );
      folderId = folder.folderId;

      const { error: folderUpdateError } = await auth.supabase
        .from('commandes_ugc')
        .update({ drive_subfolder_id: folderId })
        .eq('id', commandeId);
      if (folderUpdateError) throw folderUpdateError;
    }

    const { publicUrl, simulated } = await shareDriveFolderPublicRead(folderId);

    const { error: deliveryUpdateError } = await auth.supabase
      .from('commandes_ugc')
      .update({
        statut_production: 'Livré',
        lien_livraison_public: publicUrl,
      })
      .eq('id', commandeId);

    if (deliveryUpdateError) {
      throw new Error('Le dossier a été partagé, mais le statut de livraison n’a pas pu être enregistré. Vérification manuelle nécessaire.');
    }

    let emailSent = false;
    let emailError: string | undefined;
    try {
      const emailResult = await sendBrevoDeliveryEmail({
        toEmail: prospect.contact_email,
        toName: prospect.contact_nom || brandName,
        brandName,
        packName,
        deliveryLink: publicUrl,
        creationsCount: medias.length,
      });
      emailSent = emailResult.sent && !emailResult.simulated;
      if (emailResult.simulated) emailError = 'Brevo non configuré : aucun e-mail réel n’a été envoyé.';
    } catch (error) {
      emailError = error instanceof Error ? error.message : 'Échec de l’envoi de l’e-mail.';
    }

    return NextResponse.json({
      success: true,
      driveSubfolderId: folderId,
      lienLivraisonPublic: publicUrl,
      emailSent,
      emailError,
      simulated,
    });
  } catch (error) {
    console.error('[orders/deliver]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de la livraison.' },
      { status: 500 }
    );
  }
}
