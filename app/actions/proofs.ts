'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import db from '@/lib/db'
import { uploadFile } from '@/lib/upload'
import { logAuditEvent } from './audit'

export async function uploadProof(formData: FormData) {
    const session = await auth()
    if (!session || !session.user || !session.user.id) {
        return { success: false, error: "Unauthorized" }
    }

    try {
        const file = formData.get('file') as File
        const competenceId = formData.get('competenceId') as string
        const comment = formData.get('comment') as string

        if (!file || !competenceId) throw new Error('File and Competence ID are required')

        let fileUrl = ""
        try {
            fileUrl = await uploadFile(file, session.user.id)
        } catch (e) {
            throw new Error("Upload failed")
        }

        const proof = await db.proof.create({
            data: {
                userId: session.user.id,
                competenceId: competenceId,
                title: file.name, // Use filename as title since it's required
                url: fileUrl,
                type: file.type.startsWith('image/') ? 'IMG' : 'PDF',
                description: comment,
                status: 'PENDING'
            }
        })

        await logAuditEvent("UPLOAD_PROOF", "Proof", proof.id, { competenceId });

        revalidatePath('/dashboard/journal')
        return { success: true }
    } catch (e: any) {
        console.error('Upload failed:', e)
        return { success: false, error: e.message }
    }
}
