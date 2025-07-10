import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function PMPlanner() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* AI Configuration + Manual Entry */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Generate PM Plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Asset Name</Label>
            <Input placeholder="e.g., Compressor Unit A-1" />
          </div>
          <div>
            <Label>Model</Label>
            <Input placeholder="e.g., X123" />
          </div>
          <div>
            <Label>Serial Number</Label>
            <Input placeholder="e.g., SN456789" />
          </div>
          <div>
            <Label>Asset Category</Label>
            <Input placeholder="e.g., HVAC" />
          </div>
          <div>
            <Label>Usage Hours</Label>
            <Input placeholder="e.g., 4500" type="number" />
          </div>
          <div>
            <Label>Environmental Conditions</Label>
            <Input placeholder="e.g., Indoor - Controlled" />
          </div>
          <div>
            <Label>Date of Plan Start</Label>
            <Input placeholder="YYYY-MM-DD" type="date" />
          </div>
          <div>
            <Label>Additional Detail</Label>
            <Textarea placeholder="Provide any other relevant context..." rows={3} />
          </div>

          <Button className="w-full">Generate Plan</Button>
          <Button variant="outline" className="w-full">Bulk Upload</Button>
        </CardContent>
      </Card>

      {/* Plans List */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Plans Created</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Example Plans - Replace with real data */}
              <div className="flex justify-between items-center border p-3 rounded">
                <div>
                  <div className="font-medium">Compressor Unit A-1</div>
                  <div className="text-sm text-muted-foreground">Active · 92% confidence · $2,200 · 5 tasks</div>
                </div>
                <div className="space-x-2">
                  <Button size="sm" variant="ghost">View</Button>
                  <Button size="sm" variant="ghost">Edit</Button>
                  <Button size="sm" variant="ghost">Delete</Button>
                  <Button size="sm" variant="ghost">Export</Button>
                </div>
              </div>

              <div className="flex justify-between items-center border p-3 rounded">
                <div>
                  <div className="font-medium">HVAC System C-2</div>
                  <div className="text-sm text-muted-foreground">Active · 89% confidence · $1,800 · 4 tasks</div>
                </div>
                <div className="space-x-2">
                  <Button size="sm" variant="ghost">View</Button>
                  <Button size="sm" variant="ghost">Edit</Button>
                  <Button size="sm" variant="ghost">Delete</Button>
                  <Button size="sm" variant="ghost">Export</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Plan Preview Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Plan Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">Select a plan to preview its details.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
