import React from 'react';
import { LayoutDashboard, ShoppingBag, Boxes, Clock3 } from 'lucide-react';

interface DashboardSummary {
  productCount: number;
  totalUnits: number;
  orderStatusCounts: Record<string, number>;
}

interface DashboardData {
  summary: DashboardSummary;
}

export default function MiniDashboard({
  dashboard,
}: {
  dashboard: DashboardData | null;
}) {
  if (!dashboard) return null;
  const { summary } = dashboard;
  const orders = summary?.orderStatusCounts?.['COMPLETED'] ?? 0;
  const pendingOrders = summary?.orderStatusCounts?.['PENDING'] ?? 0;

  const cards = [
    { title: 'Products', value: summary?.productCount, icon: <LayoutDashboard className="w-6 h-6" /> },
    { title: 'Units', value: summary?.totalUnits, icon: <Boxes className="w-6 h-6" /> },
    { title: 'Completed Orders', value: orders, icon: <ShoppingBag className="w-6 h-6" /> },
    { title: 'Pending Orders', value: pendingOrders, icon: <Clock3 className="w-6 h-6" /> },
  ];

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Dashboard</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.title} className="bg-white rounded-lg shadow p-4 flex items-center space-x-3">
            <div className="text-indigo-600">{card.icon}</div>
            <div>
              <div className="text-sm text-gray-500">{card.title}</div>
              <div className="text-lg font-medium">{card.value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
