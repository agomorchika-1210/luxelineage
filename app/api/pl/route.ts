import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'

// GET /api/pl - Get Profit & Loss report (admin only)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const saleWhere: any = {
      order: {
        // Returns are stored as orders with isReturn=true.
        // Sales should only include non-return orders.
        isReturn: false,
      }
    }
    if (startDate || endDate) {
      saleWhere.createdAt = {}
      if (startDate) {
        saleWhere.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        saleWhere.createdAt.lte = new Date(endDate)
      }
    }

    // Get all sales (excluding returns)
    const sales = await prisma.sale.findMany({
      where: saleWhere,
      include: {
        order: {
          include: {
            items: {
              include: {
                product: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Get all returns (orders marked as returns)
    const returnsWhere: any = { isReturn: true }
    if (startDate || endDate) {
      returnsWhere.createdAt = {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate) } : {}),
      }
    }

    const returns = await prisma.order.findMany({
      where: returnsWhere,
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    })

    // Calculate Revenue (sales totals are precomputed on the sale/order)
    let totalRevenue = 0
    sales.forEach(sale => {
      totalRevenue += sale.total
    })

    // Calculate Returns (contra revenue)
    let totalReturns = 0
    returns.forEach(returnOrder => {
      totalReturns += returnOrder.total
    })

    // Calculate Discounts (contra revenue)
    // Note: discounts are not currently set by checkout/POS flows in this repo,
    // but the schema supports them; this keeps P&L correct once discounts are introduced.
    let totalDiscounts = 0
    sales.forEach(sale => {
      // Order-level discount
      totalDiscounts += (sale.order.discountAmount || 0)
      // Item-level discount: treat as a total discount amount per line item (not per-unit),
      // since schema doesn't specify per-unit semantics.
      sale.order.items.forEach((item: any) => {
        totalDiscounts += (item.discount || 0)
      })
    })

    // Net Revenue = Sales - Returns - Discounts
    const netRevenue = totalRevenue - totalReturns - totalDiscounts

    // Calculate COGS (Cost of Goods Sold)
    let totalCOGS = 0

    sales.forEach(sale => {
      sale.order.items.forEach((item: any) => {
        const itemCost = (item.cost || 0) * item.quantity
        totalCOGS += itemCost
      })
    })

    // Calculate Returns COGS (contra COGS)
    let returnsCOGS = 0
    returns.forEach(returnOrder => {
      returnOrder.items.forEach((item: any) => {
        const itemCost = (item.cost || 0) * item.quantity
        returnsCOGS += itemCost
      })
    })

    // Net COGS = COGS - Returns COGS
    const netCOGS = totalCOGS - returnsCOGS

    // Gross Profit = Net Revenue - Net COGS
    const grossProfit = netRevenue - netCOGS

    // Get Expenses
    const expenses = await prisma.expense.findMany({
      where: {
        ...(startDate || endDate ? {
          date: {
            ...(startDate ? { gte: new Date(startDate) } : {}),
            ...(endDate ? { lte: new Date(endDate) } : {}),
          }
        } : {})
      }
    })

    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0)

    // Net Profit/Loss = Gross Profit - Expenses
    const netProfit = grossProfit - totalExpenses

    // Calculate profit margins
    const grossProfitMargin = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0
    const netProfitMargin = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0

    // Group expenses by category
    const expensesByCategory = expenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      period: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
      revenue: {
        totalSales: totalRevenue,
        returns: totalReturns,
        discounts: totalDiscounts,
        netRevenue,
      },
      cogs: {
        totalCOGS,
        returnsCOGS,
        // Kept for backwards compatibility with existing UI fields (discounts are in revenue).
        discounts: 0,
        netCOGS,
      },
      grossProfit,
      grossProfitMargin: parseFloat(grossProfitMargin.toFixed(2)),
      expenses: {
        total: totalExpenses,
        byCategory: expensesByCategory,
        items: expenses,
      },
      netProfit,
      netProfitMargin: parseFloat(netProfitMargin.toFixed(2)),
    })
  } catch (error: any) {
    console.error('Get P&L error:', error)
    console.error('Error details:', {
      message: error?.message,
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

