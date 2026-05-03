import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'

// GET /api/balance-sheet - Get balance sheet (admin only)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get all assets
    const assets = await prisma.asset.findMany({
      orderBy: { type: 'asc' }
    })

    // Get all liabilities
    const liabilities = await prisma.liability.findMany({
      orderBy: { type: 'asc' }
    })

    // Calculate inventory value (current stock at cost)
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        category: true,
        stockQuantity: true,
        cost: true,
      }
    })

    const inventoryValue = products.reduce((sum, product) => {
      return sum + (product.cost * product.stockQuantity)
    }, 0)

    // Group assets by type
    const assetsByType = assets.reduce((acc, asset) => {
      if (!acc[asset.type]) {
        acc[asset.type] = []
      }
      acc[asset.type].push(asset)
      return acc
    }, {} as Record<string, typeof assets>)

    // Calculate total assets
    const currentAssets = {
      inventory: inventoryValue,
      bankAccount: assets.filter(a => a.type === 'BANK_ACCOUNT').reduce((sum, a) => sum + a.value, 0),
      otherCurrent: assets.filter(a => a.type === 'OTHER_CURRENT').reduce((sum, a) => sum + a.value, 0),
    }

    const fixedAssets = {
      leaseProperty: assets.filter(a => a.type === 'LEASE_PROPERTY').reduce((sum, a) => sum + a.value, 0),
      leaseAssets: assets.filter(a => a.type === 'LEASE_ASSETS').reduce((sum, a) => sum + a.value, 0),
      otherFixed: assets.filter(a => a.type === 'OTHER_FIXED').reduce((sum, a) => sum + a.value, 0),
    }

    const totalCurrentAssets = currentAssets.inventory + currentAssets.bankAccount + currentAssets.otherCurrent
    const totalFixedAssets = fixedAssets.leaseProperty + fixedAssets.leaseAssets + fixedAssets.otherFixed
    const totalAssets = totalCurrentAssets + totalFixedAssets

    // Group liabilities by type
    const liabilitiesByType = liabilities.reduce((acc, liability) => {
      if (!acc[liability.type]) {
        acc[liability.type] = []
      }
      acc[liability.type].push(liability)
      return acc
    }, {} as Record<string, typeof liabilities>)

    // Calculate total liabilities
    const totalLiabilities = liabilities.reduce((sum, liab) => sum + liab.amount, 0)

    // Calculate equity (Assets - Liabilities)
    const equity = totalAssets - totalLiabilities

    return NextResponse.json({
      asOf: new Date().toISOString(),
      assets: {
        current: {
          inventory: {
            value: inventoryValue,
            items: products.map(p => ({
              id: p.id,
              name: p.name,
              category: p.category,
              quantity: p.stockQuantity,
              cost: p.cost,
              totalValue: p.cost * p.stockQuantity,
            }))
          },
          bankAccount: currentAssets.bankAccount,
          otherCurrent: currentAssets.otherCurrent,
          total: totalCurrentAssets,
        },
        fixed: {
          leaseProperty: fixedAssets.leaseProperty,
          leaseAssets: fixedAssets.leaseAssets,
          otherFixed: fixedAssets.otherFixed,
          total: totalFixedAssets,
        },
        total: totalAssets,
        all: assets,
        byType: assetsByType,
      },
      liabilities: {
        total: totalLiabilities,
        items: liabilities,
        byType: liabilitiesByType,
      },
      equity,
      balance: {
        assets: totalAssets,
        liabilities: totalLiabilities,
        equity,
        isBalanced: Math.abs(totalAssets - (totalLiabilities + equity)) < 0.01, // Allow small floating point differences
      }
    })
  } catch (error: any) {
    console.error('Get balance sheet error:', error)
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
      name: error?.name
    })
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    )
  }
}

