/**
 * Webhook System
 * Re-exports from the built-in plugin system
 */

export {
  WebhookPlugin,
  type WebhookPluginConfig,
  type WebhookEndpoint,
  type WebhookDelivery,
  type CreateEndpointInput,
  type UpdateEndpointInput,
  type DeleteEndpointInput,
  type GetEndpointInput,
  type TriggerInput,
  type GetDeliveryInput,
  type ListDeliveriesInput,
  type RetryDeliveryInput,
} from '../plugins/builtin/plugins/WebhookPlugin'

// Re-export webhookManager singleton for convenience
import { WebhookPlugin } from '../plugins/builtin/plugins/WebhookPlugin'

export const webhookManager = new WebhookPlugin()
