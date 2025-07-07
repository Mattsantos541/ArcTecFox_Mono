"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { TrendingUp, TrendingDown, DollarSign, Clock, Wrench, AlertTriangle, Eye, Edit } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { useState } from "react"

// Mock analytics data
const maintenanceCosts = [
  { month: "Jan", planned: 12000, unplanned: 8000 },
  { month: "Feb", planned: 15000, unplanned: 6000 },
  { month: "Mar", planned: 13000, unplanned: 9000 },
  { month: "Apr", planned: 16000, unplanned: 5000 },
  { month: "May", planned: 14000, unplanned: 7000 },
  { month: "Jun", planned: 17000, unplanned: 4000 },
]

const downtimeData = [
  { month: "Jan", hours: 24 },
  { month: "Feb", hours: 18 },
  { month: "Mar", hours: 32 },
  { month: "Apr", hours: 15 },
  { month: "May", hours: 22 },
  { month: "Jun", hours: 12 },
]

const assetTypeBreakdown = [
  { name: "Production Equipment", value: 30, color: "#3b82f6" },
  { name: "Compressors", value: 25, color: "#10b981" },
  { name: "Pumps", value: 20, color: "#f59e0b" },
  { name: "HVAC", value: 15, color: "#ef4444" },
  { name: "Others", value: 10, color: "#8b5cf6" },
]

const kpiData = [
  {
    title: "MTBF (Mean Time Between Failures)",
    value: "847 hours",
    change: "+12%",
    trend: "up",
    description: "Average time between equipment failures",
  },
  {
    title: "MTTR (Mean Time To Repair)",
    value: "3.2 hours",
    change: "-8%",
    trend: "down",
    description: "Average time to complete repairs",
  },
  {
    title: "Overall Equipment Effectiveness",
    value: "87.5%",
    change: "+5%",
    trend: "up",
    description: "Combined availability, performance, and quality",
  },
  {
    title: "Maintenance Cost Ratio",
    value: "2.8%",
    change: "-0.3%",
    trend: "down",
    description: "Maintenance costs as % of asset value",
  },
]

