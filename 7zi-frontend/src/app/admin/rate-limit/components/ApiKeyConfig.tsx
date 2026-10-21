/**
 * API Key Configuration Component
 * 
 * Manage API key rate limiting rules and tier configurations
 * 
 * @version 1.12.0
 */

import { useState } from 'react'
import { 
  Key, 
  Plus, 
  Edit, 
  Trash2, 
  Save,
  X,
  Zap,
  TrendingUp,
  Calendar
} from 'lucide-react'
import { useApiKeyTiers, useRateLimitKeys } from '../hooks/useRateLimitApi'
import type { ApiKeyTierConfig } from '../hooks/useRateLimitApi'

export function ApiKeyConfig() {
  const { tiers, loading: tiersLoading, updateTier } = useApiKeyTiers()
  const { keys, loading: keysLoading } = useRateLimitKeys()
  
  const [editingTier, setEditingTier] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<ApiKeyTierConfig>>({})

  const handleEditTier = (tierId: string) => {
    const tier = tiers[tierId]
    if (tier) {
      setEditingTier(tierId)
      setEditForm(tier)
    }
  }

  const handleSaveTier = async () => {
    if (editingTier && editForm) {
      const success = await updateTier(editingTier, editForm)
      if (success) {
        setEditingTier(null)
        setEditForm({})
      }
    }
  }

  const handleCancelEdit = () => {
    setEditingTier(null)
    setEditForm({})
  }

  const getTierColor = (tierId: string): string => {
    const colors: Record<string, string> = {
      free: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
      basic: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
      pro: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
      enterprise: 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200',
    }
    return colors[tierId] || colors.free
  }

  return (
    <div className="space-y-6">
      {/* Tier Configuration */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Key className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              API Key Tier Configuration
            </h2>
          </div>
        </div>

        {tiersLoading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(tiers).map(([tierId, tier]) => (
              <TierCard
                key={tierId}
                tierId={tierId}
                tier={tier}
                isEditing={editingTier === tierId}
                editForm={editForm}
                onEdit={handleEditTier}
                onSave={handleSaveTier}
                onCancel={handleCancelEdit}
                onChange={setEditForm}
                getTierColor={getTierColor}
              />
            ))}
          </div>
        )}
      </div>

      {/* Active API Keys */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          Active API Keys
        </h2>

        {keysLoading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
            ))}
          </div>
        ) : keys.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Key
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Layer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Current Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Remaining
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Algorithm
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {keys.map((key, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {key.key}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 capitalize">
                      {key.layer}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {key.currentCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${(key.remaining / key.limit) * 100}%` }}
                          />
                        </div>
                        <span className="text-gray-700 dark:text-gray-300">
                          {key.remaining}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {key.algorithm}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No active API keys found</p>
          </div>
        )}
      </div>
    </div>
  )
}

interface TierCardProps {
  tierId: string
  tier: ApiKeyTierConfig
  isEditing: boolean
  editForm: Partial<ApiKeyTierConfig>
  onEdit: (id: string) => void
  onSave: () => void
  onCancel: () => void
  onChange: (form: Partial<ApiKeyTierConfig>) => void
  getTierColor: (id: string) => string
}

function TierCard({
  tierId,
  tier,
  isEditing,
  editForm,
  onEdit,
  onSave,
  onCancel,
  onChange,
  getTierColor
}: TierCardProps) {
  const currentForm = isEditing ? editForm : tier

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTierColor(tierId)}`}>
              {tier.name}
            </span>
            {!isEditing && (
              <button
                onClick={() => onEdit(tierId)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <Edit className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Rate */}
            <MetricCard
              icon={Zap}
              label="Request Rate"
              value={currentForm.rate || 0}
              unit="req/s"
              editing={isEditing}
              onChange={(value) => onChange({ ...currentForm, rate: value })}
            />

            {/* Burst */}
            <MetricCard
              icon={TrendingUp}
              label="Burst Capacity"
              value={currentForm.burst || 0}
              unit="requests"
              editing={isEditing}
              onChange={(value) => onChange({ ...currentForm, burst: value })}
            />

            {/* Daily Limit */}
            <MetricCard
              icon={Calendar}
              label="Daily Limit"
              value={currentForm.dailyLimit || 0}
              unit="requests/day"
              editing={isEditing}
              onChange={(value) => onChange({ ...currentForm, dailyLimit: value })}
            />
          </div>
        </div>

        {/* Action Buttons */}
        {isEditing && (
          <div className="flex items-start space-x-2 ml-4">
            <button
              onClick={onSave}
              className="inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
            >
              <Save className="h-4 w-4 mr-1.5" />
              Save
            </button>
            <button
              onClick={onCancel}
              className="inline-flex items-center px-3 py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md transition-colors"
            >
              <X className="h-4 w-4 mr-1.5" />
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

interface MetricCardProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  unit: string
  editing: boolean
  onChange: (value: number) => void
}

function MetricCard({ icon: Icon, label, value, unit, editing, onChange }: MetricCardProps) {
  return (
    <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
      <Icon className="h-5 w-5 text-gray-400" />
      <div className="flex-1">
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        {editing ? (
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(parseInt(e.target.value) || 0)}
            className="mt-1 w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        ) : (
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {value.toLocaleString()} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">{unit}</span>
          </p>
        )}
      </div>
    </div>
  )
}
