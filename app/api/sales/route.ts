import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'

// GET /api/sales - Get sales reports (admin only)
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

    const where: any = {}
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        where.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate)
      }
    }

    const sales = await prisma.sale.findMany({
      where,
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

    // Calculate totals and profits
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0)
    
    // Calculate total cost and profit for all sales
    let totalCost = 0
    let totalProfit = 0
    
    sales.forEach(sale => {
      sale.order.items.forEach((item: any) => {
        const itemCost = (item.cost || 0) * item.quantity
        const itemRevenue = item.price * item.quantity
        totalCost += itemCost
        totalProfit += (itemRevenue - itemCost)
      })
    })

    const todaySales = sales.filter(sale => {
      const today = new Date()
      const saleDate = new Date(sale.createdAt)
      return saleDate.toDateString() === today.toDateString()
    })
    const todayRevenue = todaySales.reduce((sum, sale) => sum + sale.total, 0)
    
    // Calculate today's profit
    let todayCost = 0
    let todayProfit = 0
    todaySales.forEach(sale => {
      sale.order.items.forEach((item: any) => {
        const itemCost = (item.cost || 0) * item.quantity
        const itemRevenue = item.price * item.quantity
        todayCost += itemCost
        todayProfit += (itemRevenue - itemCost)
      })
    })

    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0
    const todayProfitMargin = todayRevenue > 0 ? (todayProfit / todayRevenue) * 100 : 0

    return NextResponse.json({
      sales,
      summary: {
        totalRevenue,
        totalCost,
        totalProfit,
        profitMargin: parseFloat(profitMargin.toFixed(2)),
        totalSales: sales.length,
        todayRevenue,
        todayCost,
        todayProfit,
        todayProfitMargin: parseFloat(todayProfitMargin.toFixed(2)),
        todaySales: todaySales.length
      }
    })
  } catch (error) {
    console.error('Get sales error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

