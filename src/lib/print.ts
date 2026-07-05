/** Lance l'impression native — n'imprime que la facture (#invoice-preview) */
export function printInvoice(): void {
  const el = document.getElementById('invoice-preview')
  if (!el) return

  document.body.classList.add('is-printing')

  const cleanup = () => {
    document.body.classList.remove('is-printing')
  }

  window.addEventListener('afterprint', cleanup, { once: true })
  window.print()

  // Secours si afterprint n'est pas déclenché (mobile)
  setTimeout(cleanup, 1000)
}
