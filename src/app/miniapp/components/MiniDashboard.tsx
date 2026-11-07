import React from 'react';
import { LayoutDashboard, BarChart3, ShoppingBag, Boxes } from 'lucide-react';

// Minimal dashboard component showing core analytics
export default function MiniDashboard({dashboard, salesReport}:{dashboard:any, salesReport:any}) {
  if (!dashboard) return null;
  const {summary}=dashboard;
  const revenue = salesReport?.totalRevenue ?? 0;
  const orders = summary?.orderStatusCounts?.['COMPLETED'] ?? 0;

  const cards = [
    {title:'Products', value:summary?.productCount, icon:<LayoutDashboard className="w-6 h-6"/>},
    {title:'Units', value:summary?.totalUnits, icon:<Boxes className="w-6 h-6"/>},
    {title:'Revenue', value:`$${revenue.toFixed(2)}`, icon:<BarChart3 className="w-6 h-6"/>},
    {title:'Orders', value:orders, icon:<ShoppingBag className="w-6 h-6"/>},
  ];

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Dashboard</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c,i)=> (
          <div key={i} className="bg-white rounded-lg shadow p-4 flex items-center space-x-3">
            <div className="text-indigo-600">{c.icon}</div>
            <div>
              <div className="text-sm text-gray-500">{c.title}</div>
              <div className="text-lg font-medium">{c.value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
