"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Plus, Edit, Trash2, Eye, AlertTriangle } from "lucide-react"
import { useAssets } from "../app/contexts/asset-context"
import { useToast } from "@/hooks/use-toast"
import { AssetPDFExportButton } from "../shared/PDFExportButton"

export default function AssetManagement() {
  const { assets, addAsset, deleteAsset } = useAssets()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newAsset, setNewAsset] = useState({
    name: "",
    type: "",
    location: "",
    manufacturer: "",
    model: "",
    serialNumber: "",
    criticality: "",
  })

  const [viewingAsset, setViewingAsset] = useState(null)
  const [showViewDialog, setShowViewDialog] = useState(false)
  const [editingAsset, setEditingAsset] = useState(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [deletingAsset, setDeletingAsset] = useState(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const filteredAssets = assets.filter(
    (asset) =>
      asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.location.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleAddAsset = () => {
    if (!newAsset.name || !newAsset.type || !newAsset.criticality) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    const asset = {
      ...newAsset,
      installDate: new Date().toISOString().split("T")[0],
      status: "Active",
      lastMaintenance: "-",
      nextMaintenance: "TBD",
    }

    addAsset(asset)

    toast({
      title: "Asset Added Successfully",
      description: `${newAsset.name} has been added to your asset inventory`,
      variant: "default",
    })

    setNewAsset({
      name: "",
      type: "",
      location: "",
      manufacturer: "",
      model: "",
      serialNumber: "",
      criticality: "",
    })
    setIsAddDialogOpen(false)
  }

  const handleViewAsset = (asset) => {
    setViewingAsset(asset)
    setShowViewDialog(true)
  }

  const handleEditAsset = (asset) => {
    setEditingAsset(asset)
    setShowEditDialog(true)
  }

  const handleDeleteAsset = (id, name) => {
    setDeletingAsset({ id, name })
    setShowDeleteDialog(true)
  }

  const confirmDeleteAsset = () => {
    if (deletingAsset) {
      deleteAsset(deletingAsset.id)
      toast({
        title: "Asset Deleted",
        description: `${deletingAsset.name} has been removed from your asset inventory`,
        variant: "default",
      })
      setDeletingAsset(null)
      setShowDeleteDialog(false)
    }
  }

  const getCriticalityColor = (criticality: string) => {
    switch (criticality) {
      case "High":
      case "Critical":
        return "destructive"
      case "Medium":
        return "default"
      case "Low":
        return "secondary"
      default:
        return "outline"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Asset Management</h2>
          <p className="text-muted-foreground">Manage your equipment and assets</p>
        </div>
        <div className="flex items-center space-x-2">
          <AssetPDFExportButton 
            assets={assets}
            variant="outline"
            onExportStart={() => toast({
              title: "Export Started",
              description: "Generating PDF export...",
            })}
            onExportComplete={() => toast({
              title: "Export Complete",
              description: "Assets have been exported to PDF successfully",
            })}
            onExportError={(error) => toast({
              title: "Export Failed",
              description: error.message,
              variant: "destructive",
            })}
          />
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Asset
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Asset</DialogTitle>
              <DialogDescription>Enter the details for the new asset</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Asset Name *</Label>
                <Input
                  id="name"
                  value={newAsset.name}
                  onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                  placeholder="e.g., Pump Unit P-1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Asset Type *</Label>
                <Select value={newAsset.type} onValueChange={(value) => setNewAsset({ ...newAsset, type: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Compressor">Compressor</SelectItem>
                    <SelectItem value="Pump">Pump</SelectItem>
                    <SelectItem value="Motor">Motor</SelectItem>
                    <SelectItem value="Conveyor">Conveyor</SelectItem>
                    <SelectItem value="HVAC">HVAC</SelectItem>
                    <SelectItem value="Generator">Generator</SelectItem>
                    <SelectItem value="Production Equipment">Production Equipment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={newAsset.location}
                  onChange={(e) => setNewAsset({ ...newAsset, location: e.target.value })}
                  placeholder="e.g., Building A - Floor 1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manufacturer">Manufacturer</Label>
                <Input
                  id="manufacturer"
                  value={newAsset.manufacturer}
                  onChange={(e) => setNewAsset({ ...newAsset, manufacturer: e.target.value })}
                  placeholder="e.g., Siemens"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={newAsset.model}
                  onChange={(e) => setNewAsset({ ...newAsset, model: e.target.value })}
                  placeholder="e.g., Model XYZ-123"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serialNumber">Serial Number</Label>
                <Input
                  id="serialNumber"
                  value={newAsset.serialNumber}
                  onChange={(e) => setNewAsset({ ...newAsset, serialNumber: e.target.value })}
                  placeholder="e.g., SN123456789"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="criticality">Criticality Level *</Label>
                <Select
                  value={newAsset.criticality}
                  onValueChange={(value) => setNewAsset({ ...newAsset, criticality: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select criticality" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Critical">Critical</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddAsset}>Add Asset</Button>
            </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Assets Overview</CardTitle>
              <CardDescription>All registered assets in your facility ({assets.length} total)</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search assets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Criticality</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Next Maintenance</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssets.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell className="font-medium">{asset.id}</TableCell>
                  <TableCell>{asset.name}</TableCell>
                  <TableCell>{asset.type}</TableCell>
                  <TableCell>{asset.location}</TableCell>
                  <TableCell>
                    <Badge variant={getCriticalityColor(asset.criticality)}>{asset.criticality}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{asset.status}</Badge>
                  </TableCell>
                  <TableCell>{asset.nextMaintenance}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => handleViewAsset(asset)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEditAsset(asset)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteAsset(asset.id, asset.name)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Asset Dialog */}
      {showViewDialog && viewingAsset && (
        <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Asset Details: {viewingAsset.name}</DialogTitle>
              <DialogDescription>
                ID: {viewingAsset.id} | Type: {viewingAsset.type}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Manufacturer</Label>
                <div className="p-2 border rounded-md">{viewingAsset.manufacturer}</div>
              </div>
              <div className="space-y-2">
                <Label>Model</Label>
                <div className="p-2 border rounded-md">{viewingAsset.model}</div>
              </div>
              <div className="space-y-2">
                <Label>Serial Number</Label>
                <div className="p-2 border rounded-md">{viewingAsset.serialNumber}</div>
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <div className="p-2 border rounded-md">{viewingAsset.location}</div>
              </div>
              <div className="space-y-2">
                <Label>Install Date</Label>
                <div className="p-2 border rounded-md">{viewingAsset.installDate}</div>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <div className="p-2 border rounded-md">
                  <Badge variant="outline">{viewingAsset.status}</Badge>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Criticality</Label>
                <div className="p-2 border rounded-md">
                  <Badge variant={getCriticalityColor(viewingAsset.criticality)}>{viewingAsset.criticality}</Badge>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Operating Hours</Label>
                <div className="p-2 border rounded-md">{viewingAsset.operatingHours?.toLocaleString() || "0"} hrs</div>
              </div>
              <div className="space-y-2">
                <Label>Last Maintenance</Label>
                <div className="p-2 border rounded-md">{viewingAsset.lastMaintenance}</div>
              </div>
              <div className="space-y-2">
                <Label>Next Maintenance</Label>
                <div className="p-2 border rounded-md">{viewingAsset.nextMaintenance}</div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="outline" onClick={() => setShowViewDialog(false)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  setShowViewDialog(false)
                  handleEditAsset(viewingAsset)
                }}
              >
                Edit Asset
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Asset Dialog */}
      {showEditDialog && editingAsset && (
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Asset: {editingAsset.name}</DialogTitle>
              <DialogDescription>Update asset information</DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Asset Name</Label>
                <Input id="edit-name" defaultValue={editingAsset.name} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-type">Asset Type</Label>
                <Select defaultValue={editingAsset.type}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Compressor">Compressor</SelectItem>
                    <SelectItem value="Pump">Pump</SelectItem>
                    <SelectItem value="Motor">Motor</SelectItem>
                    <SelectItem value="Conveyor">Conveyor</SelectItem>
                    <SelectItem value="HVAC">HVAC</SelectItem>
                    <SelectItem value="Generator">Generator</SelectItem>
                    <SelectItem value="Production Equipment">Production Equipment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-location">Location</Label>
                <Input id="edit-location" defaultValue={editingAsset.location} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select defaultValue={editingAsset.status}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                    <SelectItem value="Maintenance">Maintenance</SelectItem>
                    <SelectItem value="Retired">Retired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-criticality">Criticality</Label>
                <Select defaultValue={editingAsset.criticality}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Critical">Critical</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-next-maintenance">Next Maintenance</Label>
                <Input id="edit-next-maintenance" type="date" defaultValue={editingAsset.nextMaintenance} />
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  toast({
                    title: "Asset Updated",
                    description: `${editingAsset.name} has been updated successfully`,
                    variant: "default",
                  })
                  setShowEditDialog(false)
                }}
              >
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && deletingAsset && (
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <span>Confirm Deletion</span>
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete <strong>{deletingAsset.name}</strong>? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 my-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <div className="font-medium text-red-800">This will permanently delete:</div>
                  <ul className="mt-1 text-red-700 space-y-1">
                    <li>• Asset ID: {deletingAsset.id}</li>
                    <li>• All associated maintenance records</li>
                    <li>• All scheduled maintenance tasks</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDeleteAsset}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Asset
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}