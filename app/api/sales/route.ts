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

    // Calculate totals
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0)
    const todaySales = sales.filter(sale => {
      const today = new Date()
      const saleDate = new Date(sale.createdAt)
      return saleDate.toDateString() === today.toDateString()
    })
    const todayRevenue = todaySales.reduce((sum, sale) => sum + sale.total, 0)

    return NextResponse.json({
      sales,
      summary: {
        totalRevenue,
        totalSales: sales.length,
        todayRevenue,
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

