"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-light tracking-wide">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure store-level preferences for admin operations.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium tracking-wide">STORE PROFILE</CardTitle>
          <CardDescription>Basic information shown across invoices and reports.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="store-name">Store Name</Label>
            <Input id="store-name" placeholder="LUXELINEAGE" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="store-email">Support Email</Label>
            <Input id="store-email" type="email" placeholder="support@example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="store-phone">Support Phone</Label>
            <Input id="store-phone" placeholder="+1 555 000 0000" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">Default Currency</Label>
            <Input id="currency" placeholder="USD" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium tracking-wide">SALES SETTINGS</CardTitle>
          <CardDescription>Controls that affect POS workflow and order processing.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="low-stock-threshold">Low Stock Threshold</Label>
            <Input id="low-stock-threshold" type="number" placeholder="10" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="default-tax">Default Tax (%)</Label>
            <Input id="default-tax" type="number" placeholder="0" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="receipt-note">Receipt Footer Note</Label>
            <Input id="receipt-note" placeholder="Thank you for shopping with us." />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button disabled>Save Changes (coming soon)</Button>
      </div>
    </div>
  )
}