export default function Analytics() {
  const { toast } = useToast()
  const [viewingAsset, setViewingAsset] = useState(null)
  const [showViewDialog, setShowViewDialog] = useState(false)
  const [editingAsset, setEditingAsset] = useState(null)
  const [showEditDialog, setShowEditDialog] = useState(false)

  const handleViewAssetPerformance = (asset) => {
    setViewingAsset(asset)
    setShowViewDialog(true)
  }

  const handleEditAssetPerformance = (asset) => {
    setEditingAsset(asset)
    setShowEditDialog(true)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Maintenance Analytics</h2>
        <p className="text-muted-foreground">Performance insights and maintenance metrics</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="costs">Cost Analysis</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="predictions">AI Predictions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpiData.map((kpi, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                  {kpi.trend === "up" ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{kpi.value}</div>
                  <div className="flex items-center space-x-2 text-xs">
                    <Badge variant={kpi.trend === "up" ? "default" : "secondary"}>{kpi.change}</Badge>
                    <span className="text-muted-foreground">vs last month</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{kpi.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Maintenance Costs Trend</CardTitle>
                <CardDescription>Planned vs Unplanned maintenance costs</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    planned: { label: "Planned", color: "#3b82f6" },
                    unplanned: { label: "Unplanned", color: "#ef4444" },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={maintenanceCosts}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="planned" fill="var(--color-planned)" />
                      <Bar dataKey="unplanned" fill="var(--color-unplanned)" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Asset Type Distribution</CardTitle>
                <CardDescription>Maintenance workload by asset type</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    value: { label: "Percentage" },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={assetTypeBreakdown}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}%`}
                      >
                        {assetTypeBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Downtime Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Equipment Downtime</CardTitle>
              <CardDescription>Monthly downtime hours across all assets</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  hours: { label: "Downtime Hours", color: "#f59e0b" },
                }}
                className="h-[200px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={downtimeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="hours" stroke="var(--color-hours)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5 text-green-500" />
                  <span>Total Maintenance Cost</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">$127,000</div>
                <p className="text-sm text-muted-foreground">Year to date</p>
                <Progress value={68} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1">68% of annual budget</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost per Asset</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">$814</div>
                <p className="text-sm text-muted-foreground">Average monthly cost</p>
                <Badge variant="outline" className="mt-2">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  -5% vs last month
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Emergency Repairs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">$23,500</div>
                <p className="text-sm text-muted-foreground">Unplanned maintenance</p>
                <Badge variant="destructive" className="mt-2">
                  18% of total costs
                </Badge>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Cost Breakdown by Category</CardTitle>
              <CardDescription>Detailed analysis of maintenance expenses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { category: "Labor", amount: "$45,200", percentage: 36 },
                  { category: "Parts & Materials", amount: "$38,100", percentage: 30 },
                  { category: "Contractor Services", amount: "$25,400", percentage: 20 },
                  { category: "Tools & Equipment", amount: "$12,700", percentage: 10 },
                  { category: "Training", amount: "$5,600", percentage: 4 },
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{item.category}</span>
                        <span className="text-sm font-medium">{item.amount}</span>
                      </div>
                      <Progress value={item.percentage} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  <span>Availability</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">96.2%</div>
                <Progress value={96.2} className="mt-2" />
                <p className="text-sm text-muted-foreground mt-1">Target: 95%</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Wrench className="h-5 w-5 text-green-500" />
                  <span>Reliability</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">94.8%</div>
                <Progress value={94.8} className="mt-2" />
                <p className="text-sm text-muted-foreground mt-1">Target: 92%</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>PM Compliance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">89.3%</div>
                <Progress value={89.3} className="mt-2" />
                <p className="text-sm text-muted-foreground mt-1">Target: 90%</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Work Order Completion</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">92.1%</div>
                <Progress value={92.1} className="mt-2" />
                <p className="text-sm text-muted-foreground mt-1">On-time completion</p>

                <p className="text-sm text-muted-foreground mt-1">On-time completion</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Asset Performance Rankings</CardTitle>
              <CardDescription>Top and bottom performing assets by reliability</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { asset: "CNC Machine M-1", score: 99.2, status: "Excellent" },
                  { asset: "HVAC System C-2", score: 98.5, status: "Excellent" },
                  { asset: "Injection Molding Press P-2", score: 96.8, status: "Good" },
                  { asset: "Generator G-1", score: 96.2, status: "Good" },
                  { asset: "Packaging Line PL-1", score: 94.1, status: "Good" },
                  { asset: "Pump P-4", score: 94.8, status: "Good" },
                  { asset: "Conveyor Belt B-3", score: 87.3, status: "Fair" },
                  { asset: "Compressor Unit A-1", score: 82.1, status: "Needs Attention" },
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{item.asset}</span>
                        <div className="flex items-center space-x-2">
                          <Badge variant={item.score > 95 ? "default" : item.score > 90 ? "secondary" : "destructive"}>
                            {item.status}
                          </Badge>
                          <div className="flex space-x-1">
                            <Button variant="ghost" size="sm" onClick={() => handleViewAssetPerformance(item)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleEditAssetPerformance(item)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Progress value={item.score} className="flex-1" />
                        <span className="text-sm font-medium">{item.score}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                <span>AI Failure Predictions</span>
              </CardTitle>
              <CardDescription>Machine learning predictions for potential equipment failures</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    asset: "CNC Machine M-1",
                    prediction: "Spindle bearing wear detected, replacement needed within 60 days",
                    confidence: 92,
                    risk: "High",
                    recommendation: "Schedule spindle bearing replacement during next planned downtime",
                  },
                  {
                    asset: "Injection Molding Press P-2",
                    prediction: "Hydraulic seal degradation in progress",
                    confidence: 78,
                    risk: "Medium",
                    recommendation: "Monitor hydraulic pressure closely, order replacement seals",
                  },
                  {
                    asset: "Compressor Unit A-1",
                    prediction: "Bearing failure likely within 30 days",
                    confidence: 87,
                    risk: "High",
                    recommendation: "Schedule bearing replacement immediately",
                  },
                  {
                    asset: "Conveyor Belt B-3",
                    prediction: "Belt wear exceeding threshold in 45 days",
                    confidence: 73,
                    risk: "Medium",
                    recommendation: "Order replacement belt, schedule maintenance",
                  },
                  {
                    asset: "Packaging Line PL-1",
                    prediction: "Sensor calibration drift detected",
                    confidence: 65,
                    risk: "Low",
                    recommendation: "Recalibrate sensors during next scheduled maintenance",
                  },
                ].map((prediction, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{prediction.asset}</h4>
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant={
                            prediction.risk === "High"
                              ? "destructive"
                              : prediction.risk === "Medium"
                                ? "default"
                                : "secondary"
                          }
                        >
                          {prediction.risk} Risk
                        </Badge>
                        <Badge variant="outline">{prediction.confidence}% Confidence</Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{prediction.prediction}</p>
                    <div className="bg-blue-50 p-3 rounded-md">
                      <p className="text-sm">
                        <strong>Recommendation:</strong> {prediction.recommendation}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Predictive Accuracy</CardTitle>
                <CardDescription>AI model performance metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Overall Accuracy</span>
                  <span className="font-bold">91.2%</span>
                </div>
                <Progress value={91.2} />

                <div className="flex items-center justify-between">
                  <span>False Positive Rate</span>
                  <span className="font-bold">4.8%</span>
                </div>
                <Progress value={4.8} />

                <div className="flex items-center justify-between">
                  <span>Early Detection Rate</span>
                  <span className="font-bold">87.5%</span>
                </div>
                <Progress value={87.5} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost Savings</CardTitle>
                <CardDescription>Savings from predictive maintenance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">$45,200</div>
                  <p className="text-sm text-muted-foreground">Saved this quarter</p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Prevented Failures</span>
                    <span>$32,100</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Optimized Scheduling</span>
                    <span>$8,900</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Reduced Downtime</span>
                    <span>$4,200</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* View Asset Performance Dialog */}
      {showViewDialog && viewingAsset && (
        <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Asset Performance: {viewingAsset.asset}</DialogTitle>
              <DialogDescription>
                Current Status:{" "}
                <Badge
                  variant={viewingAsset.score > 95 ? "default" : viewingAsset.score > 90 ? "secondary" : "destructive"}
                >
                  {viewingAsset.status}
                </Badge>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Performance Score</Label>
                <div className="flex items-center space-x-2">
                  <Progress value={viewingAsset.score} className="flex-1" />
                  <span className="text-lg font-bold">{viewingAsset.score}%</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Availability</Label>
                  <Progress value={viewingAsset.score - Math.random() * 5} />
                </div>
                <div className="space-y-2">
                  <Label>Reliability</Label>
                  <Progress value={viewingAsset.score - Math.random() * 3} />
                </div>
                <div className="space-y-2">
                  <Label>Maintenance Compliance</Label>
                  <Progress value={viewingAsset.score - Math.random() * 7} />
                </div>
                <div className="space-y-2">
                  <Label>Efficiency</Label>
                  <Progress value={viewingAsset.score - Math.random() * 4} />
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Performance Insights</h4>
                <ul className="space-y-2 text-sm">
                  <li>• Last maintenance: 15 days ago</li>
                  <li>• Average downtime: 2.3 hours/month</li>
                  <li>• Maintenance cost ratio: 1.8% of asset value</li>
                  <li>• Predicted next failure: 87 days</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="outline" onClick={() => setShowViewDialog(false)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  setShowViewDialog(false)
                  handleEditAssetPerformance(viewingAsset)
                }}
              >
                Edit Performance Data
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Asset Performance Dialog */}
      {showEditDialog && editingAsset && (
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Performance Data: {editingAsset.asset}</DialogTitle>
              <DialogDescription>Update performance metrics and status</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-score">Performance Score (%)</Label>
                <Input id="edit-score" type="number" min="0" max="100" defaultValue={editingAsset.score} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select defaultValue={editingAsset.status}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Excellent">Excellent</SelectItem>
                    <SelectItem value="Good">Good</SelectItem>
                    <SelectItem value="Fair">Fair</SelectItem>
                    <SelectItem value="Needs Attention">Needs Attention</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-availability">Availability (%)</Label>
                  <Input
                    id="edit-availability"
                    type="number"
                    min="0"
                    max="100"
                    defaultValue={Math.round(editingAsset.score - Math.random() * 5)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-reliability">Reliability (%)</Label>
                  <Input
                    id="edit-reliability"
                    type="number"
                    min="0"
                    max="100"
                    defaultValue={Math.round(editingAsset.score - Math.random() * 3)}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  toast({
                    title: "Performance Data Updated",
                    description: `Performance metrics for ${editingAsset.asset} have been updated`,
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
    </div>
  )
}