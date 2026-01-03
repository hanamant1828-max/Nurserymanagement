import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart3, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ReportsPage() {
  // Placeholder reports as per requirements
  const reportTypes = [
    { title: "Daily Sowing Report", desc: "Detailed breakdown of seeds sown today lot-wise." },
    { title: "Pending Delivery Report", desc: "List of all orders scheduled for delivery in upcoming days." },
    { title: "Lot-wise Stock Report", desc: "Current inventory status of all active lots." },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold">Reports</h1>
        <p className="text-muted-foreground">Generate and export nursery data.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reportTypes.map((report, idx) => (
          <Card key={idx} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-3 text-primary">
                <BarChart3 className="w-5 h-5" />
              </div>
              <CardTitle>{report.title}</CardTitle>
              <CardDescription>{report.desc}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                <Download className="w-4 h-4 mr-2" /> Download CSV
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="bg-muted/30 border rounded-xl p-8 text-center">
        <p className="text-muted-foreground">More advanced reporting features coming soon...</p>
      </div>
    </div>
  );
}
