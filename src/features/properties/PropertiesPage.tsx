import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getPropertyTypes, createPropertyType, updatePropertyType, togglePropertyType,
  getProperties, createProperty, updateProperty, updatePropertyStatus,
  type PropertyTypeRow, type PropertyRow,
} from './propertiesApi'

const STATUS_COLORS: Record<string, string> = {
  Available: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  Occupied: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  Maintenance: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  OutOfOrder: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
}

const emptyTypeForm = { name: '', description: '', maxOccupancy: '2', baseRatePerNight: '0' }
const emptyPropForm = { propertyTypeId: '', name: '', number: '', floorLevel: '', notes: '' }

export function PropertiesPage() {
  const [tab, setTab] = useState<'properties' | 'types'>('properties')
  const qc = useQueryClient()

  const { data: types = [] } = useQuery({ queryKey: ['property-types'], queryFn: getPropertyTypes })
  const { data: properties = [] } = useQuery({ queryKey: ['properties'], queryFn: () => getProperties() })

  const [typeModal, setTypeModal] = useState<null | 'add' | PropertyTypeRow>(null)
  const [propModal, setPropModal] = useState<null | 'add' | PropertyRow>(null)
  const [typeForm, setTypeForm] = useState(emptyTypeForm)
  const [propForm, setPropForm] = useState(emptyPropForm)

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['property-types'] })
    qc.invalidateQueries({ queryKey: ['properties'] })
  }

  const saveType = useMutation({
    mutationFn: async () => {
      const data = { name: typeForm.name, description: typeForm.description || null, maxOccupancy: Number(typeForm.maxOccupancy), baseRatePerNight: Number(typeForm.baseRatePerNight) }
      if (typeof typeModal === 'object' && typeModal) await updatePropertyType(typeModal.id, data)
      else await createPropertyType(data)
    },
    onSuccess: () => { setTypeModal(null); invalidate() },
  })

  const saveProp = useMutation({
    mutationFn: async () => {
      const data = { propertyTypeId: propForm.propertyTypeId, name: propForm.name, number: propForm.number, floorLevel: propForm.floorLevel ? Number(propForm.floorLevel) : null, notes: propForm.notes || null }
      if (typeof propModal === 'object' && propModal) await updateProperty(propModal.id, data)
      else await createProperty(data)
    },
    onSuccess: () => { setPropModal(null); invalidate() },
  })

  const toggleType = useMutation({
    mutationFn: ({ id, activate }: { id: string; activate: boolean }) => togglePropertyType(id, activate),
    onSuccess: invalidate,
  })

  const changeStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updatePropertyStatus(id, status),
    onSuccess: invalidate,
  })

  const openTypeModal = (t: 'add' | PropertyTypeRow) => {
    setTypeModal(t)
    setTypeForm(typeof t === 'object' ? { name: t.name, description: t.description ?? '', maxOccupancy: String(t.maxOccupancy), baseRatePerNight: String(t.baseRatePerNight) } : emptyTypeForm)
  }

  const openPropModal = (p: 'add' | PropertyRow) => {
    setPropModal(p)
    setPropForm(typeof p === 'object' ? { propertyTypeId: types.find(t => t.name === p.propertyTypeName)?.id ?? '', name: p.name, number: p.number, floorLevel: p.floorLevel != null ? String(p.floorLevel) : '', notes: p.notes ?? '' } : { ...emptyPropForm, propertyTypeId: types[0]?.id ?? '' })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Properties</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage accommodation units and types</p>
        </div>
        <button onClick={() => tab === 'types' ? openTypeModal('add') : openPropModal('add')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          + Add {tab === 'types' ? 'Type' : 'Property'}
        </button>
      </div>

      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {(['properties', 'types'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
            {t === 'types' ? 'Property Types' : 'Properties'}
          </button>
        ))}
      </div>

      {tab === 'types' && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
              <tr>{['Name', 'Max Occupancy', 'Rate / Night', 'Status', ''].map(h => <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {types.map(t => (
                <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 dark:text-gray-100">{t.name}</div>
                    {t.description && <div className="text-xs text-gray-400">{t.description}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{t.maxOccupancy} guests</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">R {t.baseRatePerNight.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'}`}>
                      {t.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => openTypeModal(t)} className="text-xs text-blue-600 hover:underline">Edit</button>
                      <button onClick={() => toggleType.mutate({ id: t.id, activate: !t.isActive })} className="text-xs text-gray-500 hover:underline">
                        {t.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {types.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">No property types yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'properties' && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
              <tr>{['No.', 'Name', 'Type', 'Rate / Night', 'Status', ''].map(h => <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {properties.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-mono text-gray-500">{p.number}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{p.name}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{p.propertyTypeName}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">R {p.baseRatePerNight.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <select value={p.status} onChange={e => changeStatus.mutate({ id: p.id, status: e.target.value })}
                      className={`text-xs rounded-full px-2 py-0.5 font-medium border-0 cursor-pointer ${STATUS_COLORS[p.status] ?? ''}`}>
                      {['Available', 'Occupied', 'Maintenance', 'OutOfOrder'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openPropModal(p)} className="text-xs text-blue-600 hover:underline">Edit</button>
                  </td>
                </tr>
              ))}
              {properties.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">No properties yet. Add a property type first.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {typeModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{typeof typeModal === 'string' ? 'Add' : 'Edit'} Property Type</h3>
            {[
              { label: 'Name', key: 'name', type: 'text' },
              { label: 'Description', key: 'description', type: 'text' },
              { label: 'Max Occupancy', key: 'maxOccupancy', type: 'number' },
              { label: 'Base Rate / Night (R)', key: 'baseRatePerNight', type: 'number' },
            ].map(({ label, key, type }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
                <input type={type} value={typeForm[key as keyof typeof typeForm]}
                  onChange={e => setTypeForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button onClick={() => saveType.mutate()} disabled={saveType.isPending}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saveType.isPending ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => setTypeModal(null)} className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm">Cancel</button>
            </div>
            {saveType.isError && <p className="text-sm text-red-500">{String(saveType.error)}</p>}
          </div>
        </div>
      )}

      {propModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{typeof propModal === 'string' ? 'Add' : 'Edit'} Property</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
              <select value={propForm.propertyTypeId} onChange={e => setPropForm(f => ({ ...f, propertyTypeId: e.target.value }))}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                {types.filter(t => t.isActive).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            {[
              { label: 'Name', key: 'name', type: 'text', placeholder: 'e.g. Chalet 1' },
              { label: 'Unit Number', key: 'number', type: 'text', placeholder: 'e.g. 101' },
              { label: 'Floor Level', key: 'floorLevel', type: 'number', placeholder: 'Optional' },
              { label: 'Notes', key: 'notes', type: 'text', placeholder: 'Optional' },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
                <input type={type} placeholder={placeholder} value={propForm[key as keyof typeof propForm] ?? ''}
                  onChange={e => setPropForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button onClick={() => saveProp.mutate()} disabled={saveProp.isPending}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saveProp.isPending ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => setPropModal(null)} className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm">Cancel</button>
            </div>
            {saveProp.isError && <p className="text-sm text-red-500">{String(saveProp.error)}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
