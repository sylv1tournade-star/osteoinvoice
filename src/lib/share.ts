export async function sharePdf(
  blob: Blob,
  filename: string,
  patientName: string
): Promise<'shared' | 'downloaded' | 'cancelled'> {
  return sharePdfs([{ blob, filename }], patientName)
}

export async function sharePdfs(
  files: { blob: Blob; filename: string }[],
  patientName: string
): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const pdfFiles = files.map(
    (f) => new File([f.blob], f.filename, { type: 'application/pdf' })
  )

  const count = pdfFiles.length
  const title =
    count > 1
      ? `${count} factures - ${patientName}`
      : `Facture - ${patientName}`
  const text =
    count > 1
      ? `${count} notes d'honoraires pour ${patientName}`
      : `Note d'honoraires pour ${patientName}`

  if (navigator.canShare?.({ files: pdfFiles })) {
    try {
      await navigator.share({ title, text, files: pdfFiles })
      return 'shared'
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return 'cancelled'
    }
  }

  for (const f of files) {
    const url = URL.createObjectURL(f.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = f.filename
    a.click()
    URL.revokeObjectURL(url)
    await new Promise((r) => setTimeout(r, 300))
  }
  return 'downloaded'
}

export function shareViaEmail(
  email: string,
  patientName: string,
  count = 1
): void {
  const subject =
    count > 1
      ? encodeURIComponent(`${count} notes d'honoraires - ${patientName}`)
      : encodeURIComponent(`Note d'honoraires - ${patientName}`)
  const body = encodeURIComponent(
    count > 1
      ? `Bonjour,\n\nVeuillez trouver ci-joint ${count} notes d'honoraires pour ${patientName}.\n\nCordialement`
      : `Bonjour,\n\nVeuillez trouver ci-joint la note d'honoraires pour ${patientName}.\n\nCordialement`
  )
  const mailto = email
    ? `mailto:${email}?subject=${subject}&body=${body}`
    : `mailto:?subject=${subject}&body=${body}`
  window.location.href = mailto
}

export function shareViaWhatsApp(patientName: string, count = 1): void {
  const text = encodeURIComponent(
    count > 1
      ? `Bonjour, voici ${count} notes d'honoraires pour ${patientName}. (Joignez les PDF téléchargés)`
      : `Bonjour, voici la note d'honoraires pour ${patientName}. (Joignez le PDF téléchargé)`
  )
  window.open(`https://wa.me/?text=${text}`, '_blank')
}

export function downloadPdfs(files: { blob: Blob; filename: string }[]) {
  for (const f of files) {
    const url = URL.createObjectURL(f.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = f.filename
    a.click()
    URL.revokeObjectURL(url)
  }
}
