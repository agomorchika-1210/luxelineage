"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, XCircle, AlertCircle, Download, Folder } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import * as XLSX from "xlsx"

interface BulkImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportComplete: () => void
}

interface PreviewRow {
  name: string
  sku: string
  brand?: string
  category?: string
  price: number
  cost?: number
  stockQuantity: number
  description?: string
  image?: string
  sizes?: string[]
  colors?: string[]
}

export function BulkImportDialog({ open, onOpenChange, onImportComplete }: BulkImportDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [imagesFolder, setImagesFolder] = useState<string>("")
  const [preview, setPreview] = useState<PreviewRow[]>([])
  const [uploading, setUploading] = useState(false)
  const [importResults, setImportResults] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/csv'
    ]

    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast({
        title: "Invalid file type",
        description: "Please upload an Excel (.xlsx, .xls) or CSV file.",
        variant: "destructive",
      })
      return
    }

    setFile(selectedFile)
    setImportResults(null)

    // Parse and preview
    try {
      const arrayBuffer = await selectedFile.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const rawData = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: '' })

      if (!Array.isArray(rawData) || rawData.length === 0) {
        toast({
          title: "Empty file",
          description: "The file appears to be empty or has no data rows.",
          variant: "destructive",
        })
        setFile(null)
        return
      }

      // Parse preview (first 5 rows)
      const previewData: PreviewRow[] = []
      const fieldMappings: Record<string, string[]> = {
        name: ['name', 'product name', 'product', 'title', 'item name', 'item'],
        sku: ['sku', 'product sku', 'product code', 'code', 'item code', 'serial number', 'sn'],
        brand: ['brand', 'manufacturer', 'maker', 'company'],
        category: ['category', 'type', 'product category', 'cat'],
        price: ['price', 'selling price', 'sell price', 'retail price', 'unit price'],
        cost: ['cost', 'cost price', 'purchase price', 'buy price', 'wholesale price'],
        stockQuantity: ['stock', 'quantity', 'stock quantity', 'qty', 'inventory', 'available'],
        description: ['description', 'desc', 'details'],
        image: ['image', 'image url', 'photo', 'picture'],
        sizes: ['sizes', 'size', 'sizez', 'siz'],
        colors: ['colors', 'color', 'colours', 'colour'],
      }

      const normalizeColumn = (col: string): string => {
        return col.toLowerCase().trim().replace(/[^a-z0-9\s]/gi, ' ').replace(/\s+/g, ' ')
      }

      const firstRow = rawData[0] as Record<string, any>
      const columns = Object.keys(firstRow)
      const columnMap: Record<string, string> = {}

      columns.forEach(col => {
        const normalized = normalizeColumn(col)
        for (const [field, aliases] of Object.entries(fieldMappings)) {
          if (aliases.some(alias => normalized.includes(alias))) {
            columnMap[field] = col
            break
          }
        }
      })

      // Parse preview rows
      rawData.slice(0, 5).forEach((row: any) => {
        const parseNumber = (str: string): number => {
          if (!str) return 0
          const cleaned = str.toString().replace(/[$€£¥,\s]/g, '')
          const parsed = parseFloat(cleaned)
          return isNaN(parsed) ? 0 : parsed
        }

        previewData.push({
          name: row[columnMap.name]?.toString().trim() || '',
          sku: row[columnMap.sku]?.toString().trim() || '',
          brand: columnMap.brand ? row[columnMap.brand]?.toString().trim() : undefined,
          category: columnMap.category ? row[columnMap.category]?.toString().trim() : undefined,
          price: parseNumber(row[columnMap.price]?.toString() || '0'),
          cost: columnMap.cost ? parseNumber(row[columnMap.cost]?.toString() || '0') : undefined,
          stockQuantity: parseInt(row[columnMap.stockQuantity]?.toString().replace(/[^\d]/g, '') || '0'),
          description: columnMap.description ? row[columnMap.description]?.toString().trim() : undefined,
          image: columnMap.image ? row[columnMap.image]?.toString().trim() : undefined,
        })
      })

      setPreview(previewData)
    } catch (error: any) {
      toast({
        title: "Parse error",
        description: error.message || "Failed to parse file. Please ensure it's a valid Excel or CSV file.",
        variant: "destructive",
      })
      setFile(null)
    }
  }

  const handleImport = async () => {
    if (!file) return

    setUploading(true)
    setImportResults(null)

    try {
      const { getAuthToken } = await import('@/lib/api-client')
      const token = await getAuthToken()
      if (!token) {
        throw new Error("You must be logged in to import products.")
      }

      const formData = new FormData()
      formData.append('file', file)
      if (imagesFolder.trim()) {
        formData.append('imagesFolder', imagesFolder.trim())
      }

      const response = await fetch('/api/products/bulk', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Import failed')
      }

      setImportResults(data)

      const imageUploadInfo = data.imageUploads 
        ? ` ${data.imageUploads.successful} images uploaded.`
        : ""
      
      if (data.failed === 0) {
        toast({
          title: "Import successful",
          description: `Successfully imported ${data.imported} products.${imageUploadInfo}`,
        })
      } else {
        toast({
          title: "Import completed with errors",
          description: `Imported ${data.imported} products. ${data.failed} failed.${imageUploadInfo}`,
          variant: "destructive",
        })
      }

      if (data.imported > 0) {
        onImportComplete()
      }
    } catch (error: any) {
      toast({
        title: "Import failed",
        description: error.message || "Failed to import products. Please try again.",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleDownloadTemplate = () => {
    // Create template data matching the user's format
    const templateData = [
      {
        'SN': '1',
        'Item': 'Example Polo Shirt',
        'Qty': '50',
        'Unit Price': '700',
        'Colours': 'Blue, Red, Black',
        'Sizez': 'L, XL, XXL, XXXL',
        'Image': 'polo-shirt-blue.jpg'
      },
      {
        'SN': '2',
        'Item': 'Example Jeans',
        'Qty': '30',
        'Unit Price': '350',
        'Colours': 'Blue & Black',
        'Sizez': '32, 34, 36, 38, 40, 42'
      },
      {
        'SN': '3',
        'Item': 'Example T-Shirt',
        'Qty': '100',
        'Unit Price': '120',
        'Colours': '',
        'Sizez': 'L, XL, XXL'
      }
    ]

    const ws = XLSX.utils.json_to_sheet(templateData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Products')
    XLSX.writeFile(wb, 'product-import-template.xlsx')

    toast({
      title: "Template downloaded",
      description: "Template file has been downloaded. Fill it with your product data.",
    })
  }

  const handleReset = () => {
    setFile(null)
    setImagesFolder("")
    setPreview([])
    setImportResults(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import Products</DialogTitle>
          <DialogDescription>
            Upload an Excel or CSV file to import multiple products at once. Required columns: Name/Item, Price/Unit Price, Stock/Qty. SKU will be auto-generated if missing. You can specify image filenames in the Image column, and provide a folder path where images are located.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Download Template */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm font-medium">Need a template?</p>
              <p className="text-xs text-muted-foreground">Download our Excel template with example data</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>

          {/* Images Folder Path */}
          <div className="space-y-2">
            <Label htmlFor="images-folder">Images Folder Path (Optional)</Label>
            <div className="flex items-center gap-2">
              <Folder className="h-4 w-4 text-muted-foreground" />
              <Input
                id="images-folder"
                placeholder="e.g., public/uploads/products or /absolute/path/to/images"
                value={imagesFolder}
                onChange={(e) => setImagesFolder(e.target.value)}
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              If your Excel sheet contains image filenames (not URLs), specify the folder path where those images are located. 
              The system will automatically find and upload them to Supabase Storage.
            </p>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label>Upload File</Label>
            {!file ? (
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <div className="space-y-2">
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <Button variant="outline" asChild>
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        Choose File
                      </span>
                    </Button>
                  </Label>
                  <input
                    id="file-upload"
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <p className="text-xs text-muted-foreground">
                    Excel (.xlsx, .xls) or CSV files only
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  Remove
                </Button>
              </div>
            )}
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <div className="space-y-2">
              <Label>Preview (first 5 rows)</Label>
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Name</th>
                        <th className="px-3 py-2 text-left font-medium">SKU</th>
                        <th className="px-3 py-2 text-left font-medium">Price</th>
                        <th className="px-3 py-2 text-left font-medium">Stock</th>
                        <th className="px-3 py-2 text-left font-medium">Brand</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="px-3 py-2">{row.name || <span className="text-muted-foreground">—</span>}</td>
                          <td className="px-3 py-2 font-mono">{row.sku || <span className="text-muted-foreground">—</span>}</td>
                          <td className="px-3 py-2">${row.price.toFixed(2)}</td>
                          <td className="px-3 py-2">{row.stockQuantity}</td>
                          <td className="px-3 py-2">{row.brand || <span className="text-muted-foreground">—</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Import Results */}
          {importResults && (
            <div className="space-y-2">
              <Label>Import Results</Label>
              <Alert variant={importResults.failed === 0 ? "default" : "destructive"}>
                <div className="flex items-start gap-3">
                  {importResults.failed === 0 ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <AlertDescription>
                      <div className="space-y-1">
                        <p>
                          <strong>Total:</strong> {importResults.total} products
                        </p>
                        <p>
                          <strong>Imported:</strong> {importResults.imported} products
                        </p>
                        {importResults.failed > 0 && (
                          <p>
                            <strong>Failed:</strong> {importResults.failed} products
                          </p>
                        )}
                        {importResults.imageUploads && (
                          <>
                            <p>
                              <strong>Images Uploaded:</strong> {importResults.imageUploads.successful} successful
                            </p>
                            {importResults.imageUploads.failed > 0 && (
                              <p className="text-destructive">
                                <strong>Images Failed:</strong> {importResults.imageUploads.failed}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </AlertDescription>
                  </div>
                </div>
              </Alert>

              {importResults.imageUploads && importResults.imageUploads.errors && importResults.imageUploads.errors.length > 0 && (
                <div className="border rounded-lg p-4 max-h-48 overflow-y-auto">
                  <p className="text-sm font-medium mb-2">Image Upload Errors:</p>
                  <ul className="text-xs space-y-1">
                    {importResults.imageUploads.errors.slice(0, 10).map((err: any, idx: number) => (
                      <li key={idx} className="text-destructive">
                        {err.filename}: {err.error}
                      </li>
                    ))}
                    {importResults.imageUploads.errors.length > 10 && (
                      <li className="text-muted-foreground">
                        ... and {importResults.imageUploads.errors.length - 10} more image errors
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {importResults.errors && importResults.errors.length > 0 && (
                <div className="border rounded-lg p-4 max-h-48 overflow-y-auto">
                  <p className="text-sm font-medium mb-2">Errors:</p>
                  <ul className="text-xs space-y-1">
                    {importResults.errors.slice(0, 10).map((err: any, idx: number) => (
                      <li key={idx} className="text-destructive">
                        {err.sku}: {err.error}
                      </li>
                    ))}
                    {importResults.errors.length > 10 && (
                      <li className="text-muted-foreground">
                        ... and {importResults.errors.length - 10} more errors
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
            {importResults ? "Close" : "Cancel"}
          </Button>
          {!importResults && (
            <Button onClick={handleImport} disabled={!file || uploading}>
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import Products
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

