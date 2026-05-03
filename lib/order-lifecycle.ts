/**
 * Order lifecycle / state machine.
 *
 * This module is the single source of truth for how an order moves between
 * statuses, who is responsible for what, and which rules apply per channel.
 * Every API route that mutates an order's status MUST go through one of the
 * helpers below so behavior stays consistent and auditable.
 *
 * Modeled after standard retail/e-commerce flows (Shopify, WooCommerce, Square,
 * Stripe + Order Management Systems):
 *
 *   ONLINE (web shop, customer-initiated)
 *   ─────────────────────────────────────
 *   cart -> checkout (payment) -> PENDING            (stock decremented at this step)
 *                                  ↓ admin reviews / payment confirmed
 *                                PROCESSED           (Sale row created here)
 *                                  ↓ packed + handed off to courier
 *                                SHIPPED
 *                                  ↓ customer confirms receipt
 *                                DELIVERED           (terminal)
 *
 *   POS (in-store, admin-initiated)
 *   ───────────────────────────────
 *   counter cart -> tendered -> PROCESSED            (terminal: stock + Sale created at sale time)
 *
 *   Cancellations
 *   ─────────────
 *   ONLINE: allowed from PENDING, PROCESSED, SHIPPED. Restocks each unit and
 *           removes the Sale row so reporting/P&L stays clean.
 *   POS:    allowed from PROCESSED. Restocks each unit and removes the Sale.
 *           After cancellation use the Returns module for accounting.
 *   DELIVERED orders cannot be cancelled — they must go through the Returns
 *   module (RMA), which creates a separate isReturn order.
 *
 *   Returns
 *   ───────
 *   Returns are recorded as a separate Order with `isReturn = true` and status
 *   CANCELLED. Stock is incremented when the return is created. Those records
 *   never go through process/ship/deliver/cancel.
 */

import type { Order, OrderSource, OrderStatus } from '@prisma/client'

export class OrderTransitionError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = 'OrderTransitionError'
    this.status = status
  }
}

export type TransitionAction =
  | 'process'
  | 'ship'
  | 'deliver'
  | 'cancel'

/**
 * Allowed source statuses for a given action, per channel.
 * If a (source, action) pair is not present, the action is not permitted for
 * that channel at all.
 */
const ALLOWED_TRANSITIONS: Record<
  OrderSource,
  Partial<Record<TransitionAction, { from: OrderStatus[]; to: OrderStatus }>>
> = {
  ONLINE: {
    process: { from: ['PENDING'], to: 'PROCESSED' },
    ship: { from: ['PROCESSED'], to: 'SHIPPED' },
    deliver: { from: ['SHIPPED'], to: 'DELIVERED' },
    cancel: { from: ['PENDING', 'PROCESSED', 'SHIPPED'], to: 'CANCELLED' },
  },
  POS: {
    // POS sales are completed at creation. Only cancel is meaningful afterwards.
    cancel: { from: ['PROCESSED'], to: 'CANCELLED' },
  },
}

/**
 * Validate that a given action is allowed on this order.
 * Throws OrderTransitionError with a clear message + appropriate HTTP status.
 */
export function assertOrderTransition(
  order: Pick<Order, 'id' | 'status' | 'source' | 'isReturn'>,
  action: TransitionAction
): { from: OrderStatus[]; to: OrderStatus } {
  if (order.isReturn) {
    throw new OrderTransitionError(
      'Return orders cannot be modified. Use the Returns module instead.',
      400
    )
  }

  const channelRules = ALLOWED_TRANSITIONS[order.source]
  const rule = channelRules?.[action]
  if (!rule) {
    throw new OrderTransitionError(
      `Action "${action}" is not supported for ${order.source} orders.`,
      400
    )
  }

  if (!rule.from.includes(order.status)) {
    throw new OrderTransitionError(
      `Cannot ${action} a ${order.source} order in status ${order.status}. Expected: ${rule.from.join(' or ')}.`,
      400
    )
  }

  return rule
}

/**
 * Human readable description of a transition (used in notifications + audit
 * logs). Keep messages short and specific.
 */
export function describeTransition(
  source: OrderSource,
  action: TransitionAction,
  orderId: string
): string {
  switch (action) {
    case 'process':
      return `Order ${orderId} has been processed`
    case 'ship':
      return `Order ${orderId} has been shipped`
    case 'deliver':
      return `Order ${orderId} has been delivered`
    case 'cancel':
      return source === 'POS'
        ? `POS sale ${orderId} has been cancelled`
        : `Order ${orderId} has been cancelled`
  }
}

/**
 * Resolve a "next" action for an order based on its current state.
 * Used by the UI to decide which buttons to show.
 */
export function nextActionFor(
  order: Pick<Order, 'status' | 'source' | 'isReturn'>
): TransitionAction | null {
  if (order.isReturn) return null
  const rules = ALLOWED_TRANSITIONS[order.source]
  if (!rules) return null

  for (const [action, rule] of Object.entries(rules) as [
    TransitionAction,
    { from: OrderStatus[]; to: OrderStatus }
  ][]) {
    if (action === 'cancel') continue
    if (rule.from.includes(order.status)) {
      return action
    }
  }

  return null
}

export const ORDER_LIFECYCLE_RULES = ALLOWED_TRANSITIONS
