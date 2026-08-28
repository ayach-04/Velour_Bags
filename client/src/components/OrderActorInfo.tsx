import type { ConfirmedBy } from '../api/orders'

export default function OrderActorInfo({
  confirmedBy,
  cancelledBy,
}: {
  confirmedBy?: ConfirmedBy | null
  cancelledBy?: ConfirmedBy | null
}) {
  const roleLabel = (type?: string) => (type === 'worker' ? 'Employé' : 'Admin')
  const fmt = (at?: string) =>
    at
      ? ` le ${new Date(at).toLocaleDateString('fr-FR')} à ${new Date(at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
      : ''

  return (
    <div className="space-y-1.5">
      {confirmedBy?.name && (
        <p className="text-[11px] text-gray-500">
          Confirmée par <span className="font-medium text-gray-700">{confirmedBy.name}</span>{' '}
          ({roleLabel(confirmedBy.type)}){fmt(confirmedBy.at)}
        </p>
      )}
      {cancelledBy?.name && (
        <p className="text-[11px] text-gray-500">
          Annulée par <span className="font-medium text-gray-700">{cancelledBy.name}</span>{' '}
          ({roleLabel(cancelledBy.type)}){fmt(cancelledBy.at)}
        </p>
      )}
    </div>
  )
}
